import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
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
  const config = existsSync(sourceConfig) ? sourceConfig : packagedConfig;
  const packagedPrettier = new URL("../prettier.config.mjs", import.meta.url);
  const sourcePrettier = new URL("../../../prettier.config.mjs", import.meta.url);
  const prettier = existsSync(sourcePrettier) ? sourcePrettier : packagedPrettier;
  const scripts = ["post-edit-core.ts", "post-edit-lint.ts", "post-edit-deps.ts"];
  const hash = createHash("sha256")
    .update(await readFile(manifest))
    .update(await readFile(lock))
    .update(await readFile(config))
    .update(await readFile(prettier));
  for (const name of scripts) hash.update(await readFile(new URL(name, import.meta.url)));
  const key = hash.digest("hex").slice(0, 16);
  const root = path.join(base, "jdeurt-engineering", key);
  if (existsSync(path.join(root, ".ready"))) return root;
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
    await cp(prettier, path.join(root, "prettier.config.mjs"));
    await mkdir(path.join(root, "scripts"), { recursive: true });
    for (const name of scripts) await cp(new URL(name, import.meta.url), path.join(root, "scripts", name));
    const result = spawnSync(process.execPath, ["install", "--frozen-lockfile", "--ignore-scripts"], {
      cwd: root,
      timeout: 15_000,
      encoding: "utf8",
      maxBuffer: 16_000,
    });
    if (result.status !== 0 || !existsSync(path.join(root, "node_modules", "eslint", "package.json"))) {
      const reason = result.stderr.length > 0 ? result.stderr : result.error?.message ?? "unknown error";
      throw new Error(`Private Bun dependency install failed: ${reason.slice(0, 180)}`);
    }
    await writeFile(path.join(root, ".ready"), "ok\n");
    return root;
  } finally {
    await rm(gate, { recursive: true, force: true });
  }
}
