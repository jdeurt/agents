import path from "node:path";
import { readFile, writeFile } from "./io.ts";
import { filesIn } from "./build-files.ts";
import { digest } from "./sync-imports.ts";
import type { Registry } from "./types.ts";
import * as z from "zod/mini";
import { jsonRecord } from "./validation.ts";

export type ReleaseState = Record<string, { hash: string; version: string } | undefined>;
export const releaseStateSchema = z.record(z.string(), z.object({ hash: z.string(), version: z.string() }));
export function nextVersion(base: string, previous?: string) {
  if (!/^\d+\.\d+\.\d+$/.test(base) || (previous && !/^\d+\.\d+\.\d+$/.test(previous)))
    throw new Error("Publication requires plain semantic versions");
  if (!previous) return base;
  const a = base.split(".").map(Number),
    b = previous.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if (a[i] > b[i]) return base;
    if (a[i] < b[i]) break;
  }
  b[2]++;
  return b.join(".");
}
export async function releaseVersions(output: string, registry: Registry, previous: ReleaseState = {}) {
  const state: ReleaseState = {};
  for (const plugin of registry.plugins) {
    for (const harness of plugin.harnesses) {
      const key = `${harness}/${plugin.name}`;
      const directory = path.join(output, "dist", harness, "plugins", plugin.name);
      const hash = await digest(directory);
      const prior = previous[key];
      const version = prior?.hash === hash ? prior.version : nextVersion(plugin.version, prior?.version);
      const files = await filesIn(directory);
      for (const manifest of ["plugin.json", ".codex-plugin/plugin.json", ".claude-plugin/plugin.json"]) {
        if (!files.includes(manifest)) continue;
        const filename = path.join(directory, manifest);
        const value = jsonRecord.parse(JSON.parse(await readFile(filename, "utf8")));
        await writeFile(filename, JSON.stringify({ ...value, version }, undefined, 2) + "\n");
      }
      state[key] = { hash, version };
    }
  }
  await writeFile(path.join(output, ".publication.json"), JSON.stringify(state, undefined, 2) + "\n");
  return state;
}
