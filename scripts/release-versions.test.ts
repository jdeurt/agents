import { test } from "bun:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { releaseVersions, nextVersion } from "./release-versions.ts";
import { writeFile } from "./io.ts";
import type { Registry } from "./types.ts";

test("nightly content changes advance versions while identical builds retain them", async () => {
  const output = await mkdtemp(path.join(tmpdir(), "agents-versions-"));
  try {
    const directory = path.join(output, "dist/codex/plugins/example");
    await mkdir(path.join(directory, ".codex-plugin"), { recursive: true });
    const manifest = '{"name":"jdeurt-example","version":"1.0.0"}\n';
    const reset = () => writeFile(path.join(directory, ".codex-plugin/plugin.json"), manifest);
    const registry: Registry = {
      marketplace: { name: "test", owner: "test", description: "test" },
      plugins: [
        { name: "example", version: "1.0.0", description: "test", category: "Development", harnesses: ["codex"] },
      ],
    };
    await reset();
    const first = await releaseVersions(output, registry);
    await reset();
    assert.deepEqual(await releaseVersions(output, registry, first), first);
    await reset();
    await writeFile(path.join(directory, "skill.md"), "updated upstream");
    const second = await releaseVersions(output, registry, first);
    const updated = second["codex/example"];
    assert.ok(updated);
    assert.equal(updated.version, "1.0.1");
    await reset();
    assert.deepEqual(await releaseVersions(output, registry, second), second);
    assert.equal(nextVersion("2.0.0", "1.0.1"), "2.0.0");
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});
