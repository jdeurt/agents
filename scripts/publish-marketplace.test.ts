import { mkdir, mkdtemp, rm } from "node:fs/promises";
import assert from "node:assert/strict";
import { didPublishTree } from "./publish-marketplace.ts";
import { git } from "./git.ts";
import path from "node:path";
import { test } from "bun:test";
import { tmpdir } from "node:os";
import { writeFile } from "./io.ts";

const PUBLISHES_ISOLATED_SNAPSHOTS_SKIPS_UNCHANGED_TREES_AND =
  "publishes isolated snapshots, skips unchanged trees, and rejects stale leases";
const AGENTS_PUBLISH_TEST = "agents-publish-test-";

const REFS_HEADS_MARKETPLACE = "refs/heads/marketplace";

const STALE_WRITER = "stale writer";

test(PUBLISHES_ISOLATED_SNAPSHOTS_SKIPS_UNCHANGED_TREES_AND, async () => {
  const directory = await mkdtemp(path.join(tmpdir(), AGENTS_PUBLISH_TEST));

  async function verifySecondSnapshot(source: string, output: string, first: string) {
    const second = git(source, ["ls-remote", "origin", REFS_HEADS_MARKETPLACE]).split(/\s+/, 1)[0];

    assert.equal(git(source, ["rev-list", "--count", second]), "1");
    await writeFile(path.join(output, "README.md"), STALE_WRITER);
    assert.throws(() => didPublishTree(source, output, first), /stale info|rejected/);
  }

  async function verifyFirstSnapshot(source: string, output: string) {
    const first = git(source, ["ls-remote", "origin", REFS_HEADS_MARKETPLACE]).split(/\s+/, 1)[0];

    assert.equal(git(source, ["rev-list", "--count", first]), "1");
    assert.equal(didPublishTree(source, output, first), false);
    await writeFile(path.join(output, "README.md"), "updated");
    assert.equal(didPublishTree(source, output, first), true);
    await verifySecondSnapshot(source, output, first);
  }

  async function verifyPublication() {
    const remote = path.join(directory, "remote.git");
    const source = path.join(directory, "source");
    const output = path.join(directory, "output");

    for (const p of [remote, source, output]) {
      await mkdir(p);
    }

    git(remote, ["init", "--bare", "--quiet"]);
    git(source, ["init", "--quiet"]);
    git(source, ["remote", "add", "origin", remote]);
    await writeFile(path.join(output, "README.md"), "snapshot");
    assert.equal(didPublishTree(source, output, ""), true);
    await verifyFirstSnapshot(source, output);
  }

  try {
    await verifyPublication();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
