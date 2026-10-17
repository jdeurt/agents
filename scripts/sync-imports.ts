import { applyImportPolicy } from "./import-policy.ts";
import { readFile } from "./io.ts";
import { readImports, validateMarkers } from "./import-config.ts";
import { git } from "./git.ts";

import {
  cp,
  mkdir,
  mkdtemp,
  readdir,
  lstat,
  realpath,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
export function inside(root, relative) {
  if (
    typeof relative !== "string" ||
    !relative ||
    path.isAbsolute(relative) ||
    relative.split(/[\\/]/).some((p) => p === ".." || p === ".git")
  )
    throw new Error(`Unsafe import path: ${relative}`);
  const resolved = path.resolve(root, relative);
  if (!resolved.startsWith(path.resolve(root) + path.sep))
    throw new Error(`Unsafe import path: ${relative}`);
  return resolved;
}
export async function digest(directory) {
  const hash = new Bun.CryptoHasher("sha256");
  async function walk(dir, prefix = "") {
    const resolvedValue1 = await readdir(dir);
    for (const name of resolvedValue1.sort()) {
      const file = path.join(dir, name),
        relative = prefix + name;
      const info = await lstat(file);
      if (info.isSymbolicLink())
        throw new Error(`Import contains symlink: ${relative}`);
      if (info.isDirectory()) await walk(file, relative + "/");
      else if (info.isFile()) {
        const bytes = await readFile(file);
        hash.update(
          JSON.stringify([relative, Boolean(info.mode & 0o111), bytes.length]) +
            "\n"
        );
        hash.update(bytes);
      } else throw new Error(`Unsupported import file: ${relative}`);
    }
  }
  const info = await lstat(directory);
  if (info.isSymbolicLink()) throw new Error("Import root is a symlink");
  await walk(directory);
  return hash.digest("hex");
}
export async function syncImports({
  root = ROOT,
  output,
  check = false,
}: { root?: string; output?: string; check?: boolean } = {}) {
  root = await realpath(root);
  const entries = await readImports(root);
  await validateMarkers(root, entries);
  if (check) return;
  if (!output || path.resolve(output) === root)
    throw new Error("Imports must resolve into a separate build directory");
  const temp = await realpath(
    await mkdtemp(path.join(tmpdir(), "agents-import-"))
  );
  try {
    for (const entry of entries) {
      const checkout = path.join(temp, entry.name);
      await mkdir(checkout);
      git(checkout, ["init", "-q"]);
      git(checkout, ["remote", "add", "origin", entry.repository]);
      git(checkout, ["fetch", "--depth=1", "origin", entry.ref ?? "HEAD"]);
      git(checkout, ["checkout", "--detach", "FETCH_HEAD"]);
      const source =
        entry.path === "." ? checkout : inside(checkout, entry.path);
      if ((await realpath(source)) !== source)
        throw new Error("Import path traverses a symlink");
      await rm(path.join(checkout, ".git"), { recursive: true, force: true });
      await digest(source);
      if (entry.kind === "skill") await readFile(path.join(source, "SKILL.md"));
      const license = inside(checkout, entry.license);
      const licenseInfo = await lstat(license);
      if ((await realpath(license)) !== license || !licenseInfo.isFile())
        throw new Error("Invalid import license");
      const staged = path.join(temp, entry.name + "-content");
      await cp(source, staged, { recursive: true });
      await cp(license, path.join(staged, "UPSTREAM-LICENSE"));
      await applyImportPolicy(staged, entry);
    }
    for (const entry of entries) {
      const target = inside(output, entry.destination);
      await mkdir(path.dirname(target), { recursive: true });
      await rm(target, { recursive: true, force: true });
      await cp(path.join(temp, entry.name + "-content"), target, {
        recursive: true,
      });
      await rm(target + ".import", { force: true });
    }
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}
