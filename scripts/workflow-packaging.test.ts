import assert from "node:assert/strict";
import type { Plugin } from "./types.ts";
import { SIMPLE_GRAPH, entry, withWorkflowFixture } from "./workflow-test-support.ts";
import { loadWorkflow } from "../plugins/meta/skills/workflow-execution/scripts/load.ts";
import { expect, test } from "bun:test";
import { TOML } from "bun";
import { compilePlugin } from "./compile-plugin.ts";
import { fileURLToPath } from "node:url";
import { parseRegistry } from "./validation.ts";
import path from "node:path";

const SOURCE_ROOT = path.resolve(fileURLToPath(new URL("../", import.meta.url)));

const BUILD_TIMEOUT_MS = 30_000;

/**
Check that an unmarked skill remains compatible with ordinary packaging.
@param root - Fixture source and staging directory.
@param plugin - Fixture plugin metadata.
*/
async function assertOrdinaryCompile(root: string, plugin: Plugin) {
  const files = await compilePlugin(root, plugin, "fixture", root);

  expect(files.has("dist/codex/plugins/sample/skills/sample/SKILL.md")).toBe(true);
}

test(
  "packages workflow tooling and sibling dependencies for both clients",
  async () =>
    withWorkflowFixture(async (staging) => {
      const registryText = await Bun.file(path.join(SOURCE_ROOT, "marketplace.toml")).text();
      const registry = parseRegistry(TOML.parse(registryText));
      const plugin = registry.plugins.find((candidate) => candidate.name === "meta");
      const files = plugin && (await compilePlugin(SOURCE_ROOT, plugin, registry.marketplace.owner, staging));

      if (!files) {
        throw new Error("Missing meta plugin in fixture registry.");
      }

      for (const [filename, file] of files) {
        await Bun.write(path.join(staging, filename), file.contents);
      }

      for (const client of ["claude", "codex"]) {
        const base = `dist/${client}/plugins/meta/skills`;
        const compiledEntry = files.get(`${base}/change-brief/SKILL.md`)?.contents.toString();
        const loaded = await loadWorkflow(path.join(staging, base, "change-brief/SKILL.md"), path.join(staging, base));

        expect(loaded.calls.get("review")?.documents.has("_stop")).toBe(true);
        expect(compiledEntry).toContain("workflow: mermaid-v1");
        expect(compiledEntry).toContain('review["jdeurt-meta:evidence-review"]');
        expect(files.has(`${base}/evidence-review/steps/check.md`)).toBe(true);
        expect(files.has(`${base}/workflow-execution/scripts/workflow.ts`)).toBe(true);
        expect(files.has(`${base}/workflow-execution/scripts/graph.ts`)).toBe(true);
        expect(files.has(`${base}/change-brief/templates/result.md`)).toBe(true);
      }
    }),
  BUILD_TIMEOUT_MS
);

test("marketplace rejects broken marked graphs and preserves ordinary skill behavior", async () =>
  withWorkflowFixture(async (root) => {
    const plugin: Plugin = {
      name: "sample",
      version: "1.0.0",
      description: "A fixture plugin.",
      category: "Development",
      harnesses: ["claude", "codex"],
    };
    const filename = path.join(root, "plugins/sample/skills/sample/SKILL.md");
    const broken = entry(SIMPLE_GRAPH.replace("_start --> _stop", "_start --> missing"));

    await Bun.write(filename, broken);
    await assert.rejects(compilePlugin(root, plugin, "fixture", root), /Invalid edge/);
    await Bun.write(filename, broken.replace("metadata:\n  workflow: mermaid-v1\n", ""));
    await assertOrdinaryCompile(root, plugin);
  }));
