import { lstat, rm } from "node:fs/promises";
import path from "node:path";
import { filesIn } from "./build-files.ts";
import { readFile, writeFile } from "./io.ts";
import type { ExternalImport } from "./types.ts";
import * as z from "zod/mini";

const CODE = /\.(?:[cm]?[jt]sx?|sh|bash|zsh|fish|py|rb|pl|php|ps1|bat|cmd|exe|dll|so|dylib|wasm)$/i;
const surfaceSchema = z.looseObject({
  extensions: z.optional(z.record(z.string(), z.unknown())),
  hooks: z.optional(z.unknown()),
  mcpServers: z.optional(z.unknown()),
});
export async function applyImportPolicy(directory: string, entry: ExternalImport) {
  const files = await filesIn(directory);
  const allowed = entry.scripts ?? [];
  if (Array.isArray(allowed)) {
    for (const file of allowed) {
      if (!files.includes(file)) throw new Error(`${entry.name}: allowed script does not exist: ${file}`);
    }
  }
  const omitted: string[] = [];
  for (const file of files) {
    if (path.basename(file) === "SKILL.md" || file === "UPSTREAM-LICENSE") continue;
    const info = await lstat(path.join(directory, file));
    const shebang = await Bun.file(path.join(directory, file)).slice(0, 2).text();
    const script =
      shebang === "#!" || CODE.test(file) || Boolean(info.mode & 0o111) || /(^|\/)(scripts|bin)\//.test(file);
    if (script && allowed !== "all" && !allowed.includes(file)) {
      await rm(path.join(directory, file));
      omitted.push(file);
    }
  }
  // Hooks can execute shell commands inline without a separate script file.
  if (!entry.hooks) {
    for (const file of files.filter((file) => /(^|\/)hooks(?:\/.*|\.json)$/.test(file))) {
      await rm(path.join(directory, file), { force: true });
      if (!omitted.includes(file)) omitted.push(file);
    }
  }
  for (const file of [
    "plugin.json",
    ".codex-plugin/plugin.json",
    ".claude-plugin/plugin.json",
    ".mcp.json",
    "mcp.json",
  ]) {
    if (!files.includes(file)) continue;
    const value = surfaceSchema.parse(JSON.parse(await readFile(path.join(directory, file), "utf8")));
    const extension = value.extensions?.["com.openai"];
    const surfaces = extension === undefined ? [value] : [value, surfaceSchema.parse(extension)];
    for (const surface of surfaces) {
      if (!entry.hooks && surface.hooks !== undefined) {
        delete surface.hooks;
        omitted.push(`${file}: hooks`);
      }
      // Local MCP commands are executable entrypoints, including inline commands.
      // Require an explicit script policy AND local_mcp opt-in.
      if (!entry.local_mcp && Array.isArray(surface.mcpServers)) {
        delete surface.mcpServers;
        omitted.push(`${file}: referenced MCP configurations`);
      }
      if (
        !entry.local_mcp &&
        typeof surface.mcpServers === "string" &&
        !["./.mcp.json", "./mcp.json", ".mcp.json", "mcp.json"].includes(surface.mcpServers)
      ) {
        delete surface.mcpServers;
        omitted.push(`${file}: custom MCP configuration`);
      }
      const servers = surface.mcpServers ?? (file === ".mcp.json" || file === "mcp.json" ? surface : undefined);
      if (servers && typeof servers === "object" && !entry.local_mcp) {
        for (const [name, server] of Object.entries(z.record(z.string(), z.unknown()).parse(servers))) {
          if (
            server &&
            typeof server === "object" &&
            ("command" in server || ("type" in server && server.type === "stdio"))
          ) {
            Reflect.deleteProperty(servers, name);
            omitted.push(`${file}: local MCP ${name}`);
          }
        }
      }
    }
    await writeFile(path.join(directory, file), JSON.stringify(value, undefined, 2) + "\n");
  }
  if (omitted.length > 0) {
    const intro =
      "\n\n## Import restrictions\n\n" +
      "This package intentionally omits the following files or executable integrations " +
      "under its imports.toml policy:\n\n";
    const list = omitted
      .sort()
      .map((file) => `- ${file}`)
      .join("\n");
    const outro =
      "\n\nDo not download, install, recreate, or execute the omitted components to work around this policy. " +
      "Use the included resources; if a task requires an omitted component, explain the limitation and ask the user " +
      "to update the import policy. Included scripts still require the host's normal execution permissions.\n";
    const note = intro + list + outro;
    const skills = files.filter((file) => path.basename(file) === "SKILL.md");
    for (const file of skills) {
      const original = await readFile(path.join(directory, file), "utf8");
      await writeFile(path.join(directory, file), original.trimEnd() + note);
    }
    await writeFile(path.join(directory, "IMPORT-POLICY.md"), note.trimStart());
  }
}
