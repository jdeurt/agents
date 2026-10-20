import * as z from "zod/mini";
import { externalImport, jsonRecord } from "./validation.ts";
import { lstat, mkdir, realpath } from "node:fs/promises";
import { readFile, writeFile } from "./io.ts";
import type { ExternalImport } from "./types.ts";
import { inside } from "./sync-imports.ts";
import path from "node:path";

const SCRIPTS_MUST_BE_ALL_OR_A_LIST = "scripts must be all or a list of relative paths";

const DESTINATION = "destination";

const UNKNOWN_IMPORT_FIELD = "Unknown import field";
const INVALID_OR_DUPLICATE_IMPORT_NAME = "Invalid or duplicate import name";
const IMPORTS_REQUIRE_A_GITHUB_HTTPS_REPOSITORY = "Imports require a GitHub HTTPS repository";
const INVALID_IMPORT_REF = "Invalid import ref";

const INVALID_IMPORT_KIND_OR_DESTINATION = "Invalid import kind or destination";
const OVERLAPPING_IMPORT_DESTINATIONS = "Overlapping import destinations";
const IMPORTS_TOML = "imports.toml";

const IMPORTS_TOML_MUST_CONTAIN_AN_IMPORTS_ARRAY = "imports.toml must contain an imports array";

const PLUGINS_IMPORT = "plugins/**/*.import";

function validateExecutionPolicy(root: string, entry: ExternalImport) {
  if (
    entry.scripts !== undefined &&
    entry.scripts !== "all" &&
    (!Array.isArray(entry.scripts) || entry.scripts.some((file) => typeof file !== "string"))
  ) {
    throw new Error(SCRIPTS_MUST_BE_ALL_OR_A_LIST);
  }

  if (Array.isArray(entry.scripts)) {
    for (const file of entry.scripts) {
      inside(root, file);
    }
  }

  for (const key of ["hooks", "local_mcp"] as const) {
    if (entry[key] !== undefined && typeof entry[key] !== "boolean") {
      const message = `${key} must be a boolean`;

      throw new Error(message);
    }
  }
}

function validateImportDestination(entry: ExternalImport) {
  const patterns = new Map<unknown, RegExp>([
    ["skill", /^plugins\/[a-z0-9-]+\/skills\/[a-z0-9-]+$/],
    ["plugin", /^plugins\/[a-z0-9-]+$/],
  ]);
  const pattern = patterns.get(entry.kind);

  if (!pattern?.test(entry.destination)) {
    throw new Error(INVALID_IMPORT_KIND_OR_DESTINATION);
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
          DESTINATION,
          "license",
          "scripts",
          "hooks",
          "local_mcp",
        ].includes(key)
    )
  ) {
    throw new Error(UNKNOWN_IMPORT_FIELD);
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.name) || names.has(entry.name)) {
    throw new Error(INVALID_OR_DUPLICATE_IMPORT_NAME);
  }

  names.add(entry.name);

  validateExecutionPolicy(root, entry);

  if (!/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\.git$/.test(entry.repository)) {
    throw new Error(IMPORTS_REQUIRE_A_GITHUB_HTTPS_REPOSITORY);
  }

  if (entry.ref !== undefined && (typeof entry.ref !== "string" || !entry.ref || entry.ref.startsWith("-"))) {
    throw new Error(INVALID_IMPORT_REF);
  }

  validateImportDestination(entry);

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
    throw new Error(OVERLAPPING_IMPORT_DESTINATIONS);
  }

  destinations.push(entry.destination);
}

function parseImportEntries(root: string, value: unknown): ExternalImport[] {
  const entries = z.array(externalImport).parse(value);
  const names = new Set<string>();
  const destinations: string[] = [];

  for (const entry of entries) {
    validateImportEntry(root, entry, names, destinations);
  }

  return entries;
}

export async function readImports(root: string): Promise<ExternalImport[]> {
  const configSource = await readFile(path.join(root, IMPORTS_TOML), "utf8");
  const config = jsonRecord.parse(Bun.TOML.parse(configSource));

  if (Object.keys(config).some((key) => key !== "imports") || !Array.isArray(config.imports)) {
    throw new Error(IMPORTS_TOML_MUST_CONTAIN_AN_IMPORTS_ARRAY);
  }

  return parseImportEntries(root, config.imports);
}

function markerContentsError(entry: ExternalImport) {
  const message = `Import marker must contain ${entry.name}`;

  return new Error(message);
}

async function validateMarkerContents(marker: string, entry: ExternalImport) {
  const markerText = await readFile(marker, "utf8");

  if (markerText.trim() === entry.name) {
    return;
  }

  throw markerContentsError(entry);
}

async function validateDeclaredMarkers(root: string, entries: ExternalImport[]) {
  const declared = new Set(entries.map((entry) => entry.destination + ".import"));

  const markers = new Bun.Glob(PLUGINS_IMPORT).scan({ cwd: root, dot: true });

  for await (const marker of markers) {
    if (!declared.has(marker)) {
      const message = `Undeclared import marker: ${marker}`;

      throw new Error(message);
    }
  }
}

export async function validateMarkers(root: string, entries: ExternalImport[]) {
  for (const entry of entries) {
    const target = inside(root, entry.destination);
    const marker = target + ".import";
    const markerInfo = await lstat(marker);

    if ((await realpath(marker)) !== marker || !markerInfo.isFile()) {
      const message = `Invalid import marker: ${entry.destination}.import`;

      throw new Error(message);
    }

    await validateMarkerContents(marker, entry);

    try {
      const message = `Import destination must be absent on main: ${entry.destination}`;

      await lstat(target);
      throw new Error(message);
    } catch (error) {
      if (!(error instanceof Error && Reflect.get(error, "code") === "ENOENT")) {
        throw error;
      }
    }
  }

  await validateDeclaredMarkers(root, entries);
}

export async function saveImports(root: string, imports: ExternalImport[]) {
  await writeFile(path.join(root, IMPORTS_TOML), Bun.TOML.stringify({ imports }));
}

export async function writeMarker(root: string, entry: ExternalImport) {
  const marker = inside(root, entry.destination) + ".import";

  await mkdir(path.dirname(marker), { recursive: true });
  await writeFile(marker, entry.name + "\n");
}
