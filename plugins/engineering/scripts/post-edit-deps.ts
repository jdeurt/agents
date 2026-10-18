import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, mkdir, readFile, rm } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packaged = new URL("../hook-deps/package.json", import.meta.url);
const source = fileURLToPath(new URL("../../../", import.meta.url));

// Install into a private cache, never into the edited project or plugin package.
export async function dependencyRoot() {
  if (process.env.JDEURT_HOOK_DEPS_ROOT) return path.resolve(process.env.JDEURT_HOOK_DEPS_ROOT);
  if (!existsSync(packaged)) return source;
  const base = process.env.XDG_CACHE_HOME ?? path.join(homedir(), ".cache");
  const manifest = fileURLToPath(packaged);
  const lock = path.join(path.dirname(manifest), "bun.lock");
  const packagedConfig = new URL("../eslint.config.ts", import.meta.url);
  const sourceConfig = new URL("../../../eslint.config.ts", import.meta.url);
  const config = existsSync(packagedConfig) ? packagedConfig : sourceConfig;
  const hash = createHash("sha256")
    .update(await readFile(manifest))
    .update(await readFile(lock))
    .update(await readFile(config))
    .digest("hex")
    .slice(0, 16);
  const root = path.join(base, "jdeurt-engineering", hash);
  if (existsSync(path.join(root, "node_modules", "eslint", "package.json"))) return root;
  await mkdir(root, { recursive: true });
  const gate = path.join(root, ".installing");
  try {
    await mkdir(gate);
  } catch {
    throw new Error("Hook dependencies are being installed; retry after the next edit");
  }
  try {
    await cp(manifest, path.join(root, "package.json"));
    await cp(lock, path.join(root, "bun.lock"));
    await cp(config, path.join(root, "eslint.config.ts"));
    const result = spawnSync(process.execPath, ["install", "--frozen-lockfile", "--ignore-scripts"], {
      cwd: root,
      timeout: 15_000,
      encoding: "utf8",
      maxBuffer: 16_000,
    });
    if (result.status !== 0 || !existsSync(path.join(root, "node_modules", "eslint", "package.json")))
      throw new Error(`Private Bun dependency install failed: ${(result.stderr || result.error || "unknown error").toString().slice(0, 180)}`);
    return root;
  } finally {
    await rm(gate, { recursive: true, force: true });
  }
}

export function configPath(root: string) {
  return path.join(root, "eslint.config.ts");
}
