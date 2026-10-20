import * as z from "zod/mini";

const VERSION_COMPONENT_COUNT = 3;

import { readFile, writeFile } from "./io.ts";
import type { Registry } from "./types.ts";
import { digest } from "./sync-imports.ts";
import { filesIn } from "./build-files.ts";
import { jsonRecord } from "./validation.ts";
import path from "node:path";

export type ReleaseState = Record<string, { hash: string; version: string } | undefined>;
export const releaseStateSchema = z.record(z.string(), z.object({ hash: z.string(), version: z.string() }));

/**
Choose the authored version or advance the published patch version.
@param base - Authored semantic version to compare.
@param previous - Previously published semantic version, when available.
@returns The authored version when no prior release exists or it is newer, otherwise the next published patch version.
*/
export function nextVersion(base: string, previous?: string) {
  const a = base.split(".").map(Number),
    b = previous ? previous.split(".").map(Number) : undefined;

  if (!/^\d+\.\d+\.\d+$/.test(base) || (previous && !/^\d+\.\d+\.\d+$/.test(previous))) {
    throw new Error("Publication requires plain semantic versions");
  }

  if (!b) {
    return base;
  }

  for (let i = 0; i < VERSION_COMPONENT_COUNT; i++) {
    if (a[i] > b[i]) {
      return base;
    }

    if (a[i] < b[i]) {
      break;
    }
  }

  b[2]++;

  return b.join(".");
}

/**
Update the version field in one plugin manifest.
@param filename - Manifest path whose other fields must remain intact.
@param version - Release version to serialize.
*/
async function writeVersion(filename: string, version: string) {
  const value = jsonRecord.parse(JSON.parse(await readFile(filename, "utf8")));

  await writeFile(filename, JSON.stringify({ ...value, version }, undefined, 2) + "\n");
}

/**
Version changed plugin content and write publication state.
@param output - Generated marketplace root containing client distributions.
@param registry - Plugin declarations supplying authored versions and clients.
@param previous - Prior content hashes and published versions.
@returns The content hash and selected version for each client plugin.
*/
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
        const filename = path.join(directory, manifest);

        if (!files.includes(manifest)) {
          continue;
        }

        await writeVersion(filename, version);
      }

      state[key] = { hash, version };
    }
  }

  await writeFile(path.join(output, ".publication.json"), JSON.stringify(state, undefined, 2) + "\n");

  return state;
}
