import { withImportFixture } from "./import-fixture.ts";
import { readFile, writeFile } from "./io.ts";
import { test } from "bun:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, symlink, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { validateSkillFrontmatter } from "./file-validation.ts";
import { buildMarketplace } from "./build-marketplace.ts";
import { digest, inside, syncImports } from "./sync-imports.ts";

test(
  "packages both harnesses, retains portable skills and imports, and detects tampering",
  async () =>
    withImportFixture(async () => {
      const output = await mkdtemp(path.join(tmpdir(), "agents-test-"));
      try {
        await syncImports({ check: true });
        await buildMarketplace({ output });
        const json = async (p) => JSON.parse(await readFile(path.join(output, p), "utf8"));
        for await (const file of new Bun.Glob("dist/*/plugins/*/skills/*/SKILL.md").scan(output)) {
          await validateSkillFrontmatter(path.join(output, file), {
            harness: file.split("/")[1] as "claude" | "codex",
          });
        }
        const codex = await json(".agents/plugins/marketplace.json");
        assert.deepEqual(
          codex.plugins.map((p) => p.name),
          ["jdeurt-design", "jdeurt-engineering", "jdeurt-writing", "jdeurt-meta", "jdeurt-cloudflare"]
        );
        assert.ok(
          codex.plugins.every((p) => p.source.source === "local" && p.source.path.startsWith("./dist/codex/plugins/"))
        );
        const resolvedValue1 = await json(".claude-plugin/marketplace.json");
        assert.deepEqual(
          resolvedValue1.plugins.map((p) => p.name),
          ["jdeurt-design", "jdeurt-engineering", "jdeurt-writing", "jdeurt-meta", "jdeurt-cloudflare"]
        );
        await readFile(
          path.join(output, "dist/codex/plugins/writing/skills/writing-clearly-and-concisely/elements-of-style.md")
        );
        await readFile(path.join(output, "dist/claude/plugins/writing/skills/writing-clearly-and-concisely/SKILL.md"));
        const resolvedValue4 = await json("dist/codex/plugins/design/.mcp.json");
        assert.equal(resolvedValue4.mobbin.url, "https://api.mobbin.com/mcp");
        const engineering = await json("dist/codex/plugins/engineering/.codex-plugin/plugin.json");
        assert.equal(engineering.mcpServers, "./.mcp.json");
        for (const name of ["eslint.config.ts", "prettier.config.mjs"]) {
          const source = await readFile(path.join(process.cwd(), name), "utf8");
          for (const host of ["codex", "claude"])
            assert.equal(await readFile(path.join(output, `dist/${host}/plugins/engineering/${name}`), "utf8"), source);
        }
        const bunMcp = await json("dist/codex/plugins/engineering/.mcp.json");
        assert.equal(bunMcp.bun.url, "https://bun.com/docs/mcp");
        const claudeMcp = await json("dist/claude/plugins/engineering/.mcp.json");
        assert.equal(claudeMcp.mcpServers.bun.url, "https://bun.com/docs/mcp");
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
      } finally {
        await rm(output, { recursive: true, force: true });
      }
    }),
  30_000
);

test("rejects import traversal and symlinks; hashes executable mode and content", async () => {
  for (const value of ["../outside", "/absolute", ".git/config"]) assert.throws(() => inside("/safe", value));
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
