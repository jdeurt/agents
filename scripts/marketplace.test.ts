import * as z from "zod/mini";
import { digest, inside, syncImports } from "./sync-imports.ts";
import { mkdir, mkdtemp, rm, symlink } from "node:fs/promises";
import { readFile, writeFile } from "./io.ts";
import assert from "node:assert/strict";
import { buildMarketplace } from "./build-marketplace.ts";
import path from "node:path";
import { test } from "bun:test";
import { tmpdir } from "node:os";
import { validateSkillFrontmatter } from "./file-validation.ts";
import { withImportFixture } from "./import-fixture.ts";

const INTEGRATION_TIMEOUT_MS = 30_000;
const names = {
  utf8: "utf8",
  local: "local",
  bunUrl: "https://bun.com/docs/mcp",
  corrupted: "corrupted",
  stale: "stale",
  original: "original",
  changed: "changed",
  missing: "ENOENT",
} as const;
const files = {
  codexShadcn: "dist/codex/plugins/design/skills/shadcn/SKILL.md",
  stale: "dist/stale.txt",
};
const harnesses = ["codex", "claude"] as const;
const importedSkills = ["jscpd", "dry-refactoring", "codebase-refactoring", "compare-codebases", "code-migration"];
const pluginNames = ["jdeurt-design", "jdeurt-engineering", "jdeurt-writing", "jdeurt-meta", "jdeurt-cloudflare"];
const configFiles = ["eslint.config.ts", "prettier.config.mjs"];
const invalidImports = ["../outside", "/absolute", ".git/config"];
const portablePluginSchema = z.object({
  name: z.string(),
  source: z.object({ source: z.string(), path: z.string() }),
});
const portableMarketplaceSchema = z.object({ plugins: z.array(portablePluginSchema) });
const namedPluginSchema = z.object({ name: z.string() });
const namedMarketplaceSchema = z.object({ plugins: z.array(namedPluginSchema) });
const mobbinMcpSchema = z.object({ mobbin: z.object({ url: z.string() }) });
const bunMcpSchema = z.object({ bun: z.object({ url: z.string() }) });
const claudeMcpSchema = z.object({ mcpServers: bunMcpSchema });
const engineeringSchema = z.object({ mcpServers: z.string() });
const harnessSchema = z.enum(harnesses);

/**
Read a generated JSON file through its validation schema.
@param output - Generated marketplace root containing the file.
@param name - Relative path of the generated JSON file.
@param schema - Schema that validates the parsed JSON value.
@returns The parsed value accepted by the schema.
*/
async function json<T>(output: string, name: string, schema: z.ZodMiniType<T>): Promise<T> {
  const contents = await readFile(path.join(output, name), names.utf8);

  return schema.parse(JSON.parse(contents));
}

/**
Check that both clients retain imported and authored review skills.
@param output - Generated marketplace root containing both client distributions.
*/
async function assertImportedSkills(output: string) {
  for (const host of harnesses) {
    const baseName = `dist/${host}/plugins/engineering`;
    const base = path.join(output, baseName);

    await readFile(path.join(base, "skills/code-review/SKILL.md"));
    await readFile(path.join(base, "skills/code-review/references/jscpd.md"));

    for (const name of importedSkills) {
      const imported = `skills/${name}/SKILL.md`;

      await readFile(path.join(base, imported));
    }
  }
}

/**
Check that both clients preserve graph imports and workflow metadata.
@param output - Generated marketplace root containing both client distributions.
*/
async function assertGraphWorkflows(output: string) {
  for (const harness of harnesses) {
    const base = path.join(output, `dist/${harness}/plugins`);
    const imported = path.join(base, "meta/skills/graph-workflows");
    const metadata = await validateSkillFrontmatter(path.join(imported, "SKILL.md"), { harness });
    const workflow = await validateSkillFrontmatter(
      path.join(base, "engineering/skills/clean-implementation/SKILL.md"),
      { harness }
    );

    assert.equal(
      metadata["description"],
      "Use when reading graph workflows identified by metadata.workflow: mermaid-v1."
    );
    assert.deepEqual(metadata.metadata, { fixture: "graph-import" });
    assert.equal(workflow.metadata?.["workflow"], "mermaid-v1");
    assert.equal(
      await readFile(path.join(imported, "scripts/workflow.py"), names.utf8),
      "# Fixture graph navigation script.\n"
    );
    assert.equal(await readFile(path.join(imported, "UPSTREAM-LICENSE"), names.utf8), "Fixture license\n");
  }
}

/**
Check plugin identities and local paths in both client catalogs.
@param output - Generated marketplace root containing the client catalogs.
*/
async function assertCatalogs(output: string) {
  const codex = await json(output, ".agents/plugins/marketplace.json", portableMarketplaceSchema);
  const claude = await json(output, ".claude-plugin/marketplace.json", namedMarketplaceSchema);

  assert.deepEqual(
    codex.plugins.map((plugin) => plugin.name),
    pluginNames
  );
  assert.ok(
    codex.plugins.every(
      (plugin) => plugin.source.source === names.local && plugin.source.path.startsWith("./dist/codex/plugins/")
    )
  );
  assert.deepEqual(
    claude.plugins.map((plugin) => plugin.name),
    pluginNames
  );
}

