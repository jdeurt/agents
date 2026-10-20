import * as z from "zod/mini";
import { externalImport, jsonRecord } from "./validation.ts";
import { lstat, mkdir, realpath } from "node:fs/promises";
import { readFile, writeFile } from "./io.ts";
import type { ExternalImport } from "./types.ts";
import { inside } from "./sync-imports.ts";
import path from "node:path";

function validateExecutionPolicy(root: string, entry: ExternalImport) {
  if (
    entry.scripts !== undefined &&
    entry.scripts !== "all" &&
    (!Array.isArray(entry.scripts) || entry.scripts.some((file) => typeof file !== "string"))
  ) {
    throw new Error("scripts must be all or a list of relative paths");
  }

  if (Array.isArray(entry.scripts)) {
    for (const file of entry.scripts) {
      inside(root, file);
    }
  }

  for (const key of ["hooks", "local_mcp"] as const) {
    if (entry[key] !== undefined && typeof entry[key] !== "boolean") {
      throw new Error(`${key} must be a boolean`);
    }
  }
}

function validateImportEntry(root: string, entry: ExternalImport, names: Set<string>, destinations: string[]) {
  if (
    Object.keys(entry).some(
      (key) =>
        ![
          "name",
          "kind",
          "repository",
          "ref",
          "path",
          "destination",
          "license",
          "scripts",
          "hooks",
          "local_mcp",
        ].includes(key)
    )
  ) {
    throw new Error("Unknown import field");
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.name) || names.has(entry.name)) {
    throw new Error("Invalid or duplicate import name");
  }

  names.add(entry.name);

  validateExecutionPolicy(root, entry);

  if (!/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\.git$/.test(entry.repository)) {
    throw new Error("Imports require a GitHub HTTPS repository");
  }

  if (entry.ref !== undefined && (typeof entry.ref !== "string" || !entry.ref || entry.ref.startsWith("-"))) {
    throw new Error("Invalid import ref");
  }

  const patterns = new Map<unknown, RegExp>([
    ["skill", /^plugins\/[a-z0-9-]+\/skills\/[a-z0-9-]+$/],
    ["plugin", /^plugins\/[a-z0-9-]+$/],
  ]);
  const pattern = patterns.get(entry.kind);

  if (!pattern?.test(entry.destination)) {
    throw new Error("Invalid import kind or destination");
  }

  if (entry.path !== ".") {
    inside(root, entry.path);
  }

  inside(root, entry.license);
  inside(root, entry.destination);

  if (
    destinations.some(
      (target) =>
        target === entry.destination ||
        target.startsWith(entry.destination + "/") ||
        entry.destination.startsWith(target + "/")
    )
  ) {
    throw new Error("Overlapping import destinations");
  }

  destinations.push(entry.destination);
}

export async function readImports(root: string): Promise<ExternalImport[]> {
  const configSource = await readFile(path.join(root, "imports.toml"), "utf8");
  const config = jsonRecord.parse(Bun.TOML.parse(configSource));

  if (Object.keys(config).some((key) => key !== "imports") || !Array.isArray(config.imports)) {
    throw new Error("imports.toml must contain an imports array");
  }

  const entries = z.array(externalImport).parse(config.imports);
  const names = new Set<string>();
  const destinations: string[] = [];

  for (const entry of entries) {
    validateImportEntry(root, entry, names, destinations);
  }

  return entries;
}

export async function validateMarkers(root: string, entries: ExternalImport[]) {
  for (const entry of entries) {
    const target = inside(root, entry.destination);
    const marker = target + ".import";
    const markerInfo = await lstat(marker);

    if ((await realpath(marker)) !== marker || !markerInfo.isFile()) {
      throw new Error(`Invalid import marker: ${entry.destination}.import`);
    }

    const markerText = await readFile(marker, "utf8");

    if (markerText.trim() !== entry.name) {
      throw new Error(`Import marker must contain ${entry.name}`);
    }

    try {
      await lstat(target);
      throw new Error(`Import destination must be absent on main: ${entry.destination}`);
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) {
        throw error;
      }
    }
  }

  const declared = new Set(entries.map((entry) => entry.destination + ".import"));

  const markers = new Bun.Glob("plugins/**/*.import").scan({ cwd: root, dot: true });

  for await (const marker of markers) {
    if (!declared.has(marker)) {
      throw new Error(`Undeclared import marker: ${marker}`);
    }
  }
}

export async function saveImports(root: string, imports: ExternalImport[]) {
  await writeFile(path.join(root, "imports.toml"), Bun.TOML.stringify({ imports }));
}
export async function writeMarker(root: string, entry: ExternalImport) {
  const marker = inside(root, entry.destination) + ".import";
  await mkdir(path.dirname(marker), { recursive: true });
  await writeFile(marker, entry.name + "\n");
}
