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
const TEXT = "../";
const CODE = "code";
const FILE_NOT_FOUND = "ENOENT";
const DIST = "dist";
const MARKETPLACE_BUILD = ".marketplace-build";
const MARKETPLACE_TOML = "marketplace.toml";
const UTF8 = "utf8";
const AGENTS_MARKETPLACE = "agents-marketplace-";
const PACKAGE_JSON = "package.json";
const MODULE = "module";
const NODE_MODULES = "node_modules";
const DIR = "dir";
const CHECK = "--check";
const OUTPUT = "--output";
const USAGE_BUN_SCRIPTS_BUILD_MARKETPLACE_TS_CHECK =
  "Usage: bun scripts/build-marketplace.ts [--check] [--output directory]";
const CHECKED = "Checked";
const BUILT = "Built";

const ROOT = fileURLToPath(new URL(TEXT, import.meta.url));
const json = (value: unknown) => `${JSON.stringify(value, undefined, 2)}\n`;

async function recordDifference(output: string, file: string, value: BuiltFile, differences: string[]) {
  const filename = inside(output, file);
  const info = await stat(filename);
  const isExecutable = Boolean(info.mode & EXECUTABLE_BITS);

  if (!value.contents.equals(await readFile(filename)) || isExecutable !== Boolean(value.mode & EXECUTABLE_BITS)) {
    differences.push(file);
  }
}

async function compareBuild(output: string, expected: Map<string, BuiltFile>, stale: string[]) {
  const differences = [...stale];

  for (const [file, value] of expected) {
    try {
      await recordDifference(output, file, value, differences);
    } catch (error) {
      if (!(error instanceof Error && Reflect.has(error, CODE) && Reflect.get(error, CODE) === FILE_NOT_FOUND)) {
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

  await pruneEmptyDirectories(path.join(output, DIST));
}

async function prepareOutput(output: string, shouldCheck: boolean) {
  if (!shouldCheck) {
    await mkdir(output, { recursive: true });
  }

  return output;
}

async function finishBuild(
  output: string,
  shouldCheck: boolean,
  expected: Map<string, BuiltFile>,
  pluginCount: number
) {
  const actual = await filesIn(path.join(output, DIST), DIST);
  const stale = actual.filter((file) => !expected.has(file));

  for (const file of expected.keys()) {
    await checkOutputParents(output, file);
  }

  if (shouldCheck) {
    const differences = await compareBuild(output, expected, stale);

    if (differences.length > 0) {
      const message2 = `Generated files are stale. Run bun run build:\n${differences.join("\n")}`;
      throw new Error(message2);
    }
  } else {
    await writeBuild(output, expected, stale);
  }

  return { plugins: pluginCount, files: expected.size };
}

async function buildResolvedMarketplace(root: string, output: string, shouldCheck: boolean) {
  const preparedOutput = await prepareOutput(output, shouldCheck);
  const registryText = await readFile(path.join(root, MARKETPLACE_TOML), UTF8);
  const registry = parseRegistry(TOML.parse(registryText));
  const expected = new Map<string, BuiltFile>();
  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), AGENTS_MARKETPLACE));
  const staging = await realpath(temporaryDirectory);

  async function compilePlugins() {
    await writeFile(path.join(staging, PACKAGE_JSON), json({ type: MODULE }));
    await symlink(path.join(ROOT, NODE_MODULES), path.join(staging, NODE_MODULES), DIR);

    for (const plugin of registry.plugins) {
      const compiled = await compilePlugin(root, plugin, registry.marketplace.owner, staging);

      for (const [file, content] of compiled) {
        expected.set(file, content);
      }
    }
  }

  try {
    await compilePlugins();
  } finally {
    await rm(staging, { recursive: true, force: true });
  }

  for (const [file, value] of catalogs(registry)) {
    expected.set(file, value);
  }

  return finishBuild(preparedOutput, shouldCheck, expected, registry.plugins.length);
}

export async function buildMarketplace({
  root = ROOT,
  check = false,
  output = path.join(root, MARKETPLACE_BUILD),
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

  return buildResolvedMarketplace(await realpath(path.resolve(root)), path.resolve(output), check);
}

function parseOptions(args: string[]) {
  const options = { check: false, output: path.join(ROOT, MARKETPLACE_BUILD) };

  for (let i = 0; i < args.length; i++) {
    const next = args[i + 1];

    if (args[i] === CHECK) {
      options.check = true;
    } else if (next && args[i] === OUTPUT && !next.startsWith("--")) {
      options.output = path.resolve(args[++i]);
    } else {
      throw new Error(USAGE_BUN_SCRIPTS_BUILD_MARKETPLACE_TS_CHECK);
    }
  }

  return options;
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const result = await buildMarketplace(options);
  const text = `${options.check ? CHECKED : BUILT} ${String(result.plugins)} plugin(s), ${String(result.files)} generated files.`;
  console.log(text);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
