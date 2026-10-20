import { mkdir, mkdtemp, rm } from "node:fs/promises";
import assert from "node:assert/strict";
import { didPublishTree } from "./publish-marketplace.ts";
import { git } from "./git.ts";
import path from "node:path";
import { test } from "bun:test";
import { tmpdir } from "node:os";
import { writeFile } from "./io.ts";

test("publishes isolated snapshots, skips unchanged trees, and rejects stale leases", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "agents-publish-test-"));

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
    const first = git(source, ["ls-remote", "origin", "refs/heads/marketplace"]).split(/\s+/, 1)[0];
    assert.equal(git(source, ["rev-list", "--count", first]), "1");
    assert.equal(didPublishTree(source, output, first), false);
    await writeFile(path.join(output, "README.md"), "updated");
    assert.equal(didPublishTree(source, output, first), true);
    const second = git(source, ["ls-remote", "origin", "refs/heads/marketplace"]).split(/\s+/, 1)[0];
    assert.equal(git(source, ["rev-list", "--count", second]), "1");
    await writeFile(path.join(output, "README.md"), "stale writer");
    assert.throws(() => didPublishTree(source, output, first), /stale info|rejected/);
  }

  try {
    await verifyPublication();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
