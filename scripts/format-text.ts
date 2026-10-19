import path from "node:path";
import * as prettier from "prettier";
import tomlPlugin from "prettier-plugin-toml";
import { prettierOptions } from "../eslint.config.ts";

const mode = process.argv[2];
if (mode !== "--check" && mode !== "--write") throw new Error("Use --check or --write.");

const root = process.cwd();
const sourceFiles = Bun.spawnSync(["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"], {
  cwd: root,
});
if (sourceFiles.exitCode !== 0) throw new Error(sourceFiles.stderr.toString().slice(0, 300));

const options = { ...prettierOptions, plugins: [tomlPlugin] };
const changed: string[] = [];
for (const relative of new Set(sourceFiles.stdout.toString().split("\0"))) {
  if (!relative || relative.startsWith("plugins/") || /\.(?:[cm]?[jt]sx?)$/i.test(relative)) continue;
  const file = path.join(root, relative);
  if (!(await Bun.file(file).exists())) continue;
  const info = await prettier.getFileInfo(file, { plugins: options.plugins });
  if (info.ignored || !info.inferredParser) continue;
  const original = await Bun.file(file).text();
  if (mode === "--check") {
    if (!(await prettier.check(original, { ...options, filepath: file }))) changed.push(relative);
  } else {
    const formatted = await prettier.format(original, { ...options, filepath: file });
    if (formatted !== original) {
      await Bun.write(file, formatted);
      changed.push(relative);
    }
  }
}

if (changed.length > 0) {
  console.log(`${mode === "--check" ? "Unformatted" : "Formatted"}: ${changed.join(", ")}`);
  if (mode === "--check") process.exitCode = 1;
} else {
  console.log("Text formatting is current.");
}
