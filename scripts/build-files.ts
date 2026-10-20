import { lstat, readdir, realpath, rmdir, stat } from "node:fs/promises";
import type { Dirent } from "node:fs";
import path from "node:path";

export { validateRegistry } from "./build-registry.ts";

const SOURCE_EXCLUSIONS: string[] = [];

/**
Create a filter that excludes restricted source paths and their link targets.
@param pluginsRoot - Root directory for source exclusion checks.
@returns An asynchronous predicate that accepts source paths allowed for publication.
*/
export function marketplaceSourceFilter(pluginsRoot: string) {
  const isExcluded = (filename: string) => {
    const relative = path.relative(pluginsRoot, filename).split(path.sep).join("/");

    return SOURCE_EXCLUSIONS.some((directory) => relative === directory || relative.startsWith(`${directory}/`));
  };

  return async (filename: string) => !isExcluded(filename) && !isExcluded(await realpath(filename));
}

/**
Reject absolute paths and parent traversal before output path resolution.
@param relative - Generated path relative to the output root.
@returns The validated relative path.
*/
function requireSafeRelative(relative: string) {
  if (typeof relative !== "string" || path.isAbsolute(relative) || relative.split(/[\\/]/).includes("..")) {
    throw new Error(`Unsafe generated path: ${relative}`);
  }

  return relative;
}

