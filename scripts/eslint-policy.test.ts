import { type LintExample, assertLintCases } from "./eslint-test-support.ts";
import { mkdtemp, rm } from "node:fs/promises";
import { ESLint } from "eslint";
import assert from "node:assert/strict";
import { createConfig } from "../eslint.config.ts";
import path from "node:path";
import { test } from "bun:test";
import { tmpdir } from "node:os";

const rules = {
  padding: "@stylistic/padding-line-between-statements",
  members: "@stylistic/lines-between-class-members",
  chained: "no-restricted-syntax",
  unsafe: "@typescript-eslint/no-unsafe-type-assertion",
};
const titles = {
  spacing: "authored statement spacing separates imports, variable groups, classes, and functions",
  overloads: "class member spacing preserves method and constructor overload groups",
  assertions: "chained assertions are rejected in both TypeScript assertion syntaxes",
  typed: "type-aware assertion restrictions reject narrowing and accept checked input and widening",
};
const spacingCases = [
  { source: "inspect();\nif (value) { inspect(); }", count: 1 },
  { source: "inspect();\n\nif (value) { inspect(); }", count: 0 },
  { source: "if (value) { inspect(); }\ninspect();", count: 1 },
  { source: "try { inspect(); } catch (error) {}\ninspect();", count: 1 },
  { source: "try { inspect(); } catch (error) {}\n\ninspect();", count: 0 },
  { source: "function run() { inspect();\nreturn value; }", count: 1 },
  { source: "function run() { inspect();\n\nreturn value; }", count: 0 },
  { source: "switch (value) {\ncase 1:\ninspect();\nbreak;\ncase 2:\ninspect();\nbreak;\n}", count: 1 },
  { source: "switch (value) {\ncase 1:\ninspect();\nbreak;\n\ncase 2:\ninspect();\nbreak;\n}", count: 0 },
  { source: "switch (value) {\ncase 1:\ncase 2:\ninspect();\nbreak;\n}", count: 0 },
  { source: 'import a from "a";\nimport b from "b";\n\ninspect(a, b);', count: 0 },
  { source: 'import a from "a";\ninspect(a);', count: 1 },
  { source: "const first = 1;\nconst second = 2;\n\ninspect(first, second);", count: 0 },
  { source: "const first = 1;\ninspect(first);", count: 1 },
  { source: "let first = 1;\nlet second = 2;\n\ninspect(first, second);", count: 0 },
  { source: "let first = 1;\ninspect(first);", count: 1 },
  { source: "const first = 1;\nlet second = 2;", count: 1 },
  { source: "const first = 1;\n\nlet second = 2;", count: 0 },
  { source: "let first = 1;\nconst second = 2;", count: 1 },
  { source: "let first = 1;\n\nconst second = 2;", count: 0 },
  { source: "class First {}\nclass Second {}", count: 1 },
  { source: "class First {}\n\nclass Second {}", count: 0 },
  { source: "export class First {}\nexport class Second {}", count: 1 },
  { source: "export default class First {}\nclass Second {}", count: 1 },
  { source: "class First {}\nexport default class Second {}", count: 1 },
  { source: "export default class First {}\n\nclass Second {}", count: 0 },
  { source: "function first() {}\nfunction second() {}", count: 1 },
  { source: "function first() {}\n\nfunction second() {}", count: 0 },
  { source: "export function first() {}\nexport function second() {}", count: 1 },
  { source: "export default function first() {}\nfunction second() {}", count: 1 },
  { source: "async function first() {}\nasync function second() {}", count: 1 },
  { source: "export async function first() {}\n\nexport async function second() {}", count: 0 },
  {
    source:
      "function read(value: string): string;\nfunction read(value: number): number;\nfunction read(value: string | number) { return value; }",
    count: 0,
    extension: "ts",
  },
  {
    source: "inspect();\nfunction read(value: string): string;\nfunction read(value: string) { return value; }",
    count: 1,
    extension: "ts",
  },
  { source: "export const first = 1;\nexport const second = 2;\n\ninspect();", count: 0 },
  { source: "export const first = 1;\ninspect();", count: 1 },
  { source: "export let first = 1;\nexport let second = 2;\n\ninspect();", count: 0 },
  { source: "export let first = 1;\ninspect();", count: 1 },
  { source: "export const first = 1;\nexport let second = 2;", count: 1 },
  { source: "export let first = 1;\nexport const second = 2;", count: 1 },
  { source: "export const first = 1;\n\nexport let second = 2;", count: 0 },
  {
    source:
      "export function read(value: string): string;\nexport function read(value: number): number;\nexport function read(value: string | number) { return value; }",
    count: 0,
    extension: "ts",
  },
  {
    source: "function read(value: string): Promise<string>;\nasync function read(value: string) { return value; }",
    count: 0,
    extension: "ts",
  },
  {
    source:
      "export function read(value: string): Promise<string>;\nexport async function read(value: string) { return value; }",
    count: 0,
    extension: "ts",
  },
];
const memberCases = [
  { source: "class Sample {\nfirst() {}\nsecond() {}\n}", count: 1 },
  { source: "class Sample {\nfirst() {}\n\nsecond() {}\n}", count: 0 },
  { source: "class Sample {\nasync first() {}\nasync second() {}\n}", count: 1 },
  { source: "class Sample {\nvalue = 1;\nfirst() {}\n}", count: 1 },
  {
    source:
      "class Sample {\nread(value: string): string;\nread(value: number): number;\nread(value: string | number) { return value; }\n\nnext() {}\n}",
    count: 0,
    extension: "ts",
  },
  {
    source:
      "class Sample {\nconstructor(value: string);\nconstructor(value: number);\nconstructor(value: string | number) {}\n\nnext() {}\n}",
    count: 0,
    extension: "ts",
  },
  {
    source: "class Sample {\nfirst() {}\nread(value: string): string;\nread(value: string) { return value; }\n}",
    count: 1,
    extension: "ts",
  },
];
const assertionCases = [
  { source: "declare const value: unknown;\nconst result = value as unknown as string;", count: 1 },
  { source: "declare const value: unknown;\nconst result = <string><unknown>value;", count: 1 },
  { source: "declare const value: unknown;\nconst result = (value as unknown) as string;", count: 1 },
  { source: "declare const value: string;\nconst result = value as unknown;", count: 0 },
];
const typedCases = [
  { source: "export function read(value: unknown) { return value as string; }", count: 1 },
  {
    source:
      'export function read(value: unknown) { if (typeof value !== "string") { throw new Error(); } return value; }',
    count: 0,
  },
  { source: "export function read(value: string) { return value as unknown; }", count: 0 },
  {
    source:
      'function isName(value: unknown): value is string { return typeof value === "string"; }\nexport function read(value: unknown) { if (!isName(value)) { throw new Error(); } return value; }',
    count: 0,
  },
];
const fixture = {
  prefix: "agents-eslint-policy-",
  filename: "sample.ts",
  config: "tsconfig.json",
  configSource:
    '{"compilerOptions":{"strict":true,"target":"ESNext","module":"ESNext","moduleResolution":"Bundler","noEmit":true},"include":["*.ts"]}',
};

