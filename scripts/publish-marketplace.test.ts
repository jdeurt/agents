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
const REMOTE_GIT = "remote.git";
const SOURCE = "source";
const OUTPUT = "output";
const INIT = "init";
const BARE = "--bare";
const QUIET = "--quiet";
const REMOTE = "remote";
const ADD = "add";
const ORIGIN = "origin";
const README_MD = "README.md";
const SNAPSHOT = "snapshot";
const LS_REMOTE = "ls-remote";
const REFS_HEADS_MARKETPLACE = "refs/heads/marketplace";
const REV_LIST = "rev-list";
const COUNT = "--count";
const UPDATED = "updated";
const STALE_WRITER = "stale writer";

test(PUBLISHES_ISOLATED_SNAPSHOTS_SKIPS_UNCHANGED_TREES_AND, async () => {
  const directory = await mkdtemp(path.join(tmpdir(), AGENTS_PUBLISH_TEST));

  async function verifySecondSnapshot(source: string, output: string, first: string) {
    const second = git(source, [LS_REMOTE, ORIGIN, REFS_HEADS_MARKETPLACE]).split(/\s+/, 1)[0];
    assert.equal(git(source, [REV_LIST, COUNT, second]), "1");
    await writeFile(path.join(output, README_MD), STALE_WRITER);
    assert.throws(() => didPublishTree(source, output, first), /stale info|rejected/);
  }

  async function verifyFirstSnapshot(source: string, output: string) {
    const first = git(source, [LS_REMOTE, ORIGIN, REFS_HEADS_MARKETPLACE]).split(/\s+/, 1)[0];
    assert.equal(git(source, [REV_LIST, COUNT, first]), "1");
    assert.equal(didPublishTree(source, output, first), false);
    await writeFile(path.join(output, README_MD), UPDATED);
    assert.equal(didPublishTree(source, output, first), true);
    await verifySecondSnapshot(source, output, first);
  }

  async function verifyPublication() {
    const remote = path.join(directory, REMOTE_GIT);
    const source = path.join(directory, SOURCE);
    const output = path.join(directory, OUTPUT);

    for (const p of [remote, source, output]) {
      await mkdir(p);
    }

    git(remote, [INIT, BARE, QUIET]);
    git(source, [INIT, QUIET]);
    git(source, [REMOTE, ADD, ORIGIN, remote]);
    await writeFile(path.join(output, README_MD), SNAPSHOT);
    assert.equal(didPublishTree(source, output, ""), true);
    await verifyFirstSnapshot(source, output);
  }

  try {
    await verifyPublication();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
