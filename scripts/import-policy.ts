import * as z from "zod/mini";
import { lstat, rm } from "node:fs/promises";
import { readFile, writeFile } from "./io.ts";
import { EXECUTABLE_BITS } from "./file-modes.ts";
import type { ExternalImport } from "./types.ts";
import { filesIn } from "./build-files.ts";
import { jsonRecord } from "./validation.ts";
import path from "node:path";

const RELATIVE_HIDDEN_MCP_PATH = "./.mcp.json";

const PLUGIN_JSON = "plugin.json";
const CODEX_PLUGIN_PLUGIN_JSON = ".codex-plugin/plugin.json";
const CLAUDE_PLUGIN_PLUGIN_JSON = ".claude-plugin/plugin.json";

const UPSTREAM_LICENSE = "UPSTREAM-LICENSE";

const IMPORT_RESTRICTIONS = "\n\n## Import restrictions\n\n";
const THIS_PACKAGE_INTENTIONALLY_OMITS_THE_FOLLOWING_FILES =
  "This package intentionally omits the following files or executable integrations ";
const UNDER_ITS_IMPORTS_TOML_POLICY = "under its imports.toml policy:\n\n";
const DO_NOT_DOWNLOAD_INSTALL_RECREATE_OR_EXECUTE =
  "\n\nDo not download, install, recreate, or execute the omitted components to work around this policy. ";
const USE_THE_INCLUDED_RESOURCES_IF_A_TASK =
  "Use the included resources; if a task requires an omitted component, explain the limitation and ask the user ";
const TO_UPDATE_THE_IMPORT_POLICY_INCLUDED_SCRIPTS =
  "to update the import policy. Included scripts still require the host's normal execution permissions.\n";
const IMPORT_POLICY_MD = "IMPORT-POLICY.md";

const CODE = /\.(?:[cm]?[jt]sx?|sh|bash|zsh|fish|py|rb|pl|php|ps1|bat|cmd|exe|dll|so|dylib|wasm)$/i;
const extensions = z.record(z.string(), z.unknown());
const surfaceSchema = z.looseObject({
  extensions: z.optional(extensions),
  hooks: z.optional(z.unknown()),
  mcpServers: z.optional(z.unknown()),
});

function omitLocalServer(servers: object, name: string, file: string, omitted: string[]) {
  const omission = `${file}: local MCP ${name}`;

  Reflect.deleteProperty(servers, name);
  omitted.push(omission);
}

function restrictServerEntries(servers: object, file: string, omitted: string[]) {
  const entries = Object.entries(jsonRecord.parse(servers));

  for (const [name, server] of entries) {
    if (!(
      server &&
      typeof server === "object" &&
      (Reflect.has(server, "command") || Reflect.get(server, "type") === "stdio")
    )) {
      continue;
    }

    omitLocalServer(servers, name, file, omitted);
  }
}

function restrictLocalServers(
  surface: z.infer<typeof surfaceSchema>,
  file: string,
  entry: ExternalImport,
  omitted: string[]
) {
  const servers = surface.mcpServers ?? (file === ".mcp.json" || file === "mcp.json" ? surface : undefined);

  if (!servers || typeof servers !== "object" || entry.local_mcp) {
    return;
  }

  restrictServerEntries(servers, file, omitted);
}

function restrictSurface(
  surface: z.infer<typeof surfaceSchema>,
  file: string,
  entry: ExternalImport,
  omitted: string[]
) {
  if (!entry.hooks && surface.hooks !== undefined) {
    delete surface.hooks;
    omitted.push(`${file}: hooks`);
  }

  // Local MCP commands are executable entrypoints, including inline commands.
  // Require an explicit script policy AND local_mcp opt-in.
  if (!entry.local_mcp && Array.isArray(surface.mcpServers)) {
    const omission = `${file}: referenced MCP configurations`;

    delete surface.mcpServers;
    omitted.push(omission);
  }

  if (
    !entry.local_mcp &&
    typeof surface.mcpServers === "string" &&
    ![RELATIVE_HIDDEN_MCP_PATH, "./mcp.json", ".mcp.json", "mcp.json"].includes(surface.mcpServers)
  ) {
    const omission = `${file}: custom MCP configuration`;

    delete surface.mcpServers;
    omitted.push(omission);
  }

  restrictLocalServers(surface, file, entry, omitted);
}

