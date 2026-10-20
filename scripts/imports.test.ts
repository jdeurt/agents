import { cp, mkdtemp, realpath, rm } from "node:fs/promises";
import { readFile, writeFile } from "./io.ts";
import assert from "node:assert/strict";
import { buildMarketplace } from "./build-marketplace.ts";
import { fileURLToPath } from "node:url";
import { git } from "./git.ts";
import path from "node:path";
import { test } from "bun:test";

const INTEGRATION_TIMEOUT_MS = 30_000;
import { tmpdir } from "node:os";
import { withImportFixture } from "./import-fixture.ts";
const SOURCE_DIRECTORY = "../";
const IMPORTS_TRACK_LATEST_BY_DEFAULT_SUPPORT_PINS =
  "imports track latest by default, support pins and whole plugins, and leave sources untouched";
const AGENTS_IMPORTS_TEST = "agents-imports-test-";
const PLUGINS = "plugins";
const ESLINT_RULES_TS = "eslint-rules.ts";
const ESLINT_CONFIG_TS = "eslint.config.ts";
const PRETTIER_CONFIG_MJS = "prettier.config.mjs";
const MARKETPLACE_TOML = "marketplace.toml";
const IMPORTS_TOML = "imports.toml";
const BUILD = "build";
const UTF8 = "utf8";
const REV_PARSE = "rev-parse";
const HEAD_REF = "HEAD";
const SKILLS_SHADCN_NEW_TXT = "skills/shadcn/new.txt";
const LATEST_FILE = "Latest file\n";
const ADD = "add";
const COMMIT = "commit";
const UPSTREAM_UPDATE = "Upstream update";
const DIST_CODEX_PLUGINS_DESIGN_SKILLS_SHADCN_NEW = "dist/codex/plugins/design/skills/shadcn/new.txt";
const PLUGINS_DESIGN_SKILLS_SHADCN_IMPORT = "plugins/design/skills/shadcn.import";
const SHADCN_MARKER = "shadcn\n";
const PLUGINS_DESIGN_SKILLS_SHADCN_SKILL_MD = "plugins/design/skills/shadcn/SKILL.md";
const NAME_SHADCN = 'name = "shadcn"';
const SCRIPTS_IMPORTS_TS = "scripts/imports.ts";
const PIPE = "pipe";
const PLUGIN = "plugin";
const SAMPLE = "sample";
const HTTPS_GITHUB_COM_SHADCN_UI_UI_GIT = "https://github.com/shadcn-ui/ui.git";
const PLUGINS_SAMPLE = "plugins/sample";
const LICENSE_MD = "LICENSE.md";
const HARNESS = "--harness";
const CODEX = "codex";
const HOOKS_TRUE = "\nhooks = true\n";
const DIST_CODEX_PLUGINS_SAMPLE_HOOKS_JSON = "dist/codex/plugins/sample/hooks.json";
const HOOKS = '{"hooks":{}}\n';
const DIST_CODEX_PLUGINS_SAMPLE_MCP_JSON = "dist/codex/plugins/sample/.mcp.json";
const HTTPS_EXAMPLE_COM_MCP = "https://example.com/mcp";
const REMOVE = "remove";
const SHADCN_NAME = "shadcn";
const SKILL_KIND = "skill";
const SKILLS_SHADCN = "skills/shadcn";
const PLUGINS_DESIGN_SKILLS_SHADCN = "plugins/design/skills/shadcn";

const source = fileURLToPath(new URL(SOURCE_DIRECTORY, import.meta.url));

async function copyImportSources(root: string) {
  for (const item of [
    PLUGINS,
    ESLINT_CONFIG_TS,
    ESLINT_RULES_TS,
    PRETTIER_CONFIG_MJS,
    MARKETPLACE_TOML,
    IMPORTS_TOML,
  ]) {
    await cp(path.join(source, item), path.join(root, item), {
      recursive: true,
    });
  }
}

