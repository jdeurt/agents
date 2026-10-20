import * as z from "zod/mini";
import { lstat, rm } from "node:fs/promises";
import { readFile, writeFile } from "./io.ts";
import { EXECUTABLE_BITS } from "./file-modes.ts";
import type { ExternalImport } from "./types.ts";
import { filesIn } from "./build-files.ts";
import { jsonRecord } from "./validation.ts";
import { parseSkillFrontmatter } from "./file-validation.ts";
import path from "node:path";

const versionMetadataSchema = z.record(z.string(), z.string());

const CODE = /\.(?:[cm]?[jt]sx?|sh|bash|zsh|fish|py|rb|pl|php|ps1|bat|cmd|exe|dll|so|dylib|wasm)$/i;
const extensions = z.record(z.string(), z.unknown());
const surfaceSchema = z.looseObject({
  extensions: z.optional(extensions),
  hooks: z.optional(z.unknown()),
  mcpServers: z.optional(z.unknown()),
});

/**
Merge an imported version into validated metadata.
@param metadata - Existing metadata to validate, or undefined when absent.
@param version - Imported version that must agree with existing metadata.
@returns Metadata containing the imported version.
*/
function normalizedVersionMetadata(metadata: unknown, version: string) {
  const parsed = metadata === undefined ? {} : versionMetadataSchema.parse(metadata);
  const existingVersion: unknown = Reflect.get(parsed, "version");

  if (existingVersion !== undefined && existingVersion !== version) {
    throw new Error("Imported skill version conflicts with metadata.version");
  }

  return { ...parsed, version };
}

/**
Move a top-level version into serialized skill metadata.
@param source - Complete skill text whose body must remain intact.
@param document - Parsed frontmatter containing the imported version.
@param offset - Position immediately after the original frontmatter.
@param version - Version to preserve in metadata.
@returns The normalized frontmatter followed by the original body.
*/
function serializedImportedVersion(source: string, document: object, offset: number, version: string) {
  const original = jsonRecord.parse(document);
  const metadata = normalizedVersionMetadata(original.metadata, version);
  const normalized = { ...original, metadata };

  Reflect.deleteProperty(normalized, "version");

  return `---\n${Bun.YAML.stringify(normalized, undefined, 2).trimEnd()}\n---` + source.slice(offset);
}

/**
Normalize version metadata in one imported skill.
@param source - Complete imported skill text.
@returns The original text or text with its version moved into metadata.
*/
function normalizeImportedVersion(source: string) {
  const { document, header } = parseSkillFrontmatter(source);
  const version: unknown = Reflect.get(document, "version");

  if (!Object.hasOwn(document, "version")) {
    return source;
  }

  if (typeof version !== "string") {
    throw new TypeError("Imported skill version must be a string");
  }

  return serializedImportedVersion(source, document, header.position.end.offset, version);
}

/**
Normalize version metadata in imported skill files.
@param directory - Imported content root containing the listed files.
@param files - Relative paths available in the imported content.
*/
async function normalizeImportedVersions(directory: string, files: string[]) {
  const skills = files.filter((file) => path.basename(file) === "SKILL.md");

  for (const file of skills) {
    const filename = path.join(directory, file);
    const source = await readFile(filename, "utf8");
    const normalized = normalizeImportedVersion(source);

    if (normalized !== source) {
      await writeFile(filename, normalized);
    }
  }
}

/**
Remove executable local servers and record each omission.
@param servers - Mutable server entries parsed from an MCP configuration.
@param file - Relative configuration path used in omission notes.
@param omitted - Omission notes extended for each removed server.
*/
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

    Reflect.deleteProperty(servers, name);
    omitted.push(`${file}: local MCP ${name}`);
  }
}

/**
Remove local MCP servers unless the import allows them.
@param surface - Mutable manifest or MCP configuration to filter.
@param file - Relative configuration path used to identify its format.
@param entry - Import declaration that controls local MCP permission.
@param omitted - Omission notes extended by removed integrations.
*/
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

/**
Filter executable integrations from one imported manifest surface.
@param surface - Mutable manifest or extension settings to filter.
@param file - Relative configuration path used in omission notes.
@param entry - Import declaration that controls executable integrations.
@param omitted - Omission notes extended by removed integrations.
*/
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

  restrictLocalServers(surface, file, entry, omitted);
}

/**
Apply executable integration restrictions to imported configuration files.
@param directory - Imported content root containing the configurations.
@param entry - Import declaration that supplies integration permissions.
@param files - Available relative paths used to select configurations.
@param omitted - Omission notes extended by filtered configurations.
*/
async function restrictManifests(directory: string, entry: ExternalImport, files: string[], omitted: string[]) {
  const manifests = [
    "plugin.json",
    ".codex-plugin/plugin.json",
    ".claude-plugin/plugin.json",
    ".mcp.json",
    "mcp.json",
  ].filter((file) => files.includes(file));

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

/**
Reject explicitly allowed scripts that do not exist.
@param files - Available relative paths in the imported content.
@param allowed - Allowed script paths or the all-scripts setting.
@param entry - Import declaration named in validation failures.
*/
function validateAllowedScripts(files: string[], allowed: string | string[], entry: ExternalImport) {
  if (Array.isArray(allowed)) {
    for (const file of allowed) {
      if (!files.includes(file)) {
        throw new Error(`${entry.name}: allowed script does not exist: ${file}`);
      }
    }
  }
}

/**
Document omitted components in skills and a package policy file.
@param directory - Imported content root receiving the policy notes.
@param files - Available paths used to find included skills.
@param omitted - Removed components and integrations to describe.
*/
async function writePolicyNotes(directory: string, files: string[], omitted: string[]) {
  const intro =
    "\n\n## Import restrictions\n\n" +
    "This package intentionally omits the following files or executable integrations " +
    "under its imports.toml policy:\n\n";
  const list = omitted
    .toSorted((a, b) => a.localeCompare(b))
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

/**
Filter imported content and normalize skill metadata.
@param directory - Staged imported content to modify.
@param entry - Import declaration that controls retained code and integrations.
*/
export async function applyImportPolicy(directory: string, entry: ExternalImport) {
  const files = await filesIn(directory);
  const allowed = entry.scripts ?? [];

  const omitted: string[] = [];
  const executableCandidates = files.filter(
    (file) => file !== "UPSTREAM-LICENSE" && path.basename(file) !== "SKILL.md"
  );

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
  await normalizeImportedVersions(directory, files);

  if (omitted.length === 0) {
    return;
  }

  await writePolicyNotes(directory, files, omitted);
}
