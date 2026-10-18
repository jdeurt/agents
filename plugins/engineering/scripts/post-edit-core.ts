import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { access, readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as prettier from "prettier";
import * as z from "zod/mini";
import {
  FLAT_ESLINT_CONFIG,
  LEGACY_ESLINT_CONFIG,
  PRETTIER_DEFAULTS,
  TYPESCRIPT,
  formattingIntegrated,
  lint,
  nearest,
} from "./post-edit-lint.ts";

const SOURCE = /\.(?:[cm]?[jt]s|jsx|tsx)$/i;
const REACT = /\.(?:jsx|tsx)$/i;
const SKIP =
  /(^|\/)(?:node_modules|dist|build|coverage|\.next|\.output|\.git|generated)(\/|$)/;

const eventSchema = z.object({
  cwd: z.optional(z.string()),
  tool_name: z.optional(z.string()),
  tool_input: z.optional(z.record(z.string(), z.unknown())),
  tool_response: z.optional(z.unknown()),
});
type Event = z.infer<typeof eventSchema>;
const doctorReport = z.object({
  ok: z.optional(z.boolean()),
  error: z.optional(z.unknown()),
  projects: z.optional(
    z.array(z.object({
      skippedChecks: z.optional(z.array(z.string())),
      skippedCheckReasons: z.optional(z.record(z.string(), z.string())),
    }))
  ),
  diagnostics: z.optional(z.array(z.unknown())),
});
const exists = async (name: string) => {
  try {
    await access(name);
    return true;
  } catch {
    return false;
  }
};

export function editedPaths(event: Event): string[] {
  const input = event.tool_input ?? {};
  const tool = event.tool_name ?? "";
  if (!/^(Write|Edit|MultiEdit|apply_patch)$/.test(tool)) return [];
  const paths: unknown[] = [];
  if (typeof input.file_path === "string") paths.push(input.file_path);
  if (typeof input.filePath === "string") paths.push(input.filePath);
  if (Array.isArray(input.edits)) {
    for (const edit of z.array(z.unknown()).parse(input.edits)) {
      if (edit && typeof edit === "object" && "file_path" in edit)
        paths.push(edit.file_path);
    }
  }
  if (tool === "apply_patch") {
    const patch = input.command ?? input.patch ?? input.patch_text;
    if (typeof patch === "string") {
      for (const match of patch.matchAll(
        /^\*\*\* (?:Add|Update) File: (.+)$/gm
      ))
        paths.push(match[1]);
    }
  }
  return [
    ...new Set(
      paths.filter(
        (item): item is string =>
          typeof item === "string" &&
          SOURCE.test(item) &&
          !SKIP.test(item.replaceAll("\\", "/"))
      )
    ),
  ];
}

async function reactDoctor(file: string, root: string, workspace: string) {
  const bin = await nearest(
    root,
    ["node_modules/.bin/react-doctor"],
    workspace
  );
  if (!bin) return "";
  const args = [
    file,
    "--json",
    "--no-supply-chain",
    "--no-score",
    "--max-duration",
    "8",
  ];
  const child = spawn(bin, args, {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (data: Buffer) => {
    if (output.length < 24_000) output += data.toString();
  });
  const timer = setTimeout(() => child.kill("SIGKILL"), 9000);
  const code = await new Promise<number | null>((resolve) => {
    child.on("close", resolve);
    child.on("error", () => { resolve(-1); });
  });
  clearTimeout(timer);
  if (code === null) return "React Doctor timed out.";
  try {
    const report = doctorReport.parse(JSON.parse(output));
    if (report.ok === false)
      return `React Doctor could not scan: ${String(report.error).slice(0, 160)}`;
    const skipped = Array.isArray(report.projects)
      ? report.projects.flatMap((project: { skippedChecks?: string[]; skippedCheckReasons?: Record<string, string> }) =>
          (project.skippedChecks ?? []).map(
            (check) => `${check}: ${project.skippedCheckReasons?.[check] ?? "no reason provided"}`
          )
        )
      : [];
    if (skipped.length > 0)
      return `React Doctor skipped checks: ${skipped.slice(0, 2).join("; ").slice(0, 220)}`;
    const diagnostics = Array.isArray(report.diagnostics)
      ? report.diagnostics
      : [];
    if (diagnostics.length === 0) return "";
    const examples = diagnostics
      .slice(0, 3)
      .map((item: unknown) => JSON.stringify(item).slice(0, 180))
      .join("; ");
    return `React Doctor: ${String(diagnostics.length)} finding(s): ${examples}`;
  } catch {
    return "React Doctor could not produce a JSON report.";
  }
}

export async function run(event: Event): Promise<string> {
  if (process.env.JDEURT_EDIT_LINT_ACTIVE !== "1")
    return "Edit lint core must run through its bounded hook wrapper.";
  if (
    event.tool_response &&
    typeof event.tool_response === "object" &&
    "isError" in event.tool_response &&
    event.tool_response.isError === true
  )
    return "";
  const suppliedCwd = path.resolve(event.cwd ?? process.cwd());
  const cwd = await realpath(suppliedCwd);
  const lines: string[] = [];
  for (const name of editedPaths(event).slice(0, 20)) {
    const candidate = path.resolve(suppliedCwd, name);
    if (
      candidate !== suppliedCwd &&
      !candidate.startsWith(`${suppliedCwd}${path.sep}`)
    )
      continue;
    if (!(await exists(candidate))) continue;
    const file = await realpath(candidate);
    if (!file.startsWith(`${cwd}${path.sep}`) || SKIP.test(file)) continue;
    const rootConfig = await nearest(path.dirname(file), ["package.json"], cwd);
    const root = rootConfig ? path.dirname(rootConfig) : cwd;
    const configPath = await nearest(path.dirname(file), FLAT_ESLINT_CONFIG, cwd);
    const legacyConfig = configPath
      ? undefined
      : await nearest(path.dirname(file), LEGACY_ESLINT_CONFIG, cwd);
    const original = await readFile(file, "utf8");
    let content = original;
    const notes: string[] = [];
    try {
      if (!(await formattingIntegrated(file, root, configPath)) || legacyConfig) {
        const ignore = await nearest(
          path.dirname(file),
          [".prettierignore"],
          cwd
        );
        const info = await prettier.getFileInfo(file, { ignorePath: ignore });
        if (info.ignored) continue;
        const options = await prettier.resolveConfig(file);
        content = await prettier.format(content, {
          ...(options ? {} : PRETTIER_DEFAULTS),
          ...options,
          filepath: file,
        });
      }
    } catch (error) {
      notes.push(`Prettier unavailable: ${String(error).slice(0, 180)}`);
    }
    if (legacyConfig) {
      notes.push("Legacy ESLint config unsupported; lint skipped.");
    } else try {
      const result = await lint(file, content, root, configPath);
      if (result.ignored) continue;
      content = result.output ?? content;
      if (result.typedSkipped)
        notes.push("Type-aware rules skipped: file is outside its tsconfig.");
      if (result.typedSkipReason)
        notes.push(`Type-aware rules skipped: ${result.typedSkipReason}.`);
      if (
        !configPath &&
        TYPESCRIPT.test(file) &&
        !(await nearest(path.dirname(file), ["tsconfig.json"], cwd))
      )
        notes.push("Type-aware rules skipped: no project tsconfig.");
      const findings = result.findings;
      for (const item of findings.slice(0, 4)) {
        notes.push(
          `${item.severity === 2 ? "error" : "warning"}:${String(item.line ?? 0)} ${item.ruleId ?? "parser"}: ${item.message.replaceAll("\n", " ").slice(0, 140)}`
        );
      }
      if (findings.length > 4)
        notes.push(`... ${String(findings.length - 4)} more findings`);
    } catch (error) {
      notes.push(
        `ESLint unavailable or crashed: ${String(error).slice(0, 220)}`
      );
    }
    if (content !== original && (await readFile(file, "utf8")) === original) {
      await writeFile(file, content);
      notes.unshift(
        "Formatted/fixed; re-read file."
      );
    }
    if (REACT.test(file)) {
      const doctor = await reactDoctor(file, root, cwd);
      if (doctor) notes.push(doctor);
    }
    if (notes.length > 0)
      lines.push(`${path.relative(cwd, file)}: ${notes.join(" | ")}`);
  }
  return lines.join("\n").slice(0, 4000);
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const input = readFileSync(0, "utf8").slice(0, 256_000);
    const event = eventSchema.parse(JSON.parse(input));
    const result = await run(event);
    if (result) console.log(result);
  } catch (error) {
    console.log(
      `Edit lint hook could not inspect the edit: ${String(error).slice(0, 220)}`
    );
  }
}
