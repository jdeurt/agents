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

const IMPORTS_TRACK_LATEST_BY_DEFAULT_SUPPORT_PINS =
  "imports track latest by default, support pins and whole plugins, and leave sources untouched";
const AGENTS_IMPORTS_TEST = "agents-imports-test-";

const ESLINT_RULES_TS = "eslint-rules.ts";
const ESLINT_CONFIG_TS = "eslint.config.ts";
const PRETTIER_CONFIG_MJS = "prettier.config.mjs";
const MARKETPLACE_TOML = "marketplace.toml";
const IMPORTS_TOML = "imports.toml";

const SKILLS_SHADCN_NEW_TXT = "skills/shadcn/new.txt";
const LATEST_FILE = "Latest file\n";

const UPSTREAM_UPDATE = "Upstream update";
const DIST_CODEX_PLUGINS_DESIGN_SKILLS_SHADCN_NEW = "dist/codex/plugins/design/skills/shadcn/new.txt";
const PLUGINS_DESIGN_SKILLS_SHADCN_IMPORT = "plugins/design/skills/shadcn.import";

const PLUGINS_DESIGN_SKILLS_SHADCN_SKILL_MD = "plugins/design/skills/shadcn/SKILL.md";
const NAME_SHADCN = 'name = "shadcn"';
const SCRIPTS_IMPORTS_TS = "scripts/imports.ts";

const HTTPS_GITHUB_COM_SHADCN_UI_UI_GIT = "https://github.com/shadcn-ui/ui.git";
const PLUGINS_SAMPLE = "plugins/sample";

const HOOKS_TRUE = "\nhooks = true\n";
const DIST_CODEX_PLUGINS_SAMPLE_HOOKS_JSON = "dist/codex/plugins/sample/hooks.json";
const HOOKS = '{"hooks":{}}\n';
const DIST_CODEX_PLUGINS_SAMPLE_MCP_JSON = "dist/codex/plugins/sample/.mcp.json";
const HTTPS_EXAMPLE_COM_MCP = "https://example.com/mcp";

const SKILLS_SHADCN = "skills/shadcn";
const PLUGINS_DESIGN_SKILLS_SHADCN = "plugins/design/skills/shadcn";

const source = fileURLToPath(new URL("../", import.meta.url));

async function copyImportSources(root: string) {
  for (const item of [
    "plugins",
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
  const importText = await readFile(path.join(root, IMPORTS_TOML), "utf8");

  await writeFile(path.join(root, IMPORTS_TOML), importText + HOOKS_TRUE);
}

test(
  IMPORTS_TRACK_LATEST_BY_DEFAULT_SUPPORT_PINS,
  async () =>
    withImportFixture(async (upstream) => {
      const temporaryRoot = await mkdtemp(path.join(tmpdir(), AGENTS_IMPORTS_TEST));
      const root = await realpath(temporaryRoot);

      async function assertImportLifecycle() {
        const output = path.join(root, "build");
        const original = await readFile(path.join(root, IMPORTS_TOML), "utf8");
        const pinned = git(upstream, ["rev-parse", "HEAD"]);
        const run = (...args: string[]) => {
          const result = Bun.spawnSync([process.execPath, path.join(source, SCRIPTS_IMPORTS_TS), ...args], {
            cwd: root,
            stdout: "pipe",
            stderr: "pipe",
          });

          assert.equal(result.exitCode, 0, result.stderr.toString());
        };

        await writeFile(path.join(upstream, SKILLS_SHADCN_NEW_TXT), LATEST_FILE);
        git(upstream, ["add", "."]);
        git(upstream, ["commit", "-m", UPSTREAM_UPDATE]);
        await buildMarketplace({ root, output });
        assert.equal(
          await readFile(path.join(output, DIST_CODEX_PLUGINS_DESIGN_SKILLS_SHADCN_NEW), "utf8"),
          LATEST_FILE
        );
        assert.equal(await readFile(path.join(root, IMPORTS_TOML), "utf8"), original);
        assert.equal(await readFile(path.join(root, PLUGINS_DESIGN_SKILLS_SHADCN_IMPORT), "utf8"), "shadcn\n");
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
        run(
          "add",
          "plugin",
          "sample",
          HTTPS_GITHUB_COM_SHADCN_UI_UI_GIT,
          "sample",
          PLUGINS_SAMPLE,
          "LICENSE.md",
          "--harness",
          "codex"
        );
        await enableImportedHooks(root);
        await buildMarketplace({ root, output });
        assert.equal(await readFile(path.join(output, DIST_CODEX_PLUGINS_SAMPLE_HOOKS_JSON), "utf8"), HOOKS);
        assert.equal(
          await readFile(path.join(output, DIST_CODEX_PLUGINS_SAMPLE_MCP_JSON), "utf8"),
          JSON.stringify({ docs: { url: HTTPS_EXAMPLE_COM_MCP } }, undefined, 2) + "\n"
        );
        run("remove", "sample");
        run("remove", "shadcn");
        run(
          "add",
          "skill",
          "shadcn",
          HTTPS_GITHUB_COM_SHADCN_UI_UI_GIT,
          SKILLS_SHADCN,
          PLUGINS_DESIGN_SKILLS_SHADCN,
          "LICENSE.md"
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
