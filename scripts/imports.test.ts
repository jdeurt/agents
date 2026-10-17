import { test } from "bun:test";
import assert from "node:assert/strict";
import { cp, mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { withImportFixture } from "./import-fixture.ts";
import { git } from "./git.ts";
import { readFile, writeFile } from "./io.ts";
import { buildMarketplace } from "./build-marketplace.ts";

const source = fileURLToPath(new URL("../", import.meta.url));
test(
  "imports track latest by default, support pins and whole plugins, and leave sources untouched",
  async () =>
    withImportFixture(async (upstream) => {
      const root = await realpath(
        await mkdtemp(path.join(tmpdir(), "agents-imports-test-"))
      );
      try {
        for (const item of ["plugins", "marketplace.toml", "imports.toml"])
          await cp(path.join(source, item), path.join(root, item), {
            recursive: true,
          });
        const output = path.join(root, "build");
        const original = await readFile(
          path.join(root, "imports.toml"),
          "utf8"
        );
        const pinned = git(upstream, ["rev-parse", "HEAD"]);
        await writeFile(
          path.join(upstream, "skills/shadcn/new.txt"),
          "Latest file\n"
        );
        git(upstream, ["add", "."]);
        git(upstream, ["commit", "-m", "Upstream update"]);
        await buildMarketplace({ root, output });
        assert.equal(
          await readFile(
            path.join(
              output,
              "dist/codex/plugins/design/skills/shadcn/new.txt"
            ),
            "utf8"
          ),
          "Latest file\n"
        );
        assert.equal(
          await readFile(path.join(root, "imports.toml"), "utf8"),
          original
        );
        assert.equal(
          await readFile(
            path.join(root, "plugins/design/skills/shadcn.import"),
            "utf8"
          ),
          "shadcn\n"
        );
        assert.equal(
          await Bun.file(
            path.join(root, "plugins/design/skills/shadcn/SKILL.md")
          ).exists(),
          false
        );
        await writeFile(
          path.join(root, "imports.toml"),
          original.replace(
            'name = "shadcn"',
            `name = "shadcn"\nref = "${pinned}"`
          )
        );
        await buildMarketplace({ root, output });
        assert.equal(
          await Bun.file(
            path.join(output, "dist/codex/plugins/design/skills/shadcn/new.txt")
          ).exists(),
          false
        );
        const run = (...args: string[]) => {
          const result = Bun.spawnSync(
            [
              process.execPath,
              path.join(source, "scripts/imports.ts"),
              ...args,
            ],
            { cwd: root, stdout: "pipe", stderr: "pipe" }
          );
          assert.equal(result.exitCode, 0, result.stderr.toString());
        };
        run(
          "add",
          "plugin",
          "sample",
          "https://github.com/shadcn-ui/ui.git",
          "sample",
          "plugins/sample",
          "LICENSE.md",
          "--harness",
          "codex"
        );
        const importText = await readFile(
          path.join(root, "imports.toml"),
          "utf8"
        );
        await writeFile(
          path.join(root, "imports.toml"),
          importText + "\nhooks = true\n"
        );
        await buildMarketplace({ root, output });
        assert.equal(
          await readFile(
            path.join(output, "dist/codex/plugins/sample/hooks.json"),
            "utf8"
          ),
          '{"hooks":{}}\n'
        );
        assert.equal(
          await readFile(
            path.join(output, "dist/codex/plugins/sample/.mcp.json"),
            "utf8"
          ),
          JSON.stringify(
            { docs: { url: "https://example.com/mcp" } },
            undefined,
            2
          ) + "\n"
        );
        run("remove", "sample");
        run("remove", "shadcn");
        run(
          "add",
          "skill",
          "shadcn",
          "https://github.com/shadcn-ui/ui.git",
          "skills/shadcn",
          "plugins/design/skills/shadcn",
          "LICENSE.md"
        );
        await buildMarketplace({ root, output });
        assert.equal(
          await Bun.file(
            path.join(output, "dist/codex/plugins/sample/hooks.json")
          ).exists(),
          false
        );
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    }),
  30_000
);
