import { cp, lstat, mkdir, mkdtemp, readdir, realpath, rm } from "node:fs/promises";
import { readImports, validateMarkers } from "./import-config.ts";
import { EXECUTABLE_BITS } from "./file-modes.ts";
import { applyImportPolicy } from "./import-policy.ts";
import { fileURLToPath } from "node:url";
import { git } from "./git.ts";
import path from "node:path";
import { readFile } from "./io.ts";
import { tmpdir } from "node:os";

const ROOT = fileURLToPath(new URL("../", import.meta.url));

/**
Reject absolute paths and unsafe import path segments.
@param relative - Candidate path relative to an import root.
@returns The accepted relative path.
*/
function requireImportRelative(relative: string) {
  if (
    typeof relative !== "string" ||
    !relative ||
    path.isAbsolute(relative) ||
    relative.split(/[\\/]/).some((p) => p === ".." || p === ".git")
  ) {
    throw new Error(`Unsafe import path: ${relative}`);
  }

  return relative;
}

/**
Resolve an import path while keeping it below its root.
@param root - Directory that must contain the resolved path.
@param relative - Candidate relative import path.
@returns The absolute path contained below the root.
*/
export function inside(root: string, relative: string) {
  const resolved = path.resolve(root, requireImportRelative(relative));

  if (!resolved.startsWith(path.resolve(root) + path.sep)) {
    throw new Error(`Unsafe import path: ${relative}`);
  }

  return resolved;
}

/**
Hash file paths, executable flags, and bytes in a symlink-free tree.
@param directory - Content tree to validate and hash.
@returns The hexadecimal SHA-256 content digest.
*/
export async function digest(directory: string) {
  const hash = new Bun.CryptoHasher("sha256");

  async function walk(dir: string, prefix = ""): Promise<void> {
    const entries = await readdir(dir);
    const names = entries.toSorted((a, b) => a.localeCompare(b));

    for (const name of names) {
      const file = path.join(dir, name),
        relative = prefix + name;
      const info = await lstat(file);

      if (info.isSymbolicLink()) {
        throw new Error(`Import contains symlink: ${relative}`);
      }

      if (info.isDirectory()) {
        await walk(file, relative + "/");
      } else if (info.isFile()) {
        const bytes = await readFile(file);

        hash.update(JSON.stringify([relative, Boolean(info.mode & EXECUTABLE_BITS), bytes.length]) + "\n");
        hash.update(bytes);
      } else {
        throw new Error(`Unsupported import file: ${relative}`);
      }
    }
  }

  const info = await lstat(directory);

  if (info.isSymbolicLink()) {
    throw new Error("Import root is a symlink");
  }

  await walk(directory);

  return hash.digest("hex");
}

/**
Fetch an import revision and select its source directory.
@param checkout - New temporary directory for the repository checkout.
@param entry - Declaration that selects the repository, revision, and path.
@returns The checked-out directory selected by the declaration.
*/
async function checkoutImport(checkout: string, entry: Awaited<ReturnType<typeof readImports>>[number]) {
  await mkdir(checkout);
  git(checkout, ["init", "-q"]);
  git(checkout, ["remote", "add", "origin", entry.repository]);
  git(checkout, ["fetch", "--depth=1", "origin", entry.ref ?? "HEAD"]);
  git(checkout, ["checkout", "--detach", "FETCH_HEAD"]);

  return entry.path === "." ? checkout : inside(checkout, entry.path);
}

/**
Require a regular license file without symlink traversal.
@param checkout - Repository checkout containing the declared license.
@param entry - Declaration that supplies the relative license path.
@returns The absolute path to the validated license file.
*/
async function validatedLicense(checkout: string, entry: Awaited<ReturnType<typeof readImports>>[number]) {
  const license = inside(checkout, entry.license);
  const licenseInfo = await lstat(license);

  if ((await realpath(license)) !== license || !licenseInfo.isFile()) {
    throw new Error("Invalid import license");
  }

  return license;
}

/**
Validate imported source content and locate its license.
@param source - Selected source directory within the checkout.
@param checkout - Repository checkout whose Git metadata will be removed.
@param entry - Declaration used to validate skill content and license paths.
@returns The absolute path to the validated license file.
*/
async function sourceLicense(source: string, checkout: string, entry: Awaited<ReturnType<typeof readImports>>[number]) {
  if ((await realpath(source)) !== source) {
    throw new Error("Import path traverses a symlink");
  }

  await rm(path.join(checkout, ".git"), { recursive: true, force: true });
  await digest(source);

  if (entry.kind === "skill") {
    await readFile(path.join(source, "SKILL.md"));
  }

  return validatedLicense(checkout, entry);
}

/**
Copy one validated import into filtered temporary content.
@param temp - Temporary root for checkout and staged content.
@param entry - Import declaration to fetch, validate, and filter.
*/
async function stageImport(temp: string, entry: Awaited<ReturnType<typeof readImports>>[number]) {
  const checkout = path.join(temp, entry.name);
  const source = await checkoutImport(checkout, entry);
  const license = await sourceLicense(source, checkout, entry);
  const staged = path.join(temp, entry.name + "-content");

  await cp(source, staged, { recursive: true });
  await cp(license, path.join(staged, "UPSTREAM-LICENSE"));
  await applyImportPolicy(staged, entry);
}

/**
Resolve imports and replace markers with staged content.
@param output - Separate build root receiving imported directories.
@param entries - Validated imports to materialize in the build root.
*/
async function materializeImports(output: string, entries: Awaited<ReturnType<typeof readImports>>) {
  const destinationRoot = output;
  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), "agents-import-"));
  const temp = await realpath(temporaryDirectory);

  async function stageAndCopy() {
    for (const entry of entries) {
      await stageImport(temp, entry);
    }

    for (const entry of entries) {
      const target = inside(destinationRoot, entry.destination);

      await mkdir(path.dirname(target), { recursive: true });
      await rm(target, { recursive: true, force: true });
      await cp(path.join(temp, entry.name + "-content"), target, {
        recursive: true,
      });
      await rm(target + ".import", { force: true });
    }
  }

  try {
    await stageAndCopy();
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}

/**
Require a build destination separate from the authored repository.
@param root - Authored repository root that must remain unchanged.
@param output - Requested build destination, if supplied.
@returns The accepted build destination.
*/
function requireImportOutput(root: string, output: string | undefined) {
  if (!output || path.resolve(output) === root) {
    throw new Error("Imports must resolve into a separate build directory");
  }

  return output;
}

/**
Validate import declarations and optionally materialize their content.
@param options - Repository root, separate output directory, and validation-only flag.
*/
export async function syncImports({
  root = ROOT,
  output,
  check = false,
}: { root?: string; output?: string; check?: boolean } = {}) {
  const resolvedRoot = await realpath(root);
  const entries = await readImports(resolvedRoot);

  await validateMarkers(resolvedRoot, entries);

  if (check) {
    return;
  }

  await materializeImports(requireImportOutput(resolvedRoot, output), entries);
}
