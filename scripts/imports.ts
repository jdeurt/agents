import * as z from "zod/mini";

const REQUIRED_ADD_ARGS = 6;
import { lstat, realpath, rm } from "node:fs/promises";
import { readFile, writeFile } from "./io.ts";
import { readImports, saveImports, validateMarkers, writeMarker } from "./import-config.ts";
import type { ExternalImport } from "./types.ts";
import { buildMarketplace } from "./build-marketplace.ts";
import { parseRegistry } from "./validation.ts";
import path from "node:path";

const root = await realpath(process.cwd());
const [command, ...args] = process.argv.slice(2);
const entries = await readImports(root);
await validateMarkers(root, entries);
const registry = parseRegistry(Bun.TOML.parse(await readFile(path.join(root, "marketplace.toml"), "utf8")));
const saveRegistry = async () => {
  const contents = Bun.TOML.stringify(registry);
  await writeFile(path.join(root, "marketplace.toml"), contents);
};

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
  const [kind, name, repository, source, destination, license, ...flags] = args;

  if (args.length < REQUIRED_ADD_ARGS || flags.length % 2) {
    throw new Error(
      "Usage: imports:add <skill|plugin> <name> <GitHub URL> <source path> <destination> " +
        "<license path> [--ref ref] [--harness codex|claude|both]"
    );
  }

  const options = new Map<string, string>();

  for (let i = 0; i < flags.length; i += 2) {
    if (!["--ref", "--harness"].includes(flags[i]) || options.has(flags[i])) {
      throw new Error("Unknown or duplicate option");
    }

    options.set(flags[i], flags[i + 1]);
  }

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

  const original = await readFile(path.join(root, "imports.toml"), "utf8");

  async function stageAdd() {
    await saveImports(root, [...entries, entry]);
    await readImports(root);

    for (const target of [destination, destination + ".import"]) {
      try {
        await lstat(path.join(root, target));
        throw new Error(`Destination exists: ${target}`);
      } catch (error) {
        if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) {
          throw error;
        }
      }
    }

    const pluginName = destination.split("/", 2)[1];

    if (kind === "skill" && registry.plugins.every((plugin) => !(plugin.name === pluginName && !plugin.native))) {
      throw new Error("Skill imports require an existing compiled plugin");
    }

    if (kind === "plugin" && registry.plugins.some((plugin) => plugin.name === pluginName)) {
      throw new Error("Plugin already registered");
    }

    await writeMarker(root, entry);

    if (kind !== "plugin") {
      return;
    }

    registry.plugins.push({
      name: pluginName,
      version: "1.0.0",
      description: `Imported ${pluginName} plugin.`,
      category: "Development",
      harnesses: harness === "both" ? ["claude", "codex"] : [z.enum(["claude", "codex"]).parse(harness)],
      native: true,
    });
    await saveRegistry();
  }

  try {
    await stageAdd();
  } catch (error) {
    await writeFile(path.join(root, "imports.toml"), original);
    throw error;
  }
} else {
  throw new Error("Usage: bun scripts/imports.ts <add|remove|sync|check>");
}