test(titles.spacing, async () => {
  for (const extension of ["js", "ts"]) {
    await assertLintCases(spacingCases, rules.padding, { extension });
  }
});

test(titles.overloads, async () => {
  for (const extension of ["js", "ts"]) {
    await assertLintCases(memberCases, rules.members, { extension });
  }
});

test(titles.assertions, async () => {
  await assertLintCases(assertionCases, rules.chained, { extension: "ts" });
});

async function inspectTypedFile(eslint: ESLint, filePath: string, example: LintExample) {
  const results = await eslint.lintFiles([filePath]);
  const diagnostics = results.flatMap((result) => result.messages);
  const matching = diagnostics.filter((message) => message.ruleId === rules.unsafe);

  assert.equal(
    diagnostics.some((message) => message.fatal),
    false,
    JSON.stringify(diagnostics)
  );
  assert.equal(matching.length, example.count, example.source);
}

async function assertTypedCase(example: LintExample) {
  const directory = await mkdtemp(path.join(tmpdir(), fixture.prefix));
  const filePath = path.join(directory, fixture.filename);
  const eslint = new ESLint({
    cwd: directory,
    overrideConfigFile: true,
    overrideConfig: createConfig({ typed: true, tsconfigRootDir: directory }),
  });

  try {
    await Bun.write(path.join(directory, fixture.config), fixture.configSource);
    await Bun.write(filePath, example.source);
    await inspectTypedFile(eslint, filePath, example);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test(titles.typed, async () => {
  for (const example of typedCases) {
    await assertTypedCase(example);
  }
});
