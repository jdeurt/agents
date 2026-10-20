import { type ReleaseState, nextVersion, releaseVersions } from "./release-versions.ts";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import type { Registry } from "./types.ts";
import assert from "node:assert/strict";
import path from "node:path";
import { test } from "bun:test";
import { tmpdir } from "node:os";
import { writeFile } from "./io.ts";

const manifest = '{"name":"jdeurt-example","version":"1.0.0"}\n';
const registry: Registry = {
  marketplace: { name: "test", owner: "test", description: "test" },
  plugins: [{ name: "example", version: "1.0.0", description: "test", category: "Development", harnesses: ["codex"] }],
};

/**
Restore the fixture manifest and compute its publication state.
@param output - Generated marketplace root containing the fixture plugin.
@param directory - Fixture plugin directory whose manifest is reset.
@param previous - Prior publication state used for version selection.
@returns The computed publication state for the fixture content.
*/
async function resetAndRelease(output: string, directory: string, previous: ReleaseState = {}) {
  await writeFile(path.join(directory, ".codex-plugin/plugin.json"), manifest);

  return releaseVersions(output, registry, previous);
}

/**
Check that identical fixture content retains publication state.
@param output - Generated marketplace root containing the fixture plugin.
@param directory - Fixture plugin directory whose manifest is reset.
@param previous - Publication state expected to remain unchanged.
*/
async function assertUnchanged(output: string, directory: string, previous: ReleaseState) {
  const unchanged = await resetAndRelease(output, directory, previous);

  assert.deepEqual(unchanged, previous);
}

/**
Compute initial publication state and check an identical rebuild.
@param output - Generated marketplace root containing the fixture plugin.
@param directory - Fixture plugin directory whose manifest is reset.
@returns The initial publication state for the fixture plugin.
*/
async function initialState(output: string, directory: string) {
  const first = await resetAndRelease(output, directory);

  await assertUnchanged(output, directory, first);

  return first;
}

/**
Create the fixture manifest directory and compute initial publication state.
@param output - Generated marketplace root containing the fixture plugin.
@param directory - Fixture plugin directory to prepare.
@returns The initial publication state for the prepared fixture.
*/
async function prepareState(output: string, directory: string) {
  await mkdir(path.join(directory, ".codex-plugin"), { recursive: true });

  return initialState(output, directory);
}

/**
Change fixture content and compute its next publication state.
@param output - Generated marketplace root containing the fixture plugin.
@param directory - Fixture plugin directory receiving changed content.
@param previous - Prior publication state used for version selection.
@returns The publication state after the fixture content changes.
*/
async function updateState(output: string, directory: string, previous: ReleaseState) {
  await writeFile(path.join(directory, "skill.md"), "updated upstream");

  return resetAndRelease(output, directory, previous);
}

test("nightly content changes advance versions while identical builds retain them", async () => {
  const output = await mkdtemp(path.join(tmpdir(), "agents-versions-"));

  try {
    const directory = path.join(output, "dist/codex/plugins/example");
    const first = await prepareState(output, directory);
    const second = await updateState(output, directory, first);
    const updated = second["codex/example"];

    assert.ok(updated);
    assert.equal(updated.version, "1.0.1");
    await assertUnchanged(output, directory, second);
    assert.equal(nextVersion("2.0.0", "1.0.1"), "2.0.0");
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});
