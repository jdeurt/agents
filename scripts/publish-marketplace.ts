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
const TEXT = "../";
const INIT = "init";
const QUIET = "--quiet";
const ADD = "add";
const ALL = "--all";
const WRITE_TREE = "write-tree";
const REV_PARSE = "rev-parse";
const TREE = "^{tree}";
const USER_NAME_GITHUB_ACTIONS_BOT = "user.name=github-actions[bot]";
const USER_EMAIL_41898282_GITHUB_ACTIONS_BOT_USERS = "user.email=41898282+github-actions[bot]@users.noreply.github.com";
const COMMIT_TREE = "commit-tree";
const PUBLISH_MARKETPLACE = "Publish marketplace";
const FETCH = "fetch";
const NO_TAGS = "--no-tags";
const PUSH = "push";
const ORIGIN = "origin";
const STATUS = "status";
const PORCELAIN = "--porcelain";
const PUBLISH_ONLY_A_CLEAN_SOURCE_CHECKOUT = "Publish only a clean source checkout";
const HEAD_2 = "HEAD";
const LS_REMOTE = "ls-remote";
const REFS_HEADS_MAIN = "refs/heads/main";
const PUBLISH_ONLY_CURRENT_ORIGIN_MAIN = "Publish only current origin/main";
const AGENTS_PUBLISH = "agents-publish-";
const MARKETPLACE_TOML = "marketplace.toml";
const UTF8 = "utf8";
const LS_TREE = "ls-tree";
const NAME_ONLY = "--name-only";
const PUBLICATION_JSON = ".publication.json";
const SHOW = "show";
const README_MD = "README.md";
const VALIDATED_MARKETPLACE_SNAPSHOT_NO_GIT_REFS_CHANGED = "Validated marketplace snapshot; no Git refs changed.";
const SOURCE_CHANGED_DURING_BUILD_RERUN_PUBLICATION = "Source changed during build; rerun publication";
const PUBLISHED_MARKETPLACE = "Published marketplace.";
const MARKETPLACE_UNCHANGED = "Marketplace unchanged.";
const DRY_RUN = "--dry-run";
const USAGE_PUBLISH_MARKETPLACE_TS_DRY_RUN = "Usage: publish-marketplace.ts [--dry-run]";

const ROOT = fileURLToPath(new URL(TEXT, import.meta.url));
const BRANCH = "refs/heads/marketplace";

function prepareTree(output: string): string {
  git(output, [INIT, QUIET]);
  git(output, [ADD, ALL]);

  return git(output, [WRITE_TREE]);
}

function pushTree(root: string, output: string, previous: string, tree: string) {
  // No parent: distribution snapshots cannot accidentally merge source history.
  const commit = git(output, [
    "-c",
    USER_NAME_GITHUB_ACTIONS_BOT,
    "-c",
    USER_EMAIL_41898282_GITHUB_ACTIONS_BOT_USERS,
    COMMIT_TREE,
    tree,
    "-m",
    PUBLISH_MARKETPLACE,
  ]);
  const lease = `--force-with-lease=${BRANCH}:${previous}`;
  const destination = `${commit}:${BRANCH}`;
  git(root, [FETCH, NO_TAGS, output, commit]);
  git(root, [PUSH, lease, ORIGIN, destination]);
}

export function didPublishTree(root: string, output: string, previous: string) {
  const tree = prepareTree(output);

  if (previous && tree === git(root, [REV_PARSE, previous + TREE])) {
    return false;
  }

  pushTree(root, output, previous, tree);

  return true;
}

function validateSourceRevision(root: string, isDryRun: boolean): string {
  const source = git(root, [REV_PARSE, HEAD_2]);

  if (!isDryRun && source !== git(root, [LS_REMOTE, ORIGIN, REFS_HEADS_MAIN]).split(/\s+/, 1)[0]) {
    throw new Error(PUBLISH_ONLY_CURRENT_ORIGIN_MAIN);
  }

  return source;
}

function validatedSource(root: string, isDryRun: boolean): string {
  if (!isDryRun && git(root, [STATUS, PORCELAIN])) {
    throw new Error(PUBLISH_ONLY_A_CLEAN_SOURCE_CHECKOUT);
  }

  return validateSourceRevision(root, isDryRun);
}

function previousPublication(root: string, isDryRun: boolean): string {
  const previous = isDryRun ? "" : git(root, [LS_REMOTE, ORIGIN, BRANCH]).split(/\s+/, 1)[0];

  if (previous) {
    git(root, [FETCH, NO_TAGS, ORIGIN, BRANCH]);
  }

  return previous;
}

export async function publishMarketplace({ root = ROOT, dryRun = false } = {}) {
  const source = validatedSource(root, dryRun);
  const previous = previousPublication(root, dryRun);
  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), AGENTS_PUBLISH));
  const output = await realpath(temporaryDirectory);

  async function finishPublication() {
    const stateReference = `${previous}:${PUBLICATION_JSON}`;
    const registryText = await readFile(path.join(root, MARKETPLACE_TOML), UTF8);
    const registry = parseRegistry(Bun.TOML.parse(registryText));
    const hasState = Boolean(previous && git(root, [LS_TREE, NAME_ONLY, previous, PUBLICATION_JSON]));
    const state = hasState ? releaseStateSchema.parse(JSON.parse(git(root, [SHOW, stateReference]))) : {};
    await releaseVersions(output, registry, state);
    await writeFile(path.join(output, README_MD), await readFile(path.join(root, README_MD)));

    if (dryRun) {
      console.log(VALIDATED_MARKETPLACE_SNAPSHOT_NO_GIT_REFS_CHANGED);

      return;
    }

    if (source !== git(root, [LS_REMOTE, ORIGIN, REFS_HEADS_MAIN]).split(/\s+/, 1)[0]) {
      throw new Error(SOURCE_CHANGED_DURING_BUILD_RERUN_PUBLICATION);
    }

    console.log(didPublishTree(root, output, previous) ? PUBLISHED_MARKETPLACE : MARKETPLACE_UNCHANGED);
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
  if (process.argv.slice(2).some((arg) => arg !== DRY_RUN)) {
    throw new Error(USAGE_PUBLISH_MARKETPLACE_TS_DRY_RUN);
  }

  await publishMarketplace({ dryRun: process.argv.includes(DRY_RUN) });
}
