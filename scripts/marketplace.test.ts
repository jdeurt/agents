import * as z from "zod/mini";
import { digest, inside, syncImports } from "./sync-imports.ts";
import { mkdir, mkdtemp, rm, symlink } from "node:fs/promises";
import { readFile, writeFile } from "./io.ts";
import assert from "node:assert/strict";
import { buildMarketplace } from "./build-marketplace.ts";
import path from "node:path";
import { test } from "bun:test";

const INTEGRATION_TIMEOUT_MS = 30_000;
import { tmpdir } from "node:os";
import { validateSkillFrontmatter } from "./file-validation.ts";
import { withImportFixture } from "./import-fixture.ts";

const portablePluginSchema = z.object({
  name: z.string(),
  source: z.object({ source: z.string(), path: z.string() }),
});
const portableMarketplaceSchema = z.object({ plugins: z.array(portablePluginSchema) });
const namedPluginSchema = z.object({ name: z.string() });
const namedMarketplaceSchema = z.object({ plugins: z.array(namedPluginSchema) });
const dependenciesSchema = z.record(z.string(), z.string());
const hookDependenciesSchema = z.object({ dependencies: dependenciesSchema });
const mobbinMcpSchema = z.object({ mobbin: z.object({ url: z.string() }) });
const bunMcpSchema = z.object({ bun: z.object({ url: z.string() }) });
const claudeMcpSchema = z.object({ mcpServers: bunMcpSchema });
const configHeader =
  "// AGENTS: Do not modify this file unless the user explicitly authorizes the change and specifies which rules to add,\n" +
  "// remove, or modify. Do not weaken rules to make checks pass.\n";

async function assertImportedJscpdSkills(output: string) {
  for (const name of ["jscpd", "dry-refactoring", "codebase-refactoring", "compare-codebases", "code-migration"]) {
    for (const host of ["codex", "claude"]) {
      await readFile(path.join(output, `dist/${host}/plugins/engineering/skills/${name}/SKILL.md`));
    }
  }
}

async function assertCodeReviewSkill(output: string) {
  for (const host of ["codex", "claude"]) {
    const base = path.join(output, `dist/${host}/plugins/engineering`);
    await readFile(path.join(base, "skills/code-review/SKILL.md"));
    await readFile(path.join(base, "skills/code-review/references/jscpd.md"));
  }
}

