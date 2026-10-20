import { cp, lstat, mkdir, mkdtemp, readdir, realpath, rm } from "node:fs/promises";
import { readImports, validateMarkers } from "./import-config.ts";
import { EXECUTABLE_BITS } from "./file-modes.ts";
import { applyImportPolicy } from "./import-policy.ts";
import { fileURLToPath } from "node:url";
import { git } from "./git.ts";
import path from "node:path";
import { readFile } from "./io.ts";
import { tmpdir } from "node:os";
const TEXT = "../";
const GIT = ".git";
const SHA256 = "sha256";
const IMPORT_ROOT_IS_A_SYMLINK = "Import root is a symlink";
const HEX = "hex";
const IMPORTS_MUST_RESOLVE_INTO_A_SEPARATE_BUILD = "Imports must resolve into a separate build directory";
const AGENTS_IMPORT = "agents-import-";
const INIT = "init";
const REMOTE = "remote";
const ADD = "add";
const ORIGIN = "origin";
const FETCH = "fetch";
const DEPTH_1 = "--depth=1";
const HEAD_2 = "HEAD";
const CHECKOUT = "checkout";
const DETACH = "--detach";
const FETCH_HEAD_2 = "FETCH_HEAD";
const IMPORT_PATH_TRAVERSES_A_SYMLINK = "Import path traverses a symlink";
const SKILL_2 = "skill";
const SKILL_MD = "SKILL.md";
const INVALID_IMPORT_LICENSE = "Invalid import license";
const CONTENT = "-content";
const UPSTREAM_LICENSE = "UPSTREAM-LICENSE";
const IMPORT = ".import";

const ROOT = fileURLToPath(new URL(TEXT, import.meta.url));

function requireImportRelative(relative: string) {
  if (
    typeof relative !== "string" ||
    !relative ||
    path.isAbsolute(relative) ||
    relative.split(/[\\/]/).some((p) => p === ".." || p === GIT)
  ) {
    const message = `Unsafe import path: ${relative}`;
    throw new Error(message);
  }

  return relative;
}

export function inside(root: string, relative: string) {
  const resolved = path.resolve(root, requireImportRelative(relative));

  if (!resolved.startsWith(path.resolve(root) + path.sep)) {
    const message2 = `Unsafe import path: ${relative}`;
    throw new Error(message2);
  }

  return resolved;
}

export async function digest(directory: string) {
  const hash = new Bun.CryptoHasher(SHA256);

  async function walk(dir: string, prefix = ""): Promise<void> {
    const entries = await readdir(dir);
    const names = entries.toSorted((a, b) => a.localeCompare(b));

    for (const name of names) {
      const file = path.join(dir, name),
        relative = prefix + name;
      const info = await lstat(file);

      if (info.isSymbolicLink()) {
        const message3 = `Import contains symlink: ${relative}`;
        throw new Error(message3);
      }

      if (info.isDirectory()) {
        await walk(file, relative + "/");
      } else if (info.isFile()) {
        const bytes = await readFile(file);
        hash.update(JSON.stringify([relative, Boolean(info.mode & EXECUTABLE_BITS), bytes.length]) + "\n");
        hash.update(bytes);
      } else {
        const message4 = `Unsupported import file: ${relative}`;
        throw new Error(message4);
      }
    }
  }

  const info = await lstat(directory);

  if (info.isSymbolicLink()) {
    throw new Error(IMPORT_ROOT_IS_A_SYMLINK);
  }

  await walk(directory);

  return hash.digest(HEX);
}

async function checkoutImport(checkout: string, entry: Awaited<ReturnType<typeof readImports>>[number]) {
  await mkdir(checkout);
  git(checkout, [INIT, "-q"]);
  git(checkout, [REMOTE, ADD, ORIGIN, entry.repository]);
  git(checkout, [FETCH, DEPTH_1, ORIGIN, entry.ref ?? HEAD_2]);
  git(checkout, [CHECKOUT, DETACH, FETCH_HEAD_2]);

  return entry.path === "." ? checkout : inside(checkout, entry.path);
}

async function validatedLicense(checkout: string, entry: Awaited<ReturnType<typeof readImports>>[number]) {
  const license = inside(checkout, entry.license);
  const licenseInfo = await lstat(license);

  if ((await realpath(license)) !== license || !licenseInfo.isFile()) {
    throw new Error(INVALID_IMPORT_LICENSE);
  }

  return license;
}

async function sourceLicense(source: string, checkout: string, entry: Awaited<ReturnType<typeof readImports>>[number]) {
  if ((await realpath(source)) !== source) {
    throw new Error(IMPORT_PATH_TRAVERSES_A_SYMLINK);
  }

  await rm(path.join(checkout, GIT), { recursive: true, force: true });
  await digest(source);

  if (entry.kind === SKILL_2) {
    await readFile(path.join(source, SKILL_MD));
  }

  return validatedLicense(checkout, entry);
}

async function stageImport(temp: string, entry: Awaited<ReturnType<typeof readImports>>[number]) {
  const checkout = path.join(temp, entry.name);
  const source = await checkoutImport(checkout, entry);
  const license = await sourceLicense(source, checkout, entry);
  const staged = path.join(temp, entry.name + CONTENT);
  await cp(source, staged, { recursive: true });
  await cp(license, path.join(staged, UPSTREAM_LICENSE));
  await applyImportPolicy(staged, entry);
}

async function materializeImports(output: string, entries: Awaited<ReturnType<typeof readImports>>) {
  const destinationRoot = output;
  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), AGENTS_IMPORT));
  const temp = await realpath(temporaryDirectory);

  async function stageAndCopy() {
    for (const entry of entries) {
      await stageImport(temp, entry);
    }

    for (const entry of entries) {
      const target = inside(destinationRoot, entry.destination);
      await mkdir(path.dirname(target), { recursive: true });
      await rm(target, { recursive: true, force: true });
      await cp(path.join(temp, entry.name + CONTENT), target, {
        recursive: true,
      });
      await rm(target + IMPORT, { force: true });
    }
  }

  try {
    await stageAndCopy();
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}

function requireImportOutput(root: string, output: string | undefined) {
  if (!output || path.resolve(output) === root) {
    throw new Error(IMPORTS_MUST_RESOLVE_INTO_A_SEPARATE_BUILD);
  }

  return output;
}

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
