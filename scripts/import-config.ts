import * as z from "zod/mini";
import { lstat, mkdir, realpath } from "node:fs/promises";
import { readFile, writeFile } from "./io.ts";
import type { ExternalImport } from "./types.ts";
import { externalImport } from "./validation.ts";
import { inside } from "./sync-imports.ts";
import path from "node:path";

export async function readImports(root: string): Promise<ExternalImport[]> {
  const config = z
    .record(z.string(), z.unknown())
    .parse(Bun.TOML.parse(await readFile(path.join(root, "imports.toml"), "utf8")));

  if (Object.keys(config).some((key) => key !== "imports") || !Array.isArray(config.imports)) {
    throw new Error("imports.toml must contain an imports array");
  }

  const entries = z.array(externalImport).parse(config.imports);
  const names = new Set();
  const destinations: string[] = [];

  for (const entry of entries) {
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

    if (!/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\.git$/.test(entry.repository)) {
      throw new Error("Imports require a GitHub HTTPS repository");
    }

    if (entry.ref !== undefined && (typeof entry.ref !== "string" || !entry.ref || entry.ref.startsWith("-"))) {
      throw new Error("Invalid import ref");
    }

    const kind: unknown = entry.kind;
    const pattern =
      kind === "skill"
        ? /^plugins\/[a-z0-9-]+\/skills\/[a-z0-9-]+$/
        : kind === "plugin"
          ? /^plugins\/[a-z0-9-]+$/
          : undefined;

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

  for await (const marker of new Bun.Glob("plugins/**/*.import").scan({
    cwd: root,
    dot: true,
  })) {
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