async function enableImportedHooks(root: string) {
  const importText = await readFile(path.join(root, IMPORTS_TOML), UTF8);
  await writeFile(path.join(root, IMPORTS_TOML), importText + HOOKS_TRUE);
}

test(
  IMPORTS_TRACK_LATEST_BY_DEFAULT_SUPPORT_PINS,
  async () =>
    withImportFixture(async (upstream) => {
      const temporaryRoot = await mkdtemp(path.join(tmpdir(), AGENTS_IMPORTS_TEST));
      const root = await realpath(temporaryRoot);

      async function assertImportLifecycle() {
        const output = path.join(root, BUILD);
        const original = await readFile(path.join(root, IMPORTS_TOML), UTF8);
        const pinned = git(upstream, [REV_PARSE, HEAD_REF]);
        const run = (...args: string[]) => {
          const result = Bun.spawnSync([process.execPath, path.join(source, SCRIPTS_IMPORTS_TS), ...args], {
            cwd: root,
            stdout: PIPE,
            stderr: PIPE,
          });
          assert.equal(result.exitCode, 0, result.stderr.toString());
        };
        await writeFile(path.join(upstream, SKILLS_SHADCN_NEW_TXT), LATEST_FILE);
        git(upstream, [ADD, "."]);
        git(upstream, [COMMIT, "-m", UPSTREAM_UPDATE]);
        await buildMarketplace({ root, output });
        assert.equal(await readFile(path.join(output, DIST_CODEX_PLUGINS_DESIGN_SKILLS_SHADCN_NEW), UTF8), LATEST_FILE);
        assert.equal(await readFile(path.join(root, IMPORTS_TOML), UTF8), original);
        assert.equal(await readFile(path.join(root, PLUGINS_DESIGN_SKILLS_SHADCN_IMPORT), UTF8), SHADCN_MARKER);
        assert.equal(await Bun.file(path.join(root, PLUGINS_DESIGN_SKILLS_SHADCN_SKILL_MD)).exists(), false);
        await writeFile(
          path.join(root, IMPORTS_TOML),
          original.replace(NAME_SHADCN, () => {
            const pinnedEntry = `name = "shadcn"\nref = "${pinned}"`;

            return pinnedEntry;
          })
        );
        await buildMarketplace({ root, output });
        assert.equal(await Bun.file(path.join(output, DIST_CODEX_PLUGINS_DESIGN_SKILLS_SHADCN_NEW)).exists(), false);
        run(ADD, PLUGIN, SAMPLE, HTTPS_GITHUB_COM_SHADCN_UI_UI_GIT, SAMPLE, PLUGINS_SAMPLE, LICENSE_MD, HARNESS, CODEX);
        await enableImportedHooks(root);
        await buildMarketplace({ root, output });
        assert.equal(await readFile(path.join(output, DIST_CODEX_PLUGINS_SAMPLE_HOOKS_JSON), UTF8), HOOKS);
        assert.equal(
          await readFile(path.join(output, DIST_CODEX_PLUGINS_SAMPLE_MCP_JSON), UTF8),
          JSON.stringify({ docs: { url: HTTPS_EXAMPLE_COM_MCP } }, undefined, 2) + "\n"
        );
        run(REMOVE, SAMPLE);
        run(REMOVE, SHADCN_NAME);
        run(
          ADD,
          SKILL_KIND,
          SHADCN_NAME,
          HTTPS_GITHUB_COM_SHADCN_UI_UI_GIT,
          SKILLS_SHADCN,
          PLUGINS_DESIGN_SKILLS_SHADCN,
          LICENSE_MD
        );
        await buildMarketplace({ root, output });
        assert.equal(await Bun.file(path.join(output, DIST_CODEX_PLUGINS_SAMPLE_HOOKS_JSON)).exists(), false);
      }

      try {
        await copyImportSources(root);
        await assertImportLifecycle();
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    }),
  INTEGRATION_TIMEOUT_MS
);
