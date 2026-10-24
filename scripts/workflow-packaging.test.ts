import assert from "node:assert/strict";
import type { Plugin } from "./types.ts";
import { SIMPLE_GRAPH, entry, withExampleWorkflow, withWorkflowFixture } from "./workflow-test-support.ts";
import { loadWorkflow } from "../plugins/meta/skills/graph-workflows/scripts/load.ts";
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
  "packages only graph-workflows and its non-installable examples for both clients",
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
        const skillEntries = files
          .keys()
          .filter((filename) => filename.startsWith(`${base}/`) && filename.endsWith("/SKILL.md"))
          .toArray();

        expect(skillEntries.toSorted((left, right) => left.localeCompare(right))).toEqual([
          `${base}/graph-workflows/SKILL.md`,
          `${base}/importing/SKILL.md`,
          `${base}/publishing/SKILL.md`,
          `${base}/skill-authoring/SKILL.md`,
          `${base}/soubi/SKILL.md`,
        ]);
        expect(files.has(`${base}/graph-workflows/scripts/workflow.ts`)).toBe(true);
        expect(files.has(`${base}/graph-workflows/references/examples/change-brief/WORKFLOW.md`)).toBe(true);
        expect(files.has(`${base}/graph-workflows/references/examples/evidence-review/WORKFLOW.md`)).toBe(true);
        await withExampleWorkflow(
          async (filename, root) => {
            const workflow = await loadWorkflow(filename, root);

            expect(workflow.calls.get("review")?.documents.has("_stop")).toBe(true);
          },
          path.join(staging, base, "graph-workflows/references/examples")
        );
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
