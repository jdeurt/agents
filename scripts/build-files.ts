import { lstat, readdir, realpath, rmdir, stat } from "node:fs/promises";
import path from "node:path";
import type { Dirent } from "node:fs";
import type { Registry } from "./types.ts";
const HARNESSES = new Set(["claude", "codex"]);
const NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const SOURCE_EXCLUSIONS: string[] = [];
export function marketplaceSourceFilter(pluginsRoot: string) {
  const excluded = (filename: string) => {
    const relative = path.relative(pluginsRoot, filename).split(path.sep).join("/");
    return SOURCE_EXCLUSIONS.some((directory) => relative === directory || relative.startsWith(`${directory}/`));
  };
  return async (filename: string) => !excluded(filename) && !excluded(await realpath(filename));
}

function requireText(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} must be a non-empty string`);
}

function fields(value: unknown, allowed: string[], label: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be a table`);
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) throw new Error(`${label}: unknown field ${key}`);
  }
}

export function inside(root: string, relative: string) {
  if (typeof relative !== "string" || path.isAbsolute(relative) || relative.split(/[\\/]/).includes("..")) {
    throw new Error(`Unsafe generated path: ${relative}`);
  }
  const resolved = path.resolve(root, relative);
  if (resolved === root || !resolved.startsWith(`${root}${path.sep}`))
    throw new Error(`Unsafe generated path: ${relative}`);
  return resolved;
}

export async function filesIn(
  directory: string,
  prefix = "",
  linksWithin?: string,
  parents = new Set<string>(),
  filter?: (filename: string) => Promise<boolean>
): Promise<string[]> {
  let entries: Dirent[];
  try {
    const resolvedValue1 = await lstat(directory);
    if (resolvedValue1.isSymbolicLink() && !linksWithin)
      throw new Error(`Symbolic links are not supported: ${directory}`);
    const resolved = await realpath(directory);
    if (linksWithin && resolved !== linksWithin && !resolved.startsWith(`${linksWithin}${path.sep}`)) {
      throw new Error(`Source resource leaves the plugin sources: ${directory}`);
    }
    if (parents.has(resolved)) throw new Error(`Source resources contain a symlink cycle: ${directory}`);
    parents = new Set([...parents, resolved]);
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return [];
    throw error;
  }
  const files: string[] = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const relative = path.posix.join(prefix, entry.name);
    const filename = path.join(directory, entry.name);
    if (filter && !(await filter(filename))) continue;
    let info: Pick<typeof entry, "isDirectory" | "isFile"> = entry;
    if (entry.isSymbolicLink()) {
      if (!linksWithin) throw new Error(`Symbolic links are not supported: ${filename}`);
      const resolved = await realpath(filename);
      if (!resolved.startsWith(`${linksWithin}${path.sep}`))
        throw new Error(`Source resource leaves the plugin sources: ${filename}`);
      info = await stat(resolved);
    }
    if (info.isDirectory()) files.push(...(await filesIn(filename, relative, linksWithin, parents, filter)));
    else if (info.isFile()) files.push(relative);
  }
  return files;
}

export async function checkOutputParents(root: string, relative: string) {
  let directory = path.dirname(inside(root, relative));
  while (directory !== root) {
    try {
      const resolvedValue2 = await lstat(directory);
      if (resolvedValue2.isSymbolicLink()) throw new Error(`Symbolic links are not supported: ${directory}`);
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
    }
    directory = path.dirname(directory);
  }
}

export async function pruneEmptyDirectories(directory: string): Promise<void> {
  let entries: Dirent[];
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return;
    throw error;
  }
  for (const entry of entries) {
    if (entry.isSymbolicLink())
      throw new Error(`Symbolic links are not supported: ${path.join(directory, entry.name)}`);
    if (entry.isDirectory()) await pruneEmptyDirectories(path.join(directory, entry.name));
  }
  const resolvedValue3 = await readdir(directory);
  if (resolvedValue3.length === 0) await rmdir(directory);
}

export function validateRegistry(registry: Registry) {
  fields(registry, ["marketplace", "plugins"], "registry");
  fields(registry.marketplace, ["name", "display_name", "owner", "description"], "marketplace");
  const marketplace = registry.marketplace;
  for (const key of ["name", "owner", "description"]) requireText(marketplace[key], `marketplace.${key}`);
  if (marketplace.display_name !== undefined) requireText(marketplace.display_name, "marketplace.display_name");
  if (!NAME.test(marketplace.name)) throw new Error("marketplace.name must use lowercase kebab-case");
  if (!Array.isArray(registry.plugins)) throw new Error("plugins must be an array");
  const names = new Set();
  for (const plugin of registry.plugins) {
    fields(
      plugin,
      [
        "name",
        "version",
        "description",
        "harnesses",
        "category",
        "authentication",
        "soubi",
        "native",
        "author",
        "license",
      ],
      "plugin"
    );
    for (const key of ["name", "version", "description", "category"]) requireText(plugin[key], `plugin.${key}`);
    if (!NAME.test(plugin.name)) throw new Error(`Invalid plugin name: ${plugin.name}`);
    if (names.has(plugin.name)) throw new Error(`Duplicate plugin: ${plugin.name}`);
    names.add(plugin.name);
    if (!VERSION.test(plugin.version)) throw new Error(`Invalid version for ${plugin.name}: ${plugin.version}`);
    if (plugin.authentication !== undefined && !["on-install", "on-use"].includes(plugin.authentication)) {
      throw new Error(`${plugin.name}: authentication must be on-install or on-use`);
    }
    if (
      !Array.isArray(plugin.harnesses) ||
      plugin.harnesses.length === 0 ||
      new Set(plugin.harnesses).size !== plugin.harnesses.length
    ) {
      throw new Error(`${plugin.name}: harnesses must be a non-empty array without duplicates`);
    }
    for (const harness of plugin.harnesses) {
      if (!HARNESSES.has(harness)) throw new Error(`${plugin.name}: unsupported harness ${harness}`);
    }
    for (const key of ["author", "license"]) if (plugin[key] !== undefined) requireText(plugin[key], `plugin.${key}`);
    if (plugin.soubi) fields(plugin.soubi, ["mcpServers", "assets", "harnessDefaults"], `${plugin.name}.soubi`);
  }
}
