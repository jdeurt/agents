import * as z from "zod/mini";

import { lstat, realpath, rm } from "node:fs/promises";
import { readFile, writeFile } from "./io.ts";
import { readImports, saveImports, validateMarkers, writeMarker } from "./import-config.ts";
import type { ExternalImport } from "./types.ts";
import { buildMarketplace } from "./build-marketplace.ts";
import { parseRegistry } from "./validation.ts";
import path from "node:path";
const REQUIRED_ADD_ARGS = 6;
const MARKETPLACE_TOML = "marketplace.toml";
const UTF8 = "utf8";
const CHECK = "check";
const SYNC = "sync";
const MARKETPLACE_BUILD = ".marketplace-build";
const RESOLVED_LATEST_IMPORTS_AND_BUILT_MARKETPLACE_BUILD = "Resolved latest imports and built .marketplace-build/.";
const REMOVE = "remove";
const IMPORT = ".import";
const PLUGIN = "plugin";
const ADD = "add";
const USAGE_IMPORTS_ADD_SKILL_PLUGIN_NAME_GITHUB =
  "Usage: imports:add <skill|plugin> <name> <GitHub URL> <source path> <destination> ";
const LICENSE_PATH_REF_REF_HARNESS_CODEX_CLAUDE = "<license path> [--ref ref] [--harness codex|claude|both]";
const REF = "--ref";
const HARNESS = "--harness";
const UNKNOWN_OR_DUPLICATE_OPTION = "Unknown or duplicate option";
const SKILL = "skill";
const CODEX = "codex";
const CLAUDE = "claude";
const BOTH = "both";
const PLUGIN_IMPORTS_REQUIRE_HARNESS_CODEX_CLAUDE_BOTH = "Plugin imports require --harness codex|claude|both";
const IMPORTS_TOML = "imports.toml";
const CODE = "code";
const FILE_NOT_FOUND = "ENOENT";
const SKILL_IMPORTS_REQUIRE_AN_EXISTING_COMPILED_PLUGIN = "Skill imports require an existing compiled plugin";
const PLUGIN_ALREADY_REGISTERED = "Plugin already registered";
const INITIAL_PLUGIN_VERSION = "1.0.0";
const DEVELOPMENT = "Development";
const USAGE_BUN_SCRIPTS_IMPORTS_TS_ADD_REMOVE = "Usage: bun scripts/imports.ts <add|remove|sync|check>";

async function readRegistry(root: string) {
  const registryContents = await readFile(path.join(root, MARKETPLACE_TOML), UTF8);

  return parseRegistry(Bun.TOML.parse(registryContents));
}

async function loadRegistry(root: string, entries: ExternalImport[]) {
  await validateMarkers(root, entries);

  return readRegistry(root);
}

const root = await realpath(process.cwd());
const [command, ...args] = process.argv.slice(2);
const entries = await readImports(root);
const registry = await loadRegistry(root, entries);
const saveRegistry = async () => {
  const contents = Bun.TOML.stringify(registry);
  await writeFile(path.join(root, MARKETPLACE_TOML), contents);
};

function validateAddArgs(requestArgs: string[]) {
  if (requestArgs.length < REQUIRED_ADD_ARGS || (requestArgs.length - REQUIRED_ADD_ARGS) % 2) {
    throw new Error(USAGE_IMPORTS_ADD_SKILL_PLUGIN_NAME_GITHUB + LICENSE_PATH_REF_REF_HARNESS_CODEX_CLAUDE);
  }
}

function parseImportOptions(flags: string[]) {
  const options = new Map<string, string>();

  for (let i = 0; i < flags.length; i += 2) {
    if (![REF, HARNESS].includes(flags[i]) || options.has(flags[i])) {
      throw new Error(UNKNOWN_OR_DUPLICATE_OPTION);
    }

    options.set(flags[i], flags[i + 1]);
  }

  return options;
}

function registerPlugin(pluginName: string, harness: string | undefined) {
  const description = `Imported ${pluginName} plugin.`;
  registry.plugins.push({
    name: pluginName,
    version: INITIAL_PLUGIN_VERSION,
    description,
    category: DEVELOPMENT,
    harnesses: harness === BOTH ? [CLAUDE, CODEX] : [z.enum([CLAUDE, CODEX]).parse(harness)],
    native: true,
  });
}

async function applyImportAddition(entry: ExternalImport, harness: string | undefined) {
  const original = await readFile(path.join(root, IMPORTS_TOML), UTF8);

  async function stageAdd() {
    const pluginName = entry.destination.split("/", 2)[1];
    await saveImports(root, [...entries, entry]);
    await readImports(root);

    for (const target of [entry.destination, entry.destination + IMPORT]) {
      try {
        const message = `Destination exists: ${target}`;
        await lstat(path.join(root, target));
        throw new Error(message);
      } catch (error) {
        if (!(error instanceof Error && Reflect.get(error, CODE) === FILE_NOT_FOUND)) {
          throw error;
        }
      }
    }

    if (entry.kind === SKILL && registry.plugins.every((plugin) => !(plugin.name === pluginName && !plugin.native))) {
      throw new Error(SKILL_IMPORTS_REQUIRE_AN_EXISTING_COMPILED_PLUGIN);
    }

    if (entry.kind === PLUGIN && registry.plugins.some((plugin) => plugin.name === pluginName)) {
      throw new Error(PLUGIN_ALREADY_REGISTERED);
    }

    await writeMarker(root, entry);

    if (entry.kind !== PLUGIN) {
      return;
    }

    registerPlugin(pluginName, harness);
    await saveRegistry();
  }

  try {
    await stageAdd();
  } catch (error) {
    await writeFile(path.join(root, IMPORTS_TOML), original);
    throw error;
  }
}

async function addImport(requestArgs: string[]) {
  const [kind, name, repository, source, destination, license, ...flags] = requestArgs;

  const options = parseImportOptions(flags);
  const entry: ExternalImport = {
    kind: z.enum([SKILL, PLUGIN]).parse(kind),
    name,
    repository,
    path: source,
    destination,
    license,
    ...(options.has(REF) && { ref: options.get(REF) }),
  };
  const harness = options.get(HARNESS);

  if (kind === PLUGIN && ![CODEX, CLAUDE, BOTH].includes(harness ?? "")) {
    throw new Error(PLUGIN_IMPORTS_REQUIRE_HARNESS_CODEX_CLAUDE_BOTH);
  }

  await applyImportAddition(entry, harness);
}

if (command === CHECK && args.length === 0) {
  const message = `Validated ${String(entries.length)} imports and markers.`;
  console.log(message);
} else if (command === SYNC && args.length === 0) {
  await buildMarketplace({
    root,
    output: path.join(root, MARKETPLACE_BUILD),
  });
  console.log(RESOLVED_LATEST_IMPORTS_AND_BUILT_MARKETPLACE_BUILD);
} else if (command === REMOVE && args.length === 1) {
  const entry = entries.find((item) => item.name === args[0]);

  if (!entry) {
    const message = `Unknown import: ${args[0]}`;
    throw new Error(message);
  }

  await rm(path.join(root, entry.destination + IMPORT));
  await saveImports(
    root,
    entries.filter((item) => item !== entry)
  );

  if (entry.kind === PLUGIN) {
    registry.plugins = registry.plugins.filter((plugin) => plugin.name !== path.basename(entry.destination));
    await saveRegistry();
  }
} else if (command === ADD) {
  validateAddArgs(args);
  await addImport(args);
} else {
  throw new Error(USAGE_BUN_SCRIPTS_IMPORTS_TS_ADD_REMOVE);
}
