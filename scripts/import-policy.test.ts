import * as z from "zod/mini";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { readFile, writeFile } from "./io.ts";
import type { ExternalImport } from "./types.ts";
import { applyImportPolicy } from "./import-policy.ts";
import assert from "node:assert/strict";
import path from "node:path";
import { test } from "bun:test";
import { tmpdir } from "node:os";

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
    await writeFile(path.join(directory, "scripts/allowed.ts"), "console.log('allowed');\n");
    await writeFile(path.join(directory, "scripts/omitted.py"), "print('omitted')\n");
    await writeFile(
      path.join(directory, ".codex-plugin/plugin.json"),
      JSON.stringify({
        name: "test",
        hooks: { SessionStart: [{ command: "echo hi" }] },
        mcpServers: ["./config/mcp.json"],
      })
    );
    await writeFile(
      path.join(directory, ".mcp.json"),
      JSON.stringify({
        remote: { url: "https://example.com/mcp" },
        local: { command: "bun", args: ["server.ts"] },
      })
    );
    await applyImportPolicy(directory, entry);
    assert.equal(await Bun.file(path.join(directory, "scripts/allowed.ts")).exists(), true);
    assert.equal(await Bun.file(path.join(directory, "scripts/omitted.py")).exists(), false);
    assert.match(await readFile(path.join(directory, "SKILL.md"), "utf8"), /Do not download, install, recreate/);
    const manifest = z
      .looseObject({ hooks: z.optional(z.unknown()), mcpServers: z.optional(z.unknown()) })
      .parse(JSON.parse(await readFile(path.join(directory, ".codex-plugin/plugin.json"), "utf8")));
    assert.equal(manifest.hooks, undefined);
    assert.equal(manifest.mcpServers, undefined);
    const mcp = z
      .looseObject({ local: z.optional(z.unknown()), remote: z.object({ url: z.string() }) })
      .parse(JSON.parse(await readFile(path.join(directory, ".mcp.json"), "utf8")));
    assert.equal(mcp.local, undefined);
    assert.equal(mcp.remote.url, "https://example.com/mcp");
    await writeFile(path.join(directory, "scripts/omitted.py"), "print('opt in')\n");
    await applyImportPolicy(directory, {
      ...entry,
      scripts: "all",
      hooks: true,
      local_mcp: true,
    });
    assert.equal(await Bun.file(path.join(directory, "scripts/omitted.py")).exists(), true);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