/**
Resolve a generated path and reject paths outside its root.
@param root - Absolute root directory that must contain the result.
@param relative - Generated path relative to that root.
@returns The absolute path inside the root.
*/
export function inside(root: string, relative: string) {
  const resolved = path.resolve(root, requireSafeRelative(relative));

  if (resolved === root || !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Unsafe generated path: ${relative}`);
  }

  return resolved;
}

/**
Resolve a source directory after checking the symbolic link policy.
@param directory - Directory to inspect.
@param linksWithin - Permitted source root, or undefined to reject symbolic links.
@returns The resolved directory path.
*/
async function checkedDirectoryPath(directory: string, linksWithin: string | undefined) {
  const info = await lstat(directory);

  if (!linksWithin && info.isSymbolicLink()) {
    throw new Error(`Symbolic links are not supported: ${directory}`);
  }

  return realpath(directory);
}

/**
Read source entries after checking containment and symbolic link cycles.
@param directory - Source directory to read.
@param linksWithin - Permitted source root, or undefined to reject symbolic links.
@param parents - Resolved ancestor paths used to detect cycles.
@returns The directory entries and the ancestor set extended with this directory.
*/
async function readDirectory(directory: string, linksWithin: string | undefined, parents: Set<string>) {
  const resolved = await checkedDirectoryPath(directory, linksWithin);

  if (linksWithin && resolved !== linksWithin && !resolved.startsWith(`${linksWithin}${path.sep}`)) {
    throw new Error(`Source resource leaves the plugin sources: ${directory}`);
  }

  if (parents.has(resolved)) {
    throw new Error(`Source resources contain a symlink cycle: ${directory}`);
  }

  return { entries: await readdir(directory, { withFileTypes: true }), parents: new Set([...parents, resolved]) };
}

/**
Resolve a symbolic link and reject targets outside the permitted source root.
@param filename - Symbolic link to resolve.
@param linksWithin - Root directory that must contain the link target.
@returns The resolved target path.
*/
async function containedLinkPath(filename: string, linksWithin: string) {
  const resolved = await realpath(filename);

  if (!resolved.startsWith(`${linksWithin}${path.sep}`)) {
    throw new Error(`Source resource leaves the plugin sources: ${filename}`);
  }

  return resolved;
}

/**
Reject prohibited symbolic links before resolving their contained targets.
@param filename - Symbolic link to inspect.
@param linksWithin - Permitted source root, or undefined to reject the link.
@returns The resolved target path inside the permitted root.
*/
async function checkedLinkPath(filename: string, linksWithin: string | undefined) {
  if (!linksWithin) {
    throw new Error(`Symbolic links are not supported: ${filename}`);
  }

  return containedLinkPath(filename, linksWithin);
}

/**
List source files in stable order while checking links and optional exclusions.
@param directory - Source directory to scan.
@param prefix - Relative prefix to attach to returned paths.
@param linksWithin - Permitted source root, or undefined to reject symbolic links.
@param parents - Resolved ancestor paths used to detect cycles.
@param shouldInclude - Optional asynchronous predicate that filters source paths.
@returns The relative file paths, or an empty list when the directory does not exist.
*/
export async function filesIn(
  directory: string,
  prefix = "",
  linksWithin?: string,
  parents = new Set<string>(),
  shouldInclude?: (filename: string) => Promise<boolean>
): Promise<string[]> {
  async function scannedFiles(
    scanDirectory: string,
    scanPrefix: string,
    scanLinksWithin: string | undefined,
    scanShouldInclude: ((filename: string) => Promise<boolean>) | undefined,
    scanned: Awaited<ReturnType<typeof readDirectory>>
  ): Promise<string[]> {
    const files: string[] = [];

    const entries = scanned.entries.toSorted((a, b) => a.name.localeCompare(b.name));

    async function appendIncludedEntry(entry: Dirent, filename: string, relative: string) {
      let info: Pick<typeof entry, "isDirectory" | "isFile"> = entry;

      if (entry.isSymbolicLink()) {
        const resolved = await checkedLinkPath(filename, scanLinksWithin);

        info = await stat(resolved);
      }

      if (info.isDirectory()) {
        files.push(...(await filesIn(filename, relative, scanLinksWithin, scanned.parents, scanShouldInclude)));
      } else if (info.isFile()) {
        files.push(relative);
      }
    }

    for (const entry of entries) {
      const relative = path.posix.join(scanPrefix, entry.name);
      const filename = path.join(scanDirectory, entry.name);

      if (scanShouldInclude && !(await scanShouldInclude(filename))) {
        continue;
      }

      await appendIncludedEntry(entry, filename, relative);
    }

    return files;
  }

  let scanned: Awaited<ReturnType<typeof readDirectory>>;

  try {
    scanned = await readDirectory(directory, linksWithin, parents);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return [];
    }

    throw error;
  }

  return scannedFiles(directory, prefix, linksWithin, shouldInclude, scanned);
}

/**
Reject a directory when it is a symbolic link.
@param directory - Output parent directory to inspect.
*/
async function requireNonSymlink(directory: string) {
  const info = await lstat(directory);

  if (info.isSymbolicLink()) {
    throw new Error(`Symbolic links are not supported: ${directory}`);
  }
}

/**
Reject symbolic links in existing parents of a generated output path.
@param root - Output root that contains the generated path.
@param relative - Generated path whose parent directories must be checked.
*/
export async function checkOutputParents(root: string, relative: string) {
  let directory = path.dirname(inside(root, relative));

  while (directory !== root) {
    try {
      await requireNonSymlink(directory);
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) {
        throw error;
      }
    }

    directory = path.dirname(directory);
  }
}

/**
Remove a directory if its current contents are empty.
@param directory - Directory to read again before removal.
*/
async function removeEmptyDirectory(directory: string) {
  const resolvedValue3 = await readdir(directory);

  if (resolvedValue3.length === 0) {
    await rmdir(directory);
  }
}

/**
Remove empty descendant directories while rejecting symbolic links.
@param directory - Root directory to prune, if it exists.
*/
export async function pruneEmptyDirectories(directory: string): Promise<void> {
  let entries: Dirent[];

  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return;
    }

    throw error;
  }

  for (const entry of entries) {
    if (entry.isSymbolicLink()) {
      throw new Error(`Symbolic links are not supported: ${path.join(directory, entry.name)}`);
    }

    if (entry.isDirectory()) {
      await pruneEmptyDirectories(path.join(directory, entry.name));
    }
  }

  await removeEmptyDirectory(directory);
}
