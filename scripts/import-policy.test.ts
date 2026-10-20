import * as z from "zod/mini";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { readFile, writeFile } from "./io.ts";
import type { ExternalImport } from "./types.ts";
import { applyImportPolicy } from "./import-policy.ts";
import assert from "node:assert/strict";
import path from "node:path";
import { test } from "bun:test";
import { tmpdir } from "node:os";

const SCRIPTS_ALLOWED_TS = "scripts/allowed.ts";

const SCRIPTS_OMITTED_PY = "scripts/omitted.py";

const CODEX_PLUGIN_PLUGIN_JSON = ".codex-plugin/plugin.json";

const HTTPS_EXAMPLE_COM_MCP = "https://example.com/mcp";

/**
Check that filtering removes executable manifest integrations.
@param directory - Filtered import directory containing the plugin manifest.
*/
async function assertRestrictedManifest(directory: string) {
  const manifestContents = await readFile(path.join(directory, CODEX_PLUGIN_PLUGIN_JSON), "utf8");
  const manifest = z
    .looseObject({ hooks: z.optional(z.unknown()), mcpServers: z.optional(z.unknown()) })
    .parse(JSON.parse(manifestContents));

  assert.equal(manifest.hooks, undefined);
  assert.equal(manifest.mcpServers, undefined);
}

/**
Check that remote MCP settings survive local server removal.
@param directory - Filtered import directory containing its MCP configuration.
*/
async function assertRestrictedMcp(directory: string) {
  const mcpContents = await readFile(path.join(directory, ".mcp.json"), "utf8");
  const mcp = z
    .looseObject({ local: z.optional(z.unknown()), remote: z.object({ url: z.string() }) })
    .parse(JSON.parse(mcpContents));

  assert.equal(mcp.local, undefined);
  assert.equal(mcp.remote.url, HTTPS_EXAMPLE_COM_MCP);
}

test("import policy removes unapproved code and executable integrations and explains omissions", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "agents-policy-test-"));
  const entry: ExternalImport = {
    name: "test",
    kind: "plugin",
    repository: "https://github.com/example/test.git",
    path: "test",
    destination: "plugins/test",
    license: "LICENSE",
    scripts: ["scripts/allowed.ts"],
  };

  try {
    await mkdir(path.join(directory, "scripts"));
    await mkdir(path.join(directory, ".codex-plugin"));
    await writeFile(
      path.join(directory, "SKILL.md"),
      "---\nname: test\ndescription: Test.\n---\nRun scripts/omitted.py.\n"
    );
    await writeFile(path.join(directory, SCRIPTS_ALLOWED_TS), "console.log('allowed');\n");
    await writeFile(path.join(directory, SCRIPTS_OMITTED_PY), "print('omitted')\n");
    await writeFile(
      path.join(directory, CODEX_PLUGIN_PLUGIN_JSON),
      JSON.stringify({
        name: "test",
        hooks: { SessionStart: [{ command: "echo hi" }] },
        mcpServers: ["./config/mcp.json"],
      })
    );
    await writeFile(
      path.join(directory, ".mcp.json"),
      JSON.stringify({
        remote: { url: HTTPS_EXAMPLE_COM_MCP },
        local: { command: "bun", args: ["server.ts"] },
      })
    );
    await applyImportPolicy(directory, entry);
    assert.equal(await Bun.file(path.join(directory, SCRIPTS_ALLOWED_TS)).exists(), true);
    assert.equal(await Bun.file(path.join(directory, SCRIPTS_OMITTED_PY)).exists(), false);
    assert.match(await readFile(path.join(directory, "SKILL.md"), "utf8"), /Do not download, install, recreate/);
    await assertRestrictedManifest(directory);
    await assertRestrictedMcp(directory);
    await writeFile(path.join(directory, SCRIPTS_OMITTED_PY), "print('opt in')\n");
    await applyImportPolicy(directory, {
      ...entry,
      scripts: "all",
      hooks: true,
      local_mcp: true,
    });
    assert.equal(await Bun.file(path.join(directory, SCRIPTS_OMITTED_PY)).exists(), true);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
