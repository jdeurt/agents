import { realpath, stat } from "node:fs/promises";
import path from "node:path";

/**
Compare authored and built plugin identities without guessing another namespace.
@param directory - Plugin directory name.
@param identifier - Plugin part of a skill identifier.
@returns Whether the directory represents that plugin.
*/
function isPluginMatch(directory: string, identifier: string) {
  return directory === identifier || `jdeurt-${directory}` === identifier;
}

/**
Read the type of an existing candidate directory.
@param directory - Candidate directory path.
@returns Whether filesystem metadata identifies a directory.
*/
async function isDirectory(directory: string) {
  const info = await stat(directory);

  return info.isDirectory();
}

/**
Check a possible local skills directory without treating absent plugins as installed.
@param directory - Candidate plugin skills directory.
@returns Whether the path is an existing directory.
*/
async function isExistingDirectory(directory: string) {
  try {
    return await isDirectory(directory);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return false;
    }

    throw error;
  }
}

/**
Resolve a regular file while retaining the bundle's physical boundary.
@param filename - Expected local file.
@param root - Canonical bundle root.
@returns The canonical regular-file path.
*/
export async function containedFile(filename: string, root: string) {
  const canonical = await realpath(filename);
  const info = await stat(canonical);

  if (!canonical.startsWith(`${root}${path.sep}`) || !info.isFile()) {
    throw new Error(`Resource leaves bundle root: ${filename}`);
  }

  return canonical;
}

/**
Locate an exact local plugin before resolving its skill entry.
@param plugin - Declared namespace.
@param name - Declared skill name.
@param root - Known bundle root.
@returns The canonical contained entry, or undefined for an unavailable plugin namespace.
*/
async function locateSkill(plugin: string, name: string, root: string) {
  const sourceName = plugin.startsWith("jdeurt-") ? plugin.slice("jdeurt-".length) : plugin;
  const candidates = [path.join(root, plugin, "skills"), path.join(root, sourceName, "skills")];

  if (path.basename(root) === "skills" && isPluginMatch(path.basename(path.dirname(root)), plugin)) {
    return containedFile(path.join(root, name, "SKILL.md"), root);
  }

  if (isPluginMatch(path.basename(root), plugin)) {
    return containedFile(path.join(root, "skills", name, "SKILL.md"), root);
  }

  for (const candidate of candidates) {
    if (await Bun.file(path.join(candidate, name, "SKILL.md")).exists()) {
      return containedFile(path.join(candidate, name, "SKILL.md"), root);
    }

    if (await isExistingDirectory(candidate)) {
      throw new Error(`Missing local skill: ${plugin}:${name}`);
    }
  }

  return;
}

/**
Resolve a skill identifier within a known local plugin or plugin collection.
@param identifier - Plugin and skill separated by one colon.
@param root - Canonical root supplied to validation.
@returns A canonical skill entry, or undefined when this root cannot resolve that plugin.
*/
export async function resolveSkillTarget(identifier: string, root: string) {
  const [plugin, name] = identifier.split(":", 2);

  if (!plugin || !name) {
    throw new Error(`Invalid skill identifier: ${identifier}`);
  }

  return locateSkill(plugin, name, root);
}
