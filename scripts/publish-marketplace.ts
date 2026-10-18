import { mkdtemp, realpath, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { readFile, writeFile } from "./io.ts";
import { buildMarketplace } from "./build-marketplace.ts";
import { withResolvedSources } from "./resolve-sources.ts";
import { git } from "./git.ts";
import { releaseVersions } from "./release-versions.ts";
import type { Registry } from "./types.ts";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const BRANCH = "refs/heads/marketplace";

export function publishTree(root: string, output: string, previous: string) {
  git(output, ["init", "--quiet"]);
  git(output, ["add", "--all"]);
  const tree = git(output, ["write-tree"]);
  if (previous && tree === git(root, ["rev-parse", `${previous}^{tree}`])) return false;
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
  return true;
}

export async function publishMarketplace({ root = ROOT, dryRun = false } = {}) {
  if (!dryRun && git(root, ["status", "--porcelain"])) throw new Error("Publish only a clean source checkout");
  const source = git(root, ["rev-parse", "HEAD"]);
  if (!dryRun && source !== git(root, ["ls-remote", "origin", "refs/heads/main"]).split(/\s+/)[0])
    throw new Error("Publish only current origin/main");
  const previous = dryRun ? "" : git(root, ["ls-remote", "origin", BRANCH]).split(/\s+/)[0];
  if (previous) git(root, ["fetch", "--no-tags", "origin", BRANCH]);
  const output = await realpath(await mkdtemp(path.join(tmpdir(), "agents-publish-")));
  try {
    await withResolvedSources(root, async (resolved) => {
      await buildMarketplace({ root: resolved, output, resolved: true });
      await buildMarketplace({
        root: resolved,
        output,
        resolved: true,
        check: true,
      });
    });
    const registry = Bun.TOML.parse(await readFile(path.join(root, "marketplace.toml"), "utf8")) as unknown as Registry;
    const hasState = previous && git(root, ["ls-tree", "--name-only", previous, ".publication.json"]);
    const state = hasState ? JSON.parse(git(root, ["show", `${previous}:.publication.json`])) : {};
    await releaseVersions(output, registry, state);
    await writeFile(path.join(output, "README.md"), await readFile(path.join(root, "README.md")));
    if (dryRun) {
      console.log("Validated marketplace snapshot; no Git refs changed.");
      return;
    }
    if (source !== git(root, ["ls-remote", "origin", "refs/heads/main"]).split(/\s+/)[0])
      throw new Error("Source changed during build; rerun publication");
    console.log(publishTree(root, output, previous) ? "Published marketplace." : "Marketplace unchanged.");
  } finally {
    await rm(output, { recursive: true, force: true });
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.slice(2).some((arg) => arg !== "--dry-run"))
    throw new Error("Usage: publish-marketplace.ts [--dry-run]");
  await publishMarketplace({ dryRun: process.argv.includes("--dry-run") });
}