test(
  "packages both harnesses, retains portable skills and imports, and detects tampering",
  async () =>
    withImportFixture(async () => {
      const output = await mkdtemp(path.join(tmpdir(), "agents-test-"));

      async function assertMarketplaceBuild() {
        await syncImports({ check: true });
        await buildMarketplace({ output });
        const json = async <T>(name: string, schema: z.ZodMiniType<T>): Promise<T> => {
          const contents = await readFile(path.join(output, name), "utf8");

          return schema.parse(JSON.parse(contents));
        };
        const skillFiles = new Bun.Glob("dist/*/plugins/*/skills/*/SKILL.md").scan(output);

        for await (const file of skillFiles) {
          await validateSkillFrontmatter(path.join(output, file), {
            harness: z.enum(["claude", "codex"]).parse(file.split("/", 2)[1]),
          });
        }

        const codex = await json(".agents/plugins/marketplace.json", portableMarketplaceSchema);
        assert.deepEqual(
          codex.plugins.map((p) => p.name),
          ["jdeurt-design", "jdeurt-engineering", "jdeurt-writing", "jdeurt-meta", "jdeurt-cloudflare"]
        );
        assert.ok(
          codex.plugins.every((p) => p.source.source === "local" && p.source.path.startsWith("./dist/codex/plugins/"))
        );
        const resolvedValue1 = await json(".claude-plugin/marketplace.json", namedMarketplaceSchema);
        assert.deepEqual(
          resolvedValue1.plugins.map((p) => p.name),
          ["jdeurt-design", "jdeurt-engineering", "jdeurt-writing", "jdeurt-meta", "jdeurt-cloudflare"]
        );
        await readFile(
          path.join(output, "dist/codex/plugins/writing/skills/writing-clearly-and-concisely/elements-of-style.md")
        );
        await readFile(path.join(output, "dist/claude/plugins/writing/skills/writing-clearly-and-concisely/SKILL.md"));
        const resolvedValue4 = await json("dist/codex/plugins/design/.mcp.json", mobbinMcpSchema);
        assert.equal(resolvedValue4.mobbin.url, "https://api.mobbin.com/mcp");
        const engineering = await json(
          "dist/codex/plugins/engineering/.codex-plugin/plugin.json",
          z.object({ mcpServers: z.string() })
        );
        assert.equal(engineering.mcpServers, "./.mcp.json");
        const hookDependencies = await json(
          "dist/codex/plugins/engineering/hook-deps/package.json",
          hookDependenciesSchema
        );
        assert.equal(hookDependencies.dependencies["eslint-plugin-unicorn"], "78.0.0");
        assert.equal(
          await Bun.file(path.join(output, "dist/codex/plugins/engineering/hook-deps/bun.lock")).exists(),
          false
        );

        for (const name of ["eslint.config.ts", "prettier.config.mjs"]) {
          const source = await readFile(path.join(process.cwd(), name), "utf8");

          if (name === "eslint.config.ts") {
            assert.ok(source.startsWith(configHeader));
          }

          for (const host of ["codex", "claude"]) {
            const published = await readFile(path.join(output, `dist/${host}/plugins/engineering/${name}`), "utf8");
            assert.equal(published, source);

            if (name === "eslint.config.ts") {
              assert.ok(published.startsWith(configHeader));
            }
          }
        }

        const bunMcp = await json("dist/codex/plugins/engineering/.mcp.json", bunMcpSchema);
        assert.equal(bunMcp.bun.url, "https://bun.com/docs/mcp");
        const claudeMcp = await json("dist/claude/plugins/engineering/.mcp.json", claudeMcpSchema);
        assert.equal(claudeMcp.mcpServers.bun.url, "https://bun.com/docs/mcp");

        await assertImportedJscpdSkills(output);
        await assertCodeReviewSkill(output);

        const skill = "dist/codex/plugins/design/skills/shadcn/SKILL.md";
        assert.doesNotMatch(await readFile(path.join(output, skill), "utf8"), /^allowed-tools:/m);
        assert.match(
          await readFile(path.join(output, "dist/claude/plugins/design/skills/shadcn/SKILL.md"), "utf8"),
          /^allowed-tools:/m
        );
        await readFile(path.join(output, "dist/codex/plugins/design/skills/shadcn/UPSTREAM-LICENSE"));
        await buildMarketplace({ output, check: true });
        await writeFile(path.join(output, skill), "corrupted");
        await assert.rejects(buildMarketplace({ output, check: true }), /stale/);
        await buildMarketplace({ output });
        await writeFile(path.join(output, "dist/stale.txt"), "stale");
        await buildMarketplace({ output });
        await assert.rejects(readFile(path.join(output, "dist/stale.txt")), {
          code: "ENOENT",
        });
      }

      try {
        await assertMarketplaceBuild();
      } finally {
        await rm(output, { recursive: true, force: true });
      }
    }),
  INTEGRATION_TIMEOUT_MS
);

test("rejects import traversal and symlinks; hashes executable mode and content", async () => {
  for (const value of ["../outside", "/absolute", ".git/config"]) {
    assert.throws(() => inside("/safe", value));
  }

  const root = await mkdtemp(path.join(tmpdir(), "agents-hash-"));

  try {
    await mkdir(path.join(root, "skill"));
    await writeFile(path.join(root, "skill", "SKILL.md"), "original");
    const before = await digest(path.join(root, "skill"));
    await writeFile(path.join(root, "skill", "SKILL.md"), "changed");
    assert.notEqual(await digest(path.join(root, "skill")), before);
    await symlink("../outside", path.join(root, "skill", "escape"));
    await assert.rejects(digest(path.join(root, "skill")), /symlink/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
