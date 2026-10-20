import { cp, mkdtemp, realpath, rm } from "node:fs/promises";
import path from "node:path";
import { syncImports } from "./sync-imports.ts";
import { tmpdir } from "node:os";

const ESLINT_CONFIG_TS = "eslint.config.ts";
const PRETTIER_CONFIG_MJS = "prettier.config.mjs";
const ESLINT_RULES_TS = "eslint-rules.ts";
const MARKETPLACE_TOML = "marketplace.toml";
const IMPORTS_TOML = "imports.toml";
const AGENTS_SOURCES = "agents-sources-";

async function copySources(root: string, resolved: string) {
  for (const item of [
    "plugins",
    ESLINT_CONFIG_TS,
    PRETTIER_CONFIG_MJS,
    ESLINT_RULES_TS,
    MARKETPLACE_TOML,
    IMPORTS_TOML,
  ]) {
    await cp(path.join(root, item), path.join(resolved, item), {
      recursive: true,
    });
  }
}

export async function withResolvedSources<T>(root: string, use: (resolved: string) => Promise<T>): Promise<T> {
  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), AGENTS_SOURCES));
  const resolved = await realpath(temporaryDirectory);

  try {
    await copySources(root, resolved);

    await syncImports({ root, output: resolved });

    return await use(resolved);
  } finally {
    await rm(resolved, { recursive: true, force: true });
  }
}
