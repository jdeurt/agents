import * as z from "zod/mini";
import { TYPESCRIPT, lint, nearest } from "./post-edit-lint.ts";
import { access, readFile, realpath, writeFile } from "node:fs/promises";
import { readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const SOURCE = /\.(?:[cm]?[jt]s|jsx|tsx)$/i;
const SKIP = /(^|\/)(?:node_modules|dist|build|coverage|\.next|\.output|\.git|generated)(\/|$)/;
const MAX_EDITED_FILES = 20;
const MAX_FINDINGS = 4;
const MAX_FINDING_MESSAGE_CHARS = 140;
const MAX_ERROR_MESSAGE_CHARS = 220;
const MAX_AGENT_CONTEXT_CHARS = 4000;
const MAX_EVENT_BYTES = 256_000;

const toolInputSchema = z.optional(z.record(z.string(), z.unknown()));
const eventSchema = z.object({
  cwd: z.optional(z.string()),
  tool_name: z.optional(z.string()),
  tool_input: toolInputSchema,
  tool_response: z.optional(z.unknown()),
});
type Event = z.infer<typeof eventSchema>;
const hasFile = async (name: string) => {
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

  if (!/^(Write|Edit|MultiEdit|apply_patch)$/.test(tool)) {
    return [];
  }

  const paths: unknown[] = [];

  if (typeof input.file_path === "string") {
    paths.push(input.file_path);
  }

  if (typeof input.filePath === "string") {
    paths.push(input.filePath);
  }

  if (Array.isArray(input.edits)) {
    for (const edit of z.array(z.unknown()).parse(input.edits)) {
      if (edit && typeof edit === "object" && "file_path" in edit) {
        paths.push(edit.file_path);
      }
    }
  }

  if (tool === "apply_patch") {
    const patch = input.command ?? input.patch ?? input.patch_text;

    if (typeof patch === "string") {
      for (const match of patch.matchAll(/^\*\*\* (?:Add|Update) File: (.+)$/gm)) {
        paths.push(match[1]);
      }
    }
  }

  return [
    ...new Set(
      paths.filter(
        (item): item is string =>
          typeof item === "string" && SOURCE.test(item) && !SKIP.test(item.replaceAll("\\", "/"))
      )
    ),
  ];
}

async function inspectFile(file: string, content: string, root: string, cwd: string) {
  const result = await lint(file, content, root);

  if (result.ignored) {
    return { content, notes: [] as string[], hasFindings: false, ignored: true };
  }

  const notes: string[] = [];

  if (result.typedSkipped) {
    notes.push("Type-aware rules skipped: file is outside its tsconfig.");
  }

  if (result.typedSkipReason) {
    notes.push(`Type-aware rules skipped: ${result.typedSkipReason}.`);
  }

  if (TYPESCRIPT.test(file) && !(await nearest(path.dirname(file), ["tsconfig.json"], cwd))) {
    notes.push("Type-aware rules skipped: no project tsconfig.");
  }

  for (const item of result.findings.slice(0, MAX_FINDINGS)) {
    notes.push(
      `error:${String(item.line ?? 0)} ${item.ruleId ?? "parser"}: ${item.message.replaceAll("\n", " ").slice(0, MAX_FINDING_MESSAGE_CHARS)}`
    );
  }

  if (result.findings.length > MAX_FINDINGS) {
    notes.push(`... ${String(result.findings.length - MAX_FINDINGS)} more findings`);
  }

  return {
    content: result.output ?? content,
    notes,
    hasFindings: result.findings.length > 0,
    ignored: false,
  };
}

async function inspectEditedFile(file: string, root: string, cwd: string, original: string) {
  try {
    return await inspectFile(file, original, root, cwd);
  } catch (error) {
    return {
      content: original,
      notes: [`ESLint unavailable or crashed: ${String(error).slice(0, MAX_ERROR_MESSAGE_CHARS)}`],
      hasFindings: false,
      ignored: false,
    };
  }
}

async function resolveEditedFile(name: string, suppliedCwd: string, cwd: string) {
  const candidate = path.resolve(suppliedCwd, name);

  if (candidate !== suppliedCwd && !candidate.startsWith(`${suppliedCwd}${path.sep}`)) {
    return;
  }

  if (!(await hasFile(candidate))) {
    return;
  }

  const file = await realpath(candidate);

  if (!file.startsWith(`${cwd}${path.sep}`) || SKIP.test(file)) {
    return;
  }

  return file;
}

export async function run(event: Event): Promise<string> {
  if (process.env.JDEURT_EDIT_LINT_ACTIVE !== "1") {
    return "Edit lint core must run through its bounded hook wrapper.";
  }

  if (
    event.tool_response &&
    typeof event.tool_response === "object" &&
    "isError" in event.tool_response &&
    event.tool_response.isError === true
  ) {
    return "";
  }

  const suppliedCwd = path.resolve(event.cwd ?? process.cwd());
  const cwd = await realpath(suppliedCwd);
  const lines: string[] = [];
  let hasFindings = false;

  for (const name of editedPaths(event).slice(0, MAX_EDITED_FILES)) {
    const file = await resolveEditedFile(name, suppliedCwd, cwd);

    if (!file) {
      continue;
    }

    const rootConfig = await nearest(path.dirname(file), ["package.json"], cwd);
    const root = rootConfig ? path.dirname(rootConfig) : cwd;
    const original = await readFile(file, "utf8");
    const result = await inspectEditedFile(file, root, cwd, original);

    if (result.ignored) {
      continue;
    }

    const { content, notes } = result;
    hasFindings ||= result.hasFindings;

    if (content !== original && (await readFile(file, "utf8")) === original) {
      await writeFile(file, content);
      notes.unshift("Formatted/fixed; re-read file.");
    }

    if (notes.length > 0) {
      lines.push(`${path.relative(cwd, file)}:\n${notes.join("\n")}`);
    }
  }

  if (hasFindings) {
    lines.push("Fix all findings caused by your edit; follow these rules in future edits.");
  }

  return lines.join("\n").slice(0, MAX_AGENT_CONTEXT_CHARS);
}

async function reportEvent() {
  const input = readFileSync(0, "utf8").slice(0, MAX_EVENT_BYTES);
  const event = eventSchema.parse(JSON.parse(input));
  const result = await run(event);

  if (result) {
    console.log(result);
  }
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  try {
    await reportEvent();
  } catch (error) {
    console.log(`Edit lint hook could not inspect the edit: ${String(error).slice(0, MAX_ERROR_MESSAGE_CHARS)}`);
  }
}
