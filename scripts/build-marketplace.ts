import { checkOutputParents, filesIn, inside, pruneEmptyDirectories } from "./build-files.ts";
import { mkdir, mkdtemp, realpath, rm, stat, symlink } from "node:fs/promises";
import { readFile, writeFile } from "./io.ts";
import type { BuiltFile } from "./types.ts";
import { EXECUTABLE_BITS } from "./file-modes.ts";
import { TOML } from "bun";
import { catalogs } from "./catalogs.ts";
import { compilePlugin } from "./compile-plugin.ts";
import { fileURLToPath } from "node:url";
import { parseRegistry } from "./validation.ts";
import path from "node:path";
import { tmpdir } from "node:os";
import { withResolvedSources } from "./resolve-sources.ts";
const ROOT = fileURLToPath(new URL("../", import.meta.url));
const json = (value: unknown) => `${JSON.stringify(value, undefined, 2)}\n`;

async function compareBuild(output: string, expected: Map<string, BuiltFile>, stale: string[]) {
  const differences = [...stale];

  for (const [file, value] of expected) {
    try {
      const filename = inside(output, file);
      const info = await stat(filename);
      const executable = Boolean(info.mode & EXECUTABLE_BITS);

      if (!value.contents.equals(await readFile(filename)) || executable !== Boolean(value.mode & EXECUTABLE_BITS)) {
        differences.push(file);
      }
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) {
        throw error;
      }

      differences.push(file);
    }
  }

  return differences;
}

async function writeBuild(output: string, expected: Map<string, BuiltFile>, stale: string[]) {
  for (const file of stale) {
    await rm(inside(output, file));
  }

  for (const [file, value] of expected) {
    const filename = inside(output, file);
    await mkdir(path.dirname(filename), { recursive: true });
    await rm(filename, { force: true });
    await writeFile(filename, value.contents, { mode: value.mode });
  }

  await pruneEmptyDirectories(path.join(output, "dist"));
}

export async function buildMarketplace({
  root = ROOT,
  check = false,
  output = path.join(root, ".marketplace-build"),
  resolved = false,
} = {}): Promise<{ plugins: number; files: number }> {
  if (!resolved) {
    return withResolvedSources(root, (source) =>
      buildMarketplace({
        root: source,
        check,
        output,
        resolved: true,
      })
    );
  }

  root = await realpath(path.resolve(root));
  output = path.resolve(output);

  if (!check) {
    await mkdir(output, { recursive: true });
  }

  const registry = parseRegistry(TOML.parse(await readFile(path.join(root, "marketplace.toml"), "utf8")));
  const expected = new Map<string, BuiltFile>();
  const staging = await realpath(await mkdtemp(path.join(tmpdir(), "agents-marketplace-")));

  try {
    await writeFile(path.join(staging, "package.json"), json({ type: "module" }));
    await symlink(path.join(ROOT, "node_modules"), path.join(staging, "node_modules"), "dir");

    for (const plugin of registry.plugins) {
      const compiled = await compilePlugin(root, plugin, registry.marketplace.owner, staging);

      for (const [file, content] of compiled) {
        expected.set(file, content);
      }
    }
  } finally {
    await rm(staging, { recursive: true, force: true });
  }

  for (const [file, value] of catalogs(registry)) {
    expected.set(file, value);
  }

  const actual = await filesIn(path.join(output, "dist"), "dist");
  const stale = actual.filter((file) => !expected.has(file));

  for (const file of expected.keys()) {
    await checkOutputParents(output, file);
  }

  if (check) {
    const differences = await compareBuild(output, expected, stale);

    if (differences.length > 0) {
      throw new Error(`Generated files are stale. Run bun run build:\n${differences.join("\n")}`);
    }
  } else {
    await writeBuild(output, expected, stale);
  }

  return { plugins: registry.plugins.length, files: expected.size };
}

function parseOptions(args: string[]) {
  const options = { check: false, output: path.join(ROOT, ".marketplace-build") };

  for (let i = 0; i < args.length; i++) {
    const next = args[i + 1];

    if (args[i] === "--check") {
      options.check = true;
    } else if (args[i] === "--output" && next && !next.startsWith("--")) {
      options.output = path.resolve(args[++i]);
    } else {
      throw new Error("Usage: bun scripts/build-marketplace.ts [--check] [--output directory]");
    }
  }

  return options;
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const result = await buildMarketplace(options);
  console.log(
    `${options.check ? "Checked" : "Built"} ${String(result.plugins)} plugin(s), ${String(result.files)} generated files.`
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
