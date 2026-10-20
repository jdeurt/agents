import { type ReleaseState, nextVersion, releaseVersions } from "./release-versions.ts";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import type { Registry } from "./types.ts";
import assert from "node:assert/strict";
import path from "node:path";
import { test } from "bun:test";
import { tmpdir } from "node:os";
import { writeFile } from "./io.ts";

const NIGHTLY_CONTENT_CHANGES_ADVANCE_VERSIONS_WHILE_IDENTICAL =
  "nightly content changes advance versions while identical builds retain them";
const AGENTS_VERSIONS = "agents-versions-";
const DIST_CODEX_PLUGINS_EXAMPLE = "dist/codex/plugins/example";
const CODEX_PLUGIN = ".codex-plugin";
const CODEX_PLUGIN_PLUGIN_JSON = ".codex-plugin/plugin.json";

const UPDATED_UPSTREAM = "updated upstream";
const CODEX_EXAMPLE = "codex/example";

const manifest = '{"name":"jdeurt-example","version":"1.0.0"}\n';
const registry: Registry = {
  marketplace: { name: "test", owner: "test", description: "test" },
  plugins: [{ name: "example", version: "1.0.0", description: "test", category: "Development", harnesses: ["codex"] }],
};

async function resetAndRelease(output: string, directory: string, previous: ReleaseState = {}) {
  await writeFile(path.join(directory, CODEX_PLUGIN_PLUGIN_JSON), manifest);

  return releaseVersions(output, registry, previous);
}

async function assertUnchanged(output: string, directory: string, previous: ReleaseState) {
  const unchanged = await resetAndRelease(output, directory, previous);

  assert.deepEqual(unchanged, previous);
}

async function initialState(output: string, directory: string) {
  const first = await resetAndRelease(output, directory);

  await assertUnchanged(output, directory, first);

  return first;
}

async function prepareState(output: string, directory: string) {
  await mkdir(path.join(directory, CODEX_PLUGIN), { recursive: true });

  return initialState(output, directory);
}

async function updateState(output: string, directory: string, previous: ReleaseState) {
  await writeFile(path.join(directory, "skill.md"), UPDATED_UPSTREAM);

  return resetAndRelease(output, directory, previous);
}

test(NIGHTLY_CONTENT_CHANGES_ADVANCE_VERSIONS_WHILE_IDENTICAL, async () => {
  const output = await mkdtemp(path.join(tmpdir(), AGENTS_VERSIONS));

  try {
    const directory = path.join(output, DIST_CODEX_PLUGINS_EXAMPLE);
    const first = await prepareState(output, directory);
    const second = await updateState(output, directory, first);
    const updated = second[CODEX_EXAMPLE];

    assert.ok(updated);
    assert.equal(updated.version, "1.0.1");
    await assertUnchanged(output, directory, second);
    assert.equal(nextVersion("2.0.0", "1.0.1"), "2.0.0");
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});