/**
Check generated manifests and client-specific MCP settings.
@param output - Generated marketplace root containing the plugin metadata.
*/
async function assertPluginMetadata(output: string) {
  const mobbin = await json(output, "dist/codex/plugins/design/.mcp.json", mobbinMcpSchema);
  const engineering = await json(output, "dist/codex/plugins/engineering/.codex-plugin/plugin.json", engineeringSchema);
  const bunMcp = await json(output, "dist/codex/plugins/engineering/.mcp.json", bunMcpSchema);
  const claudeMcp = await json(output, "dist/claude/plugins/engineering/.mcp.json", claudeMcpSchema);

  assert.equal(mobbin.mobbin.url, "https://api.mobbin.com/mcp");
  assert.equal(engineering.mcpServers, "./.mcp.json");
  assert.equal(bunMcp.bun.url, names.bunUrl);
  assert.equal(claudeMcp.mcpServers.bun.url, names.bunUrl);
}

/**
Check that bundled JavaScript policies exactly match authored sources.
@param output - Generated marketplace root containing the skill references.
*/
async function assertBundledConfiguration(output: string) {
  for (const name of configFiles) {
    const source = await readFile(path.join(process.cwd(), name), names.utf8);

    for (const host of harnesses) {
      const bundled = `dist/${host}/plugins/engineering/skills/formatting-linting/references/javascript/${name}`;
      const published = await readFile(path.join(output, bundled), names.utf8);

      assert.equal(published, source);
    }
  }
}

/**
Check generated skills, catalogs, metadata, and bundled source references.
@param output - Generated marketplace root to inspect.
*/
async function assertBuiltContent(output: string) {
  const skillFiles = new Bun.Glob("dist/*/plugins/*/skills/*/SKILL.md").scan(output);

  for await (const file of skillFiles) {
    await validateSkillFrontmatter(path.join(output, file), {
      harness: harnessSchema.parse(file.split("/", 2)[1]),
    });
  }

  await assertCatalogs(output);
  await assertPluginMetadata(output);
  await assertBundledConfiguration(output);
  await assertImportedSkills(output);
  await assertGraphWorkflows(output);
  await readFile(
    path.join(output, "dist/codex/plugins/writing/skills/writing-clearly-and-concisely/elements-of-style.md")
  );
  await readFile(path.join(output, "dist/claude/plugins/writing/skills/writing-clearly-and-concisely/SKILL.md"));
  assert.doesNotMatch(await readFile(path.join(output, files.codexShadcn), names.utf8), /^allowed-tools:/m);
  assert.match(
    await readFile(path.join(output, "dist/claude/plugins/design/skills/shadcn/SKILL.md"), names.utf8),
    /^allowed-tools:/m
  );
  await readFile(path.join(output, "dist/codex/plugins/design/skills/shadcn/UPSTREAM-LICENSE"));
}

/**
Check stale-output detection and removal of obsolete generated files.
@param output - Generated marketplace root to mutate and rebuild.
*/
async function assertTampering(output: string) {
  await buildMarketplace({ output, check: true });
  await writeFile(path.join(output, files.codexShadcn), names.corrupted);
  await assert.rejects(buildMarketplace({ output, check: true }), /stale/);
  await buildMarketplace({ output });
  await writeFile(path.join(output, files.stale), names.stale);
  await buildMarketplace({ output });
  await assert.rejects(readFile(path.join(output, files.stale)), { code: names.missing });
}

test(
  "packages both harnesses, retains portable skills and imports, and detects tampering",
  async () =>
    withImportFixture(async () => {
      const output = await mkdtemp(path.join(tmpdir(), "agents-test-"));

      try {
        await syncImports({ check: true });
        await buildMarketplace({ output });
        await assertBuiltContent(output);
        await assertTampering(output);
      } finally {
        await rm(output, { recursive: true, force: true });
      }
    }),
  INTEGRATION_TIMEOUT_MS
);

/**
Check that hashes detect content changes and reject symlinks.
@param root - Temporary content tree to mutate and inspect.
*/
async function assertContentHash(root: string) {
  const before = await digest(root);

  await writeFile(path.join(root, "SKILL.md"), names.changed);
  assert.notEqual(await digest(root), before);
  await symlink("../outside", path.join(root, "escape"));
  await assert.rejects(digest(root), /symlink/);
}

/**
Check that import paths reject traversal and absolute destinations.
*/
function assertImportBoundaries() {
  for (const value of invalidImports) {
    assert.throws(() => inside("/safe", value));
  }
}

test("rejects import traversal and symlinks; hashes executable mode and content", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "agents-hash-"));
  const skillDirectory = path.join(root, "skill");

  try {
    assertImportBoundaries();
    await mkdir(skillDirectory);
    await writeFile(path.join(skillDirectory, "SKILL.md"), names.original);
    await assertContentHash(skillDirectory);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
