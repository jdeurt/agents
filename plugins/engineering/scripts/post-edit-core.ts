import { spawn } from "node:child_process";
import { access, readFile, realpath, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const SOURCE = /\.(?:[cm]?[jt]s|jsx|tsx)$/i;
const TYPESCRIPT = /\.(?:[cm]?ts|tsx)$/i;
const REACT = /\.(?:jsx|tsx)$/i;
const SKIP = /(^|\/)(?:node_modules|dist|build|coverage|\.next|\.output|\.git|generated)(\/|$)/;
const ESLINT_CONFIG = [
  "eslint.config.js", "eslint.config.mjs", "eslint.config.cjs",
  "eslint.config.ts", "eslint.config.mts", "eslint.config.cts",
  ".eslintrc", ".eslintrc.js", ".eslintrc.cjs", ".eslintrc.json",
  ".eslintrc.yaml", ".eslintrc.yml",
];
const PRETTIER_DEFAULTS = {
  singleQuote: false, semi: true, tabWidth: 2, printWidth: 80,
  trailingComma: "all", endOfLine: "lf",
};
// Rule fixes here only remove redundant syntax or normalize imports. Suggestions
// and the broad set of "fixable" rules are deliberately excluded.
const SAFE_FIXES = new Set([
  "prettier/prettier", "no-extra-semi", "no-multiple-empty-lines",
  "@typescript-eslint/consistent-type-imports",
]);

type Event = {
  cwd?: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_response?: Record<string, unknown>;
};
type Finding = { ruleId?: string | null; severity: number; line?: number;
  message: string; fatal?: boolean };

const exists = async (name: string) => {
  try { await access(name); return true; } catch { return false; }
};

export function editedPaths(event: Event): string[] {
  const input = event.tool_input ?? {};
  const tool = event.tool_name ?? "";
  if (!/^(Write|Edit|MultiEdit|apply_patch)$/.test(tool)) return [];
  const paths: unknown[] = [];
  if (typeof input.file_path === "string") paths.push(input.file_path);
  if (typeof input.filePath === "string") paths.push(input.filePath);
  if (Array.isArray(input.edits)) {
    for (const edit of input.edits) {
      if (edit && typeof edit === "object" && "file_path" in edit)
        paths.push(edit.file_path);
    }
  }
  if (tool === "apply_patch") {
    const patch = input.patch ?? input.patch_text;
    if (typeof patch === "string") {
      for (const match of patch.matchAll(/^\*\*\* (?:Add|Update) File: (.+)$/gm))
        paths.push(match[1]);
    }
  }
  return [...new Set(paths.filter((item): item is string =>
    typeof item === "string" && SOURCE.test(item) && !SKIP.test(item.replaceAll("\\", "/"))))];
}

async function nearest(start: string, names: string[], limit: string) {
  let current = start;
  while (current === limit || current.startsWith(`${limit}${path.sep}`)) {
    for (const name of names) {
      if (await exists(path.join(current, name))) return path.join(current, name);
    }
    if (current === limit) break;
    current = path.dirname(current);
  }
  return undefined;
}

async function loadModule(name: string, directory: string) {
  const require = createRequire(path.join(directory, "package.json"));
  return import(pathToFileURL(require.resolve(name)).href);
}

async function fallbackConfig(file: string, root: string, forceUntyped = false) {
  const js = (await loadModule("@eslint/js", root)).default;
  const unicorn = (await loadModule("eslint-plugin-unicorn", root)).default;
  const tseslint = (await loadModule("typescript-eslint", root)).default;
  const tsconfig = await nearest(path.dirname(file), ["tsconfig.json"], root);
  const typed = Boolean(!forceUntyped && tsconfig && TYPESCRIPT.test(file));
  const tsConfigs = typed
    ? [...tseslint.configs.strictTypeChecked, ...tseslint.configs.stylisticTypeChecked]
    : [...tseslint.configs.strict, ...tseslint.configs.stylistic];
  return {
    config: [
      js.configs.recommended,
      unicorn.configs.recommended,
      ...tsConfigs.map((entry: Record<string, unknown>) => ({
        ...entry, files: ["**/*.{ts,tsx,mts,cts}"],
      })),
      ...(typed ? [{
        files: ["**/*.{ts,tsx,mts,cts}"],
        languageOptions: { parserOptions: {
          projectService: true, tsconfigRootDir: path.dirname(tsconfig!),
        } },
      }] : []),
    ],
    typed,
  };
}

async function lint(file: string, content: string, root: string,
  configPath: string | undefined) {
  const eslintModule = await loadModule("eslint", root);
  const legacy = configPath && path.basename(configPath).startsWith(".eslintrc");
  const ESLint = eslintModule.loadESLint
    ? await eslintModule.loadESLint({ useFlatConfig: !legacy })
    : eslintModule.ESLint;
  const fallback = configPath ? undefined : await fallbackConfig(file, root);
  const options: Record<string, unknown> = {
    cwd: configPath ? path.dirname(configPath) : root,
    fix: (finding: Finding) => SAFE_FIXES.has(finding.ruleId ?? ""),
    warnIgnored: false,
  };
  if (fallback) {
    options.overrideConfigFile = true;
    options.overrideConfig = fallback.config;
  }
  const engine = new ESLint(options);
  if (await engine.isPathIgnored(file)) return { ignored: true, findings: [] as Finding[] };
  const run = async () => (await engine.lintText(content, { filePath: file }))[0];
  let result = await run();
  let typedSkipped = false;
  if (fallback?.typed && result?.messages?.some((item: Finding) =>
    item.fatal && /project service|tsconfig/i.test(item.message))) {
    const untyped = await fallbackConfig(file, root, true);
    // This file is outside its project TS program; keep linting with untyped rules.
    const retry = new ESLint({ ...options, overrideConfig: untyped.config,
      fix: options.fix });
    result = (await retry.lintText(content, { filePath: file }))[0];
    typedSkipped = true;
  }
  return { ignored: false, output: result?.output, findings: result?.messages ?? [],
    typedSkipped };
}

async function reactDoctor(file: string, root: string) {
  const bin = await nearest(root, ["node_modules/.bin/react-doctor"], root);
  if (!bin) return "React Doctor skipped (not installed).";
  const args = [file, "--json", "--no-supply-chain", "--no-score",
    "--max-duration", "8"];
  const child = spawn(bin, args, { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  child.stdout.on("data", (data: Buffer) => {
    if (output.length < 24_000) output += data.toString();
  });
  const timer = setTimeout(() => child.kill("SIGKILL"), 9_000);
  const code = await new Promise<number | null>((resolve) =>
    child.on("close", resolve));
  clearTimeout(timer);
  if (code === null) return "React Doctor timed out.";
  try {
    const report = JSON.parse(output);
    const issues = JSON.stringify(report).slice(0, 600);
    return issues === "{}" ? "" : `React Doctor: ${issues}`;
  } catch {
    return "React Doctor could not produce a JSON report.";
  }
}

export async function run(event: Event): Promise<string> {
  if (process.env.JDEURT_EDIT_LINT_ACTIVE !== "1")
    return "Edit lint core must run through its bounded hook wrapper.";
  if (event.tool_response?.isError === true) return "";
  const cwd = await realpath(event.cwd ?? process.cwd());
  const lines: string[] = [];
  for (const name of editedPaths(event).slice(0, 20)) {
    const candidate = path.resolve(cwd, name);
    if (candidate !== cwd && !candidate.startsWith(`${cwd}${path.sep}`)) continue;
    if (!(await exists(candidate))) continue;
    const file = await realpath(candidate);
    if (!file.startsWith(`${cwd}${path.sep}`) || SKIP.test(file)) continue;
    const rootConfig = await nearest(path.dirname(file), ["package.json"], cwd);
    const root = rootConfig ? path.dirname(rootConfig) : cwd;
    const configPath = await nearest(path.dirname(file), ESLINT_CONFIG, cwd);
    const original = await readFile(file, "utf8");
    let content = original;
    const notes: string[] = [];
    try {
      const prettier = (await loadModule("prettier", root));
      const ignore = await nearest(path.dirname(file), [".prettierignore"], cwd);
      const info = await prettier.getFileInfo(file, { ignorePath: ignore });
      if (info.ignored) continue;
      const options = await prettier.resolveConfig(file);
      content = await prettier.format(content, {
        ...(!options ? PRETTIER_DEFAULTS : {}),
        ...options, filepath: file,
      });
    } catch (error) {
      notes.push(`Prettier unavailable: ${String(error).slice(0, 180)}`);
    }
    try {
      const result = await lint(file, content, root, configPath);
      if (result.ignored) continue;
      content = result.output ?? content;
      if (result.typedSkipped) notes.push("Type-aware rules skipped: file is outside its tsconfig.");
      if (!configPath && TYPESCRIPT.test(file) &&
        !(await nearest(path.dirname(file), ["tsconfig.json"], cwd)))
        notes.push("Type-aware rules skipped: no project tsconfig.");
      const findings = result.findings as Finding[];
      for (const item of findings.slice(0, 8)) {
        notes.push(`${item.severity === 2 ? "error" : "warning"}:${item.line ?? 0} ${item.ruleId ?? "parser"}: ${item.message.replaceAll("\n", " ").slice(0, 180)}`);
      }
      if (findings.length > 8) notes.push(`... ${findings.length - 8} more findings`);
      const manual = findings.filter((item) => !SAFE_FIXES.has(item.ruleId ?? "")).length;
      if (manual) notes.push(`${manual} finding(s) require manual review; other automatic fixes were skipped.`);
    } catch (error) {
      notes.push(`ESLint unavailable or crashed: ${String(error).slice(0, 220)}`);
    }
    if (content !== original && (await readFile(file, "utf8")) === original) {
      await writeFile(file, content);
      notes.unshift("Applied formatting and safe lint fixes; re-read this file.");
    }
    if (REACT.test(file)) {
      const doctor = await reactDoctor(file, root);
      if (doctor) notes.push(doctor);
    }
    if (notes.length) lines.push(`${path.relative(cwd, file)}: ${notes.join(" | ")}`);
  }
  return lines.join("\n").slice(0, 11_000);
}

if (import.meta.main) {
  try {
    const input = (await Bun.stdin.text()).slice(0, 256_000);
    const event = JSON.parse(input) as Event;
    const result = await run(event);
    if (result) console.log(result);
  } catch (error) {
    console.log(`Edit lint hook could not inspect the edit: ${String(error).slice(0, 220)}`);
  }
}
