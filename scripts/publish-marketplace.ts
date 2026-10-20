import { mkdtemp, realpath, rm } from "node:fs/promises";
import { readFile, writeFile } from "./io.ts";
import { releaseStateSchema, releaseVersions } from "./release-versions.ts";
import { buildMarketplace } from "./build-marketplace.ts";
import { fileURLToPath } from "node:url";
import { git } from "./git.ts";
import { parseRegistry } from "./validation.ts";
import path from "node:path";
import { tmpdir } from "node:os";
import { withResolvedSources } from "./resolve-sources.ts";

const REFS_HEADS_MAIN = "refs/heads/main";

const PUBLICATION_JSON = ".publication.json";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const BRANCH = "refs/heads/marketplace";

/**
Stage generated output in a temporary Git repository.
@param output - Generated snapshot directory to stage.
@returns The Git tree identifier for the staged snapshot.
*/
function prepareTree(output: string): string {
  git(output, ["init", "--quiet"]);
  git(output, ["add", "--all"]);

  return git(output, ["write-tree"]);
}

/**
Publish a parentless snapshot with a lease on the prior revision.
@param root - Source checkout whose origin receives the snapshot.
@param output - Temporary Git repository containing the generated tree.
@param previous - Expected prior publication revision, or an empty string.
@param tree - Generated tree identifier to publish.
*/
function pushTree(root: string, output: string, previous: string, tree: string) {
  // No parent: distribution snapshots cannot accidentally merge source history.
  const commit = git(output, [
    "-c",
    "user.name=github-actions[bot]",
    "-c",
    "user.email=41898282+github-actions[bot]@users.noreply.github.com",
    "commit-tree",
    tree,
    "-m",
    "Publish marketplace",
  ]);

  git(root, ["fetch", "--no-tags", output, commit]);
  git(root, ["push", `--force-with-lease=${BRANCH}:${previous}`, "origin", `${commit}:${BRANCH}`]);
}

/**
Publish a generated tree when it differs from the previous snapshot.
@param root - Source checkout connected to the publication remote.
@param output - Generated snapshot directory to stage.
@param previous - Expected prior publication revision, or an empty string.
@returns True when this call pushes a new snapshot, otherwise false.
*/
export function didPublishTree(root: string, output: string, previous: string) {
  const tree = prepareTree(output);

  if (previous && tree === git(root, ["rev-parse", previous + "^{tree}"])) {
    return false;
  }

  pushTree(root, output, previous, tree);

  return true;
}

/**
Require the current remote source revision outside dry runs.
@param root - Source checkout to compare with origin/main.
@param isDryRun - Whether to skip validation against the remote revision.
@returns The current source commit identifier.
*/
function validateSourceRevision(root: string, isDryRun: boolean): string {
  const source = git(root, ["rev-parse", "HEAD"]);

  if (!isDryRun && source !== git(root, ["ls-remote", "origin", REFS_HEADS_MAIN]).split(/\s+/, 1)[0]) {
    throw new Error("Publish only current origin/main");
  }

  return source;
}

/**
Require a clean publication checkout and validate its revision.
@param root - Source checkout prepared for publication.
@param isDryRun - Whether to skip clean-checkout and remote requirements.
@returns The validated source commit identifier.
*/
function validatedSource(root: string, isDryRun: boolean): string {
  if (!isDryRun && git(root, ["status", "--porcelain"])) {
    throw new Error("Publish only a clean source checkout");
  }

  return validateSourceRevision(root, isDryRun);
}

/**
Find and fetch the existing distribution revision.
@param root - Source checkout connected to the publication remote.
@param isDryRun - Whether to ignore the existing remote snapshot.
@returns The prior publication commit, or an empty string when absent or skipped.
*/
function previousPublication(root: string, isDryRun: boolean): string {
  const previous = isDryRun ? "" : (git(root, ["ls-remote", "origin", BRANCH]).split(/\s+/, 1)[0] ?? "");

  if (previous) {
    git(root, ["fetch", "--no-tags", "origin", BRANCH]);
  }

  return previous;
}

/**
Build, verify, version, and publish a generated marketplace snapshot.
@param options - Source checkout and dry-run setting that controls remote writes.
*/
export async function publishMarketplace({ root = ROOT, dryRun = false } = {}) {
  const source = validatedSource(root, dryRun);
  const previous = previousPublication(root, dryRun);
  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), "agents-publish-"));
  const output = await realpath(temporaryDirectory);

  async function finishPublication() {
    const registryText = await readFile(path.join(root, "marketplace.toml"), "utf8");
    const registry = parseRegistry(Bun.TOML.parse(registryText));
    const hasState = Boolean(previous && git(root, ["ls-tree", "--name-only", previous, PUBLICATION_JSON]));
    const state = hasState
      ? releaseStateSchema.parse(JSON.parse(git(root, ["show", `${previous}:${PUBLICATION_JSON}`])))
      : {};

    await releaseVersions(output, registry, state);
    await writeFile(path.join(output, "README.md"), await readFile(path.join(root, "README.md")));

    if (dryRun) {
      console.log("Validated marketplace snapshot; no Git refs changed.");

      return;
    }

    if (source !== git(root, ["ls-remote", "origin", REFS_HEADS_MAIN]).split(/\s+/, 1)[0]) {
      throw new Error("Source changed during build; rerun publication");
    }

    console.log(didPublishTree(root, output, previous) ? "Published marketplace." : "Marketplace unchanged.");
  }

  async function prepareAndPublish() {
    await withResolvedSources(root, async (resolved) => {
      await buildMarketplace({ root: resolved, output, resolved: true });
      await buildMarketplace({
        root: resolved,
        output,
        resolved: true,
        check: true,
      });
    });
    await finishPublication();
  }

  try {
    await prepareAndPublish();
  } finally {
    await rm(output, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.slice(2).some((arg) => arg !== "--dry-run")) {
    throw new Error("Usage: publish-marketplace.ts [--dry-run]");
  }

  await publishMarketplace({ dryRun: process.argv.includes("--dry-run") });
}
