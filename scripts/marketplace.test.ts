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
  packageTest: "packages both harnesses, retains portable skills and imports, and detects tampering",
  hashTest: "rejects import traversal and symlinks; hashes executable mode and content",
  packagePrefix: "agents-test-",
  hashPrefix: "agents-hash-",
  utf8: "utf8",
  local: "local",
  mobbinUrl: "https://api.mobbin.com/mcp",
  bunUrl: "https://bun.com/docs/mcp",
  mcpReference: "./.mcp.json",
  corrupted: "corrupted",
  stale: "stale",
  original: "original",
  changed: "changed",
  missing: "ENOENT",
} as const;
const files = {
  skillGlob: "dist/*/plugins/*/skills/*/SKILL.md",
  codexCatalog: ".agents/plugins/marketplace.json",
  claudeCatalog: ".claude-plugin/marketplace.json",
  codexPrefix: "./dist/codex/plugins/",
  styleReference: "dist/codex/plugins/writing/skills/writing-clearly-and-concisely/elements-of-style.md",
  styleSkill: "dist/claude/plugins/writing/skills/writing-clearly-and-concisely/SKILL.md",
  mobbin: "dist/codex/plugins/design/.mcp.json",
  engineering: "dist/codex/plugins/engineering/.codex-plugin/plugin.json",
  codexMcp: "dist/codex/plugins/engineering/.mcp.json",
  claudeMcp: "dist/claude/plugins/engineering/.mcp.json",
  codexShadcn: "dist/codex/plugins/design/skills/shadcn/SKILL.md",
  claudeShadcn: "dist/claude/plugins/design/skills/shadcn/SKILL.md",
  upstreamLicense: "dist/codex/plugins/design/skills/shadcn/UPSTREAM-LICENSE",
  codeReview: "skills/code-review/SKILL.md",
  jscpdReference: "skills/code-review/references/jscpd.md",
  stale: "dist/stale.txt",
};
const harnesses = ["codex", "claude"] as const;
const importedSkills = ["jscpd", "dry-refactoring", "codebase-refactoring", "compare-codebases", "code-migration"];
const pluginNames = ["jdeurt-design", "jdeurt-engineering", "jdeurt-writing", "jdeurt-meta", "jdeurt-cloudflare"];
const configFiles = ["eslint.config.ts", "prettier.config.mjs", "eslint-rules.ts"];
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

async function json<T>(output: string, name: string, schema: z.ZodMiniType<T>): Promise<T> {
  const contents = await readFile(path.join(output, name), names.utf8);

  return schema.parse(JSON.parse(contents));
}

async function assertImportedSkills(output: string) {
  for (const host of harnesses) {
    const baseName = `dist/${host}/plugins/engineering`;
    const base = path.join(output, baseName);

    await readFile(path.join(base, files.codeReview));
    await readFile(path.join(base, files.jscpdReference));

    for (const name of importedSkills) {
      const imported = `skills/${name}/SKILL.md`;

      await readFile(path.join(base, imported));
    }
  }
}

async function assertCatalogs(output: string) {
  const codex = await json(output, files.codexCatalog, portableMarketplaceSchema);
  const claude = await json(output, files.claudeCatalog, namedMarketplaceSchema);

  assert.deepEqual(
    codex.plugins.map((plugin) => plugin.name),
    pluginNames
  );
  assert.ok(
    codex.plugins.every(
      (plugin) => plugin.source.source === names.local && plugin.source.path.startsWith(files.codexPrefix)
    )
  );
  assert.deepEqual(
    claude.plugins.map((plugin) => plugin.name),
    pluginNames
  );
}

async function assertPluginMetadata(output: string) {
  const mobbin = await json(output, files.mobbin, mobbinMcpSchema);
  const engineering = await json(output, files.engineering, engineeringSchema);
  const bunMcp = await json(output, files.codexMcp, bunMcpSchema);
  const claudeMcp = await json(output, files.claudeMcp, claudeMcpSchema);

  assert.equal(mobbin.mobbin.url, names.mobbinUrl);
  assert.equal(engineering.mcpServers, names.mcpReference);
  assert.equal(bunMcp.bun.url, names.bunUrl);
  assert.equal(claudeMcp.mcpServers.bun.url, names.bunUrl);
}

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

async function assertBuiltContent(output: string) {
  const skillFiles = new Bun.Glob(files.skillGlob).scan(output);

  for await (const file of skillFiles) {
    await validateSkillFrontmatter(path.join(output, file), {
      harness: harnessSchema.parse(file.split("/", 2)[1]),
    });
  }

  await assertCatalogs(output);
  await assertPluginMetadata(output);
  await assertBundledConfiguration(output);
  await assertImportedSkills(output);
  await readFile(path.join(output, files.styleReference));
  await readFile(path.join(output, files.styleSkill));
  assert.doesNotMatch(await readFile(path.join(output, files.codexShadcn), names.utf8), /^allowed-tools:/m);
  assert.match(await readFile(path.join(output, files.claudeShadcn), names.utf8), /^allowed-tools:/m);
  await readFile(path.join(output, files.upstreamLicense));
}

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
  names.packageTest,
  async () =>
    withImportFixture(async () => {
      const output = await mkdtemp(path.join(tmpdir(), names.packagePrefix));

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

async function assertContentHash(root: string) {
  const before = await digest(root);

  await writeFile(path.join(root, "SKILL.md"), names.changed);
  assert.notEqual(await digest(root), before);
  await symlink("../outside", path.join(root, "escape"));
  await assert.rejects(digest(root), /symlink/);
}

function assertImportBoundaries() {
  for (const value of invalidImports) {
    assert.throws(() => inside("/safe", value));
  }
}

test(names.hashTest, async () => {
  const root = await mkdtemp(path.join(tmpdir(), names.hashPrefix));
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
