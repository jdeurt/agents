import * as z from "zod/mini";

const VERSION_COMPONENT_COUNT = 3;

import { readFile, writeFile } from "./io.ts";
import type { Registry } from "./types.ts";
import { digest } from "./sync-imports.ts";
import { filesIn } from "./build-files.ts";
import { jsonRecord } from "./validation.ts";
import path from "node:path";

const PUBLICATION_REQUIRES_PLAIN_SEMANTIC_VERSIONS = "Publication requires plain semantic versions";

const PLUGIN_JSON = "plugin.json";
const CODEX_PLUGIN_PLUGIN_JSON = ".codex-plugin/plugin.json";
const CLAUDE_PLUGIN_PLUGIN_JSON = ".claude-plugin/plugin.json";

const PUBLICATION_JSON = ".publication.json";

export type ReleaseState = Record<string, { hash: string; version: string } | undefined>;
export const releaseStateSchema = z.record(z.string(), z.object({ hash: z.string(), version: z.string() }));

export function nextVersion(base: string, previous?: string) {
  const a = base.split(".").map(Number),
    b = previous ? previous.split(".").map(Number) : undefined;

  if (!/^\d+\.\d+\.\d+$/.test(base) || (previous && !/^\d+\.\d+\.\d+$/.test(previous))) {
    throw new Error(PUBLICATION_REQUIRES_PLAIN_SEMANTIC_VERSIONS);
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

async function writeVersion(filename: string, version: string) {
  const value = jsonRecord.parse(JSON.parse(await readFile(filename, "utf8")));

  await writeFile(filename, JSON.stringify({ ...value, version }, undefined, 2) + "\n");
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

      for (const manifest of [PLUGIN_JSON, CODEX_PLUGIN_PLUGIN_JSON, CLAUDE_PLUGIN_PLUGIN_JSON]) {
        const filename = path.join(directory, manifest);

        if (!files.includes(manifest)) {
          continue;
        }

        await writeVersion(filename, version);
      }

      state[key] = { hash, version };
    }
  }

  await writeFile(path.join(output, PUBLICATION_JSON), JSON.stringify(state, undefined, 2) + "\n");

  return state;
}
