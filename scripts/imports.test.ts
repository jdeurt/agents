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

const IMPORTS_TOML = "imports.toml";

const LATEST_FILE = "Latest file\n";

const DIST_CODEX_PLUGINS_DESIGN_SKILLS_SHADCN_NEW = "dist/codex/plugins/design/skills/shadcn/new.txt";

const HTTPS_GITHUB_COM_SHADCN_UI_UI_GIT = "https://github.com/shadcn-ui/ui.git";

const DIST_CODEX_PLUGINS_SAMPLE_HOOKS_JSON = "dist/codex/plugins/sample/hooks.json";

const source = fileURLToPath(new URL("../", import.meta.url));

/**
Copy authored import and packaging inputs into a test repository.
@param root - Temporary repository receiving the copied source inputs.
*/
async function copyImportSources(root: string) {
  for (const item of [
    "plugins",
    "eslint.config.ts",
    "eslint-rules.ts",
    "eslint-effects",
    "prettier.config.mjs",
    "marketplace.toml",
    IMPORTS_TOML,
  ]) {
    await cp(path.join(source, item), path.join(root, item), {
      recursive: true,
    });
  }
}

/**
Enable the fixture plugin's imported hook configuration.
@param root - Temporary repository whose import declaration will change.
*/
async function enableImportedHooks(root: string) {
  const importText = await readFile(path.join(root, IMPORTS_TOML), "utf8");

  await writeFile(path.join(root, IMPORTS_TOML), importText + "\nhooks = true\n");
}

test(
  "imports track latest by default, support pins and whole plugins, and leave sources untouched",
  async () =>
    withImportFixture(async (upstream) => {
      const temporaryRoot = await mkdtemp(path.join(tmpdir(), "agents-imports-test-"));
      const root = await realpath(temporaryRoot);

      async function assertImportLifecycle() {
        const output = path.join(root, "build");
        const original = await readFile(path.join(root, IMPORTS_TOML), "utf8");
        const pinned = git(upstream, ["rev-parse", "HEAD"]);
        const run = (...args: string[]) => {
          const result = Bun.spawnSync([process.execPath, path.join(source, "scripts/imports.ts"), ...args], {
            cwd: root,
            stdout: "pipe",
            stderr: "pipe",
          });

          assert.equal(result.exitCode, 0, result.stderr.toString());
        };

        await writeFile(path.join(upstream, "skills/shadcn/new.txt"), LATEST_FILE);
        git(upstream, ["add", "."]);
        git(upstream, ["commit", "-m", "Upstream update"]);
        await buildMarketplace({ root, output });
        assert.equal(
          await readFile(path.join(output, DIST_CODEX_PLUGINS_DESIGN_SKILLS_SHADCN_NEW), "utf8"),
          LATEST_FILE
        );
        assert.equal(await readFile(path.join(root, IMPORTS_TOML), "utf8"), original);
        assert.equal(await readFile(path.join(root, "plugins/design/skills/shadcn.import"), "utf8"), "shadcn\n");
        assert.equal(await Bun.file(path.join(root, "plugins/design/skills/shadcn/SKILL.md")).exists(), false);
        await writeFile(
          path.join(root, IMPORTS_TOML),
          original.replace('name = "shadcn"', () => {
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
          "plugins/sample",
          "LICENSE.md",
          "--harness",
          "codex"
        );
        await enableImportedHooks(root);
        await buildMarketplace({ root, output });
        assert.equal(await readFile(path.join(output, DIST_CODEX_PLUGINS_SAMPLE_HOOKS_JSON), "utf8"), '{"hooks":{}}\n');
        assert.equal(
          await readFile(path.join(output, "dist/codex/plugins/sample/.mcp.json"), "utf8"),
          JSON.stringify({ docs: { url: "https://example.com/mcp" } }, undefined, 2) + "\n"
        );
        run("remove", "sample");
        run("remove", "shadcn");
        run(
          "add",
          "skill",
          "shadcn",
          HTTPS_GITHUB_COM_SHADCN_UI_UI_GIT,
          "skills/shadcn",
          "plugins/design/skills/shadcn",
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
