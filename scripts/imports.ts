import { lstat, realpath, rm } from "node:fs/promises";
import path from "node:path";
import { readImports, saveImports, validateMarkers, writeMarker } from "./import-config.ts";
import { readFile, writeFile } from "./io.ts";
import { buildMarketplace } from "./build-marketplace.ts";
import type { ExternalImport, Registry } from "./types.ts";

const root = await realpath(process.cwd());
const [command, ...args] = process.argv.slice(2);
const entries = await readImports(root);
await validateMarkers(root, entries);
const registry = Bun.TOML.parse(await readFile(path.join(root, "marketplace.toml"), "utf8")) as unknown as Registry;
const saveRegistry = () =>
  writeFile(
    path.join(root, "marketplace.toml"),
    Bun.TOML.stringify(registry as unknown as Parameters<typeof Bun.TOML.stringify>[0])
  );
if (command === "check" && args.length === 0) {
  console.log(`Validated ${entries.length} imports and markers.`);
} else if (command === "sync" && args.length === 0) {
  await buildMarketplace({
    root,
    output: path.join(root, ".marketplace-build"),
  });
  console.log("Resolved latest imports and built .marketplace-build/.");
} else if (command === "remove" && args.length === 1) {
  const entry = entries.find((item) => item.name === args[0]);
  if (!entry) throw new Error(`Unknown import: ${args[0]}`);
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
  if (args.length < 6 || flags.length % 2)
    throw new Error(
      "Usage: imports:add <skill|plugin> <name> <GitHub URL> <source path> <destination> " +
        "<license path> [--ref ref] [--harness codex|claude|both]"
    );
  const options = new Map<string, string>();
  for (let i = 0; i < flags.length; i += 2) {
    if (!["--ref", "--harness"].includes(flags[i]) || options.has(flags[i]))
      throw new Error("Unknown or duplicate option");
    options.set(flags[i], flags[i + 1]);
  }
  const entry: ExternalImport = {
    kind: kind as ExternalImport["kind"],
    name,
    repository,
    path: source,
    destination,
    license,
    ...(options.has("--ref") ? { ref: options.get("--ref") } : {}),
  };
  const harness = options.get("--harness");
  if (kind === "plugin" && !["codex", "claude", "both"].includes(harness ?? ""))
    throw new Error("Plugin imports require --harness codex|claude|both");
  const original = await readFile(path.join(root, "imports.toml"), "utf8");
  try {
    await saveImports(root, [...entries, entry]);
    await readImports(root);
    for (const target of [destination, destination + ".import"]) {
      try {
        await lstat(path.join(root, target));
        throw new Error(`Destination exists: ${target}`);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
    }
    const pluginName = destination.split("/")[1];
    if (kind === "skill" && !registry.plugins.some((plugin) => plugin.name === pluginName && !plugin.native))
      throw new Error("Skill imports require an existing compiled plugin");
    if (kind === "plugin" && registry.plugins.some((plugin) => plugin.name === pluginName))
      throw new Error("Plugin already registered");
    await writeMarker(root, entry);
    if (kind === "plugin") {
      registry.plugins.push({
        name: pluginName,
        version: "1.0.0",
        description: `Imported ${pluginName} plugin.`,
        category: "Development",
        harnesses: harness === "both" ? ["claude", "codex"] : [harness as "claude" | "codex"],
        native: true,
      });
      await saveRegistry();
    }
  } catch (error) {
    await writeFile(path.join(root, "imports.toml"), original);
    throw error;
  }
} else {
  throw new Error("Usage: bun scripts/imports.ts <add|remove|sync|check>");
}
