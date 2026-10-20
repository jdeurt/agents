import * as values from "./build-files-values.ts";
import { lstat, readdir, realpath, rmdir, stat } from "node:fs/promises";
import type { Dirent } from "node:fs";
import path from "node:path";

export { validateRegistry } from "./build-registry.ts";

const SOURCE_EXCLUSIONS: string[] = [];

export function marketplaceSourceFilter(pluginsRoot: string) {
  const isExcluded = (filename: string) => {
    const relative = path.relative(pluginsRoot, filename).split(path.sep).join("/");

    return SOURCE_EXCLUSIONS.some((directory) => relative === directory || relative.startsWith(`${directory}/`));
  };

  return async (filename: string) => !isExcluded(filename) && !isExcluded(await realpath(filename));
}

function requireSafeRelative(relative: string) {
  if (typeof relative !== "string" || path.isAbsolute(relative) || relative.split(/[\\/]/).includes("..")) {
    const message = `Unsafe generated path: ${relative}`;
    throw new Error(message);
  }

  return relative;
}

export function inside(root: string, relative: string) {
  const resolved = path.resolve(root, requireSafeRelative(relative));

  if (resolved === root || !resolved.startsWith(`${root}${path.sep}`)) {
    const message = `Unsafe generated path: ${relative}`;
    throw new Error(message);
  }

  return resolved;
}

async function checkedDirectoryPath(directory: string, linksWithin: string | undefined) {
  const info = await lstat(directory);

  if (!linksWithin && info.isSymbolicLink()) {
    const message6 = `Symbolic links are not supported: ${directory}`;
    throw new Error(message6);
  }

  return realpath(directory);
}

async function readDirectory(directory: string, linksWithin: string | undefined, parents: Set<string>) {
  const resolved = await checkedDirectoryPath(directory, linksWithin);

  if (linksWithin && resolved !== linksWithin && !resolved.startsWith(`${linksWithin}${path.sep}`)) {
    const message7 = `Source resource leaves the plugin sources: ${directory}`;
    throw new Error(message7);
  }

  if (parents.has(resolved)) {
    const message8 = `Source resources contain a symlink cycle: ${directory}`;
    throw new Error(message8);
  }

  return { entries: await readdir(directory, { withFileTypes: true }), parents: new Set([...parents, resolved]) };
}

async function containedLinkPath(filename: string, linksWithin: string) {
  const resolved = await realpath(filename);

  if (!resolved.startsWith(`${linksWithin}${path.sep}`)) {
    const message = `Source resource leaves the plugin sources: ${filename}`;
    throw new Error(message);
  }

  return resolved;
}

async function checkedLinkPath(filename: string, linksWithin: string | undefined) {
  if (!linksWithin) {
    const message = `Symbolic links are not supported: ${filename}`;
    throw new Error(message);
  }

  return containedLinkPath(filename, linksWithin);
}

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

    for (const entry of entries) {
      const relative = path.posix.join(scanPrefix, entry.name);
      const filename = path.join(scanDirectory, entry.name);

      if (scanShouldInclude && !(await scanShouldInclude(filename))) {
        continue;
      }

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

    return files;
  }

  let scanned: Awaited<ReturnType<typeof readDirectory>>;

  try {
    scanned = await readDirectory(directory, linksWithin, parents);
  } catch (error) {
    if (
      error instanceof Error &&
      Reflect.has(error, values.CODE) &&
      Reflect.get(error, values.CODE) === values.FILE_NOT_FOUND
    ) {
      return [];
    }

    throw error;
  }

  return scannedFiles(directory, prefix, linksWithin, shouldInclude, scanned);
}

function symbolicLinkError(directory: string) {
  const message = `Symbolic links are not supported: ${directory}`;

  return new Error(message);
}

async function requireNonSymlink(directory: string) {
  const info = await lstat(directory);

  if (info.isSymbolicLink()) {
    throw symbolicLinkError(directory);
  }
}

export async function checkOutputParents(root: string, relative: string) {
  let directory = path.dirname(inside(root, relative));

  while (directory !== root) {
    try {
      await requireNonSymlink(directory);
    } catch (error) {
      if (!(
        error instanceof Error &&
        Reflect.has(error, values.CODE) &&
        Reflect.get(error, values.CODE) === values.FILE_NOT_FOUND
      )) {
        throw error;
      }
    }

    directory = path.dirname(directory);
  }
}

async function removeEmptyDirectory(directory: string) {
  const resolvedValue3 = await readdir(directory);

  if (resolvedValue3.length === 0) {
    await rmdir(directory);
  }
}

export async function pruneEmptyDirectories(directory: string): Promise<void> {
  let entries: Dirent[];

  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (
      error instanceof Error &&
      Reflect.has(error, values.CODE) &&
      Reflect.get(error, values.CODE) === values.FILE_NOT_FOUND
    ) {
      return;
    }

    throw error;
  }

  for (const entry of entries) {
    if (entry.isSymbolicLink()) {
      const message12 = `Symbolic links are not supported: ${path.join(directory, entry.name)}`;
      throw new Error(message12);
    }

    if (entry.isDirectory()) {
      await pruneEmptyDirectories(path.join(directory, entry.name));
    }
  }

  await removeEmptyDirectory(directory);
}
