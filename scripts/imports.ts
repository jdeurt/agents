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

const IMPORTS_TOML = "imports.toml";

/**
Read and validate the authored marketplace registry.
@param root - Repository containing marketplace.toml.
@returns The validated marketplace registry.
*/
async function readRegistry(root: string) {
  const registryContents = await readFile(path.join(root, MARKETPLACE_TOML), "utf8");

  return parseRegistry(Bun.TOML.parse(registryContents));
}

/**
Validate import markers before loading the marketplace registry.
@param root - Repository containing markers and marketplace.toml.
@param entries - Import declarations whose markers require validation.
@returns The validated marketplace registry.
*/
async function loadRegistry(root: string, entries: ExternalImport[]) {
  await validateMarkers(root, entries);

  return readRegistry(root);
}

const root = await realpath(process.cwd());
const [command, ...args] = process.argv.slice(2);
const entries = await readImports(root);
const registry = await loadRegistry(root, entries);
/**
Persist the current in-memory marketplace registry.
*/
const saveRegistry = async () => {
  const contents = Bun.TOML.stringify(registry);

  await writeFile(path.join(root, MARKETPLACE_TOML), contents);
};

/**
Validate the positional arguments and option pairs for an import addition.
@param requestArgs - Arguments following the add command.
*/
function validateAddArgs(requestArgs: string[]) {
  if (requestArgs.length < REQUIRED_ADD_ARGS || (requestArgs.length - REQUIRED_ADD_ARGS) % 2) {
    throw new Error(
      "Usage: imports:add <skill|plugin> <name> <GitHub URL> <source path> <destination> " +
        "<license path> [--ref ref] [--harness codex|claude|both]"
    );
  }
}

/**
Parse supported import options and reject duplicate flags.
@param flags - Alternating option names and values.
@returns Supported options indexed by their flag names.
*/
function parseImportOptions(flags: string[]) {
  const options = new Map<string, string>();

  for (let i = 0; i < flags.length; i += 2) {
    if (!["--ref", "--harness"].includes(flags[i]) || options.has(flags[i])) {
      throw new Error("Unknown or duplicate option");
    }

    options.set(flags[i], flags[i + 1]);
  }

  return options;
}

/**
Append a native plugin entry to the in-memory registry.
@param pluginName - Registry name derived from the import destination.
@param harness - Requested client, or both for both supported clients.
*/
function registerPlugin(pluginName: string, harness: string | undefined) {
  registry.plugins.push({
    name: pluginName,
    version: "1.0.0",
    description: `Imported ${pluginName} plugin.`,
    category: "Development",
    harnesses: harness === "both" ? ["claude", "codex"] : [z.enum(["claude", "codex"]).parse(harness)],
    native: true,
  });
}

/**
Stage an import addition and restore configuration on failure.
@param entry - Import declaration to validate and persist.
@param harness - Client selection used when registering a native plugin.
*/
async function applyImportAddition(entry: ExternalImport, harness: string | undefined) {
  const original = await readFile(path.join(root, IMPORTS_TOML), "utf8");

  async function stageAdd() {
    const pluginName = entry.destination.split("/", 2)[1];

    await saveImports(root, [...entries, entry]);
    await readImports(root);

    for (const target of [entry.destination, entry.destination + ".import"]) {
      try {
        await lstat(path.join(root, target));
        throw new Error(`Destination exists: ${target}`);
      } catch (error) {
        if (!(error instanceof Error && Reflect.get(error, "code") === "ENOENT")) {
          throw error;
        }
      }
    }

    if (entry.kind === "skill" && registry.plugins.every((plugin) => !(plugin.name === pluginName && !plugin.native))) {
      throw new Error("Skill imports require an existing compiled plugin");
    }

    if (entry.kind === "plugin" && registry.plugins.some((plugin) => plugin.name === pluginName)) {
      throw new Error("Plugin already registered");
    }

    await writeMarker(root, entry);

    if (entry.kind !== "plugin") {
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

/**
Parse an import addition and apply its validated declaration.
@param requestArgs - Positional import fields followed by option pairs.
*/
async function addImport(requestArgs: string[]) {
  const [kind, name, repository, source, destination, license, ...flags] = requestArgs;

  const options = parseImportOptions(flags);
  const entry: ExternalImport = {
    kind: z.enum(["skill", "plugin"]).parse(kind),
    name,
    repository,
    path: source,
    destination,
    license,
    ...(options.has("--ref") && { ref: options.get("--ref") }),
  };
  const harness = options.get("--harness");

  if (kind === "plugin" && !["codex", "claude", "both"].includes(harness ?? "")) {
    throw new Error("Plugin imports require --harness codex|claude|both");
  }

  await applyImportAddition(entry, harness);
}

if (command === "check" && args.length === 0) {
  console.log(`Validated ${String(entries.length)} imports and markers.`);
} else if (command === "sync" && args.length === 0) {
  await buildMarketplace({
    root,
    output: path.join(root, ".marketplace-build"),
  });
  console.log("Resolved latest imports and built .marketplace-build/.");
} else if (command === "remove" && args.length === 1) {
  const entry = entries.find((item) => item.name === args[0]);

  if (!entry) {
    throw new Error(`Unknown import: ${args[0]}`);
  }

  await rm(path.join(root, entry.destination + ".import"));
  await saveImports(
    root,
    entries.filter((item) => item !== entry)
  );

  if (entry.kind === "plugin") {
    registry.plugins = registry.plugins.filter((plugin) => plugin.name !== path.basename(entry.destination));
    await saveRegistry();
  }
} else if (command === "add") {
  validateAddArgs(args);
  await addImport(args);
} else {
  throw new Error("Usage: bun scripts/imports.ts <add|remove|sync|check>");
}
