import { catalogs } from "./catalogs.ts";
import { withResolvedSources } from "./resolve-sources.ts";
import { readFile, writeFile } from "./io.ts";
import { mkdir, mkdtemp, realpath, rm, stat, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TOML } from "bun";
import type { Registry } from "./types.ts";
import { validateRegistry, inside, filesIn, checkOutputParents, pruneEmptyDirectories } from "./build-files.ts";
import { compilePlugin } from "./compile-plugin.ts";
const ROOT = fileURLToPath(new URL("../", import.meta.url));
const json = (value: unknown) => `${JSON.stringify(value, undefined, 2)}\n`;
export async function buildMarketplace({
  root = ROOT,
  check = false,
  output = path.join(root, ".marketplace-build"),
  resolved = false,
} = {}) {
  if (!resolved)
    return withResolvedSources(root, (source) =>
      buildMarketplace({
        root: source,
        check,
        output,
        resolved: true,
      })
    );
  root = await realpath(path.resolve(root));
  output = path.resolve(output);
  if (!check) await mkdir(output, { recursive: true });
  const registry = TOML.parse(await readFile(path.join(root, "marketplace.toml"), "utf8")) as unknown as Registry;
  validateRegistry(registry);
  const expected = new Map();
  const staging = await realpath(await mkdtemp(path.join(tmpdir(), "agents-marketplace-")));
  try {
    await writeFile(path.join(staging, "package.json"), json({ type: "module" }));
    await symlink(path.join(ROOT, "node_modules"), path.join(staging, "node_modules"), "dir");
    for (const plugin of registry.plugins) {
      const compiled = await compilePlugin(root, plugin, registry.marketplace.owner, staging);
      for (const [file, content] of compiled) expected.set(file, content);
    }
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
  for (const [file, value] of catalogs(registry)) expected.set(file, value);
  const actual = await filesIn(path.join(output, "dist"), "dist");
  const stale = actual.filter((file) => !expected.has(file));
  for (const file of expected.keys()) await checkOutputParents(output, file);
  if (check) {
    const differences = [...stale];
    for (const [file, value] of expected) {
      try {
        const filename = inside(output, file);
        const resolvedValue1 = await stat(filename);
        const executable = Boolean(resolvedValue1.mode & 0o111);
        if (!value.contents.equals(await readFile(filename)) || executable !== Boolean(value.mode & 0o111))
          differences.push(file);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
        differences.push(file);
      }
    }
    if (differences.length > 0)
      throw new Error(`Generated files are stale. Run bun run build:\n${differences.join("\n")}`);
  } else {
    for (const file of stale) await rm(inside(output, file));
    for (const [file, value] of expected) {
      const filename = inside(output, file);
      await mkdir(path.dirname(filename), { recursive: true });
      await rm(filename, { force: true });
      await writeFile(filename, value.contents, { mode: value.mode });
    }
    await pruneEmptyDirectories(path.join(output, "dist"));
  }
  return { plugins: registry.plugins.length, files: expected.size };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = {
      check: false,
      output: path.join(ROOT, ".marketplace-build"),
    };
    const args = process.argv.slice(2);
    for (let i = 0; i < args.length; i++) {
      if (args[i] === "--check") options.check = true;
      else if (args[i] === "--output" && args[i + 1] && !args[i + 1].startsWith("--"))
        options.output = path.resolve(args[++i]);
      else throw new Error("Usage: bun scripts/build-marketplace.ts [--check] [--output directory]");
    }
    const result = await buildMarketplace(options);
    console.log(`${options.check ? "Checked" : "Built"} ${result.plugins} plugin(s), ${result.files} generated files.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