async function restrictManifests(directory: string, entry: ExternalImport, files: string[], omitted: string[]) {
  const manifests = [PLUGIN_JSON, CODEX_PLUGIN_PLUGIN_JSON, CLAUDE_PLUGIN_PLUGIN_JSON, ".mcp.json", "mcp.json"].filter(
    (file) => files.includes(file)
  );

  for (const file of manifests) {
    const source = await readFile(path.join(directory, file), "utf8");
    const value = surfaceSchema.parse(JSON.parse(source));
    const extension = value.extensions?.["com.openai"];
    const surfaces = extension === undefined ? [value] : [value, surfaceSchema.parse(extension)];

    for (const surface of surfaces) {
      restrictSurface(surface, file, entry, omitted);
    }

    await writeFile(path.join(directory, file), JSON.stringify(value, undefined, 2) + "\n");
  }
}

function validateAllowedScripts(files: string[], allowed: string | string[], entry: ExternalImport) {
  if (Array.isArray(allowed)) {
    for (const file of allowed) {
      if (!files.includes(file)) {
        const message = `${entry.name}: allowed script does not exist: ${file}`;

        throw new Error(message);
      }
    }
  }
}

async function writePolicyNotes(directory: string, files: string[], omitted: string[]) {
  const intro =
    IMPORT_RESTRICTIONS + THIS_PACKAGE_INTENTIONALLY_OMITS_THE_FOLLOWING_FILES + UNDER_ITS_IMPORTS_TOML_POLICY;
  const list = omitted
    .toSorted((a, b) => a.localeCompare(b))
    .map((file) => `- ${file}`)
    .join("\n");
  const outro =
    DO_NOT_DOWNLOAD_INSTALL_RECREATE_OR_EXECUTE +
    USE_THE_INCLUDED_RESOURCES_IF_A_TASK +
    TO_UPDATE_THE_IMPORT_POLICY_INCLUDED_SCRIPTS;
  const note = intro + list + outro;
  const skills = files.filter((file) => path.basename(file) === "SKILL.md");

  for (const file of skills) {
    const original = await readFile(path.join(directory, file), "utf8");

    await writeFile(path.join(directory, file), original.trimEnd() + note);
  }

  await writeFile(path.join(directory, IMPORT_POLICY_MD), note.trimStart());
}

export async function applyImportPolicy(directory: string, entry: ExternalImport) {
  const files = await filesIn(directory);
  const allowed = entry.scripts ?? [];

  const omitted: string[] = [];
  const executableCandidates = files.filter((file) => file !== UPSTREAM_LICENSE && path.basename(file) !== "SKILL.md");

  validateAllowedScripts(files, allowed, entry);

  for (const file of executableCandidates) {
    const info = await lstat(path.join(directory, file));
    const shebang = await Bun.file(path.join(directory, file)).slice(0, 2).text();
    const isScript =
      shebang === "#!" || CODE.test(file) || Boolean(info.mode & EXECUTABLE_BITS) || /(^|\/)(scripts|bin)\//.test(file);

    if (!isScript || allowed === "all" || allowed.includes(file)) {
      continue;
    }

    await rm(path.join(directory, file));
    omitted.push(file);
  }

  // Hooks can execute shell commands inline without a separate script file.
  if (!entry.hooks) {
    for (const file of files) {
      if (!/(^|\/)hooks(?:\/.*|\.json)$/.test(file)) {
        continue;
      }

      await rm(path.join(directory, file), { force: true });

      if (!omitted.includes(file)) {
        omitted.push(file);
      }
    }
  }

  await restrictManifests(directory, entry, files, omitted);

  if (omitted.length === 0) {
    return;
  }

  await writePolicyNotes(directory, files, omitted);
}
