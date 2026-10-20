import { assertLintCases } from "./eslint-test-support.ts";
import { test } from "bun:test";

const rules = {
  presence: "jsdoc/require-jsdoc",
  description: "jsdoc/require-description",
  params: "jsdoc/require-param",
  names: "jsdoc/check-param-names",
  paramDescription: "jsdoc/require-param-description",
  returns: "jsdoc/require-returns",
  returnDescription: "jsdoc/require-returns-description",
};
const presence = [
  { source: "function read() {}", count: 1 },
  { source: "export function read() {}", count: 1 },
  { source: "export default function() {}", count: 1 },
  { source: "const read = () => 1;", count: 1 },
  { source: "export const read = () => 1;", count: 1 },
  { source: "const read = function() { return 1; };", count: 1 },
  { source: "export default () => 1;", count: 1 },
  { source: "class Sample {}", count: 1 },
  { source: "const Sample = class {};", count: 1 },
  { source: "/** Run workflow. */ function run() { class Sample {} inspect(Sample); }", count: 1 },
  { source: "/** Run workflow. */ function run() { const Sample = class {}; inspect(Sample); }", count: 1 },
  { source: "/** Own values. */ class Sample { constructor() {} }", count: 1 },
  { source: "/** Own values. */ class Sample { read() {} }", count: 1 },
  { source: "/** Own values. */ class Sample { private read() {} }", count: 1 },
  { source: "/** Own values. */ class Sample { static async read() {} }", count: 1 },
  { source: "/** Own values. */ class Sample { get value() { return 1; } }", count: 1 },
  { source: "/** Own values. */ class Sample { set value(input: string) {} }", count: 1 },
  { source: "/** Own values. */ class Sample { read = () => 1; }", count: 1 },
  { source: "/** Own values. */ class Sample { read = function() { return 1; }; }", count: 1 },
  { source: "/** Own values. */ abstract class Sample { abstract read(): string; }", count: 1 },
  { source: "/** Own values. */ declare class Sample { read(): string; }", count: 1 },
  {
    source:
      "/** Run workflow. */ function run() { function nested() {} const callback = () => 1; inspect(nested, callback); }",
    count: 0,
  },
  { source: "const data = { read() { return 1; } };", count: 0 },
  { source: "/** @type {string} */ const value = input;", count: 0 },
  {
    source:
      "/** Read a value.\n@param value - Input value.\n@returns The input value.\n*/ function read(value: string): string;\nfunction read(value: number): number;\nfunction read(value: string | number) { return value; }",
    count: 0,
  },
  {
    source:
      "/** Own values. */ class Sample {\n/** Read a value.\n@param fallback - Default when no value exists.\n@returns The available value.\n*/ read(): number;\nread(fallback: number): number;\nread(fallback?: number) { return fallback ?? 1; }\n}",
    count: 0,
  },
  {
    source:
      "/** Own values. */ class Sample {\n/** Store an input value.\n@param value - Initial value.\n*/ constructor(value: string);\nconstructor(value: number);\nconstructor(value: string | number) {}\n}",
    count: 0,
  },
  { source: "const read = ((value: string) => value) satisfies (value: string) => string;", count: 1 },
  { source: "export const read = ((value: string) => value) as (value: string) => string;", count: 1 },
  { source: "export default (((value: string) => value) satisfies (value: string) => string);", count: 1 },
  { source: "const read = <(value: string) => string>((value: string) => value);", count: 1 },
  {
    source:
      "const read = ((((value: string) => value) satisfies (value: string) => string) satisfies (value: string) => string) satisfies (value: string) => string;",
    count: 1,
  },
  {
    source:
      "/** Own values. */ class Sample { read = ((value: string) => value) satisfies (value: string) => string; }",
    count: 1,
  },
  {
    source:
      "/** Own values. */ class Sample { read = (((value: string) => value) as (value: string) => string) satisfies (value: string) => string; }",
    count: 1,
  },
  { source: "const read = factory((value: string) => value) satisfies (value: string) => string;", count: 0 },
  { source: "const read = { nested: (value: string) => value } satisfies unknown;", count: 0 },
  {
    source:
      "/** Run processing. */ function run() { const read = ((value: string) => value) satisfies (value: string) => string; inspect(read); }",
    count: 0,
  },
  {
    source:
      "/** Read input.\n@param value - Input value.\n@returns The input unchanged.\n*/ const read = ((value: string) => value) satisfies (value: string) => string;",
    count: 0,
  },
];

const content = [
  { rule: rules.description, source: "/** */ class Sample {}", count: 1 },
  {
    rule: rules.params,
    source: "/** Read input. */ const read = ((value: string) => value) satisfies (value: string) => string;",
    count: 1,
  },
  {
    rule: rules.params,
    source:
      "/** Own values. */ class Sample { /** Read input. */ read = ((value: string) => value) satisfies (value: string) => string; }",
    count: 1,
  },
  {
    rule: rules.params,
    source: "/** Own values. */ class Sample { /** Store input. */ constructor(value: string) {} }",
    count: 1,
  },
  {
    rule: rules.params,
    source: "/** Own values. */ class Sample { /** Store input. */ set value(input: string) {} }",
    count: 1,
  },
  {
    rule: rules.params,
    source: "/** Own values. */ abstract class Sample { /** Store input. */ abstract store(value: string): void; }",
    count: 1,
  },
  {
    rule: rules.params,
    source: "/** Read settings. */ const read = ({ value }: { value: string }) => value;",
    count: 1,
  },
  {
    rule: rules.params,
    source:
      "/** Read settings.\n@param settings - Input settings.\n@returns The input value.\n*/ const read = ({ value }: { value: string }) => value;",
    count: 0,
  },
  {
    rule: rules.names,
    source:
      "/** Read input.\n@param wrong - Input value.\n@returns The input value.\n*/ const read = ((value: string) => value) satisfies (value: string) => string;",
    count: 1,
  },
  {
    rule: rules.paramDescription,
    source:
      "/** Read input.\n@param value\n@returns The input value.\n*/ const read = ((value: string) => value) satisfies (value: string) => string;",
    count: 1,
  },
  {
    rule: rules.returnDescription,
    source:
      "/** Read input.\n@param value - Input value.\n@returns\n*/ const read = ((value: string) => value) satisfies (value: string) => string;",
    count: 1,
  },
  {
    rule: rules.params,
    source:
      "/** Read input.\n@param value - Input value.\n@returns The input value.\n*/ const read = ((value: string) => value) satisfies (value: string) => string;",
    count: 0,
  },
];
const returns = [
  { source: "/** Own values. */ class Sample { /** Read a value. */ get value() { return 1; } }", count: 1 },
  { source: "/** Own values. */ abstract class Sample { /** Read a value. */ abstract read(): string; }", count: 1 },
  { source: "/** Own values. */ declare class Sample { /** Read a value. */ read(): string; }", count: 1 },
  { source: "/** Read a value. */ declare function read(): string;", count: 1 },
  {
    source: "/** Own values. */ abstract class Sample { /** Read a value. */ abstract read(): Promise<string>; }",
    count: 1,
  },
  {
    source: "/** Own values. */ abstract class Sample { /** Finish processing. */ abstract finish(): void; }",
    count: 0,
  },
  {
    source: "/** Own values. */ abstract class Sample { /** Finish processing. */ abstract finish(): undefined; }",
    count: 0,
  },
  { source: "/** Own values. */ abstract class Sample { /** Fail processing. */ abstract fail(): never; }", count: 0 },
  {
    source: "/** Own values. */ abstract class Sample { /** Finish processing. */ abstract finish(): Promise<void>; }",
    count: 0,
  },
  {
    source:
      "/** Own values. */ abstract class Sample { /** Finish processing. */ abstract finish(): Promise<undefined>; }",
    count: 0,
  },
  {
    source: "/** Own values. */ abstract class Sample { /** Fail processing. */ abstract fail(): Promise<never>; }",
    count: 0,
  },
  { source: "/** Own values. */ class Sample { /** Create a value owner. */ constructor() {} }", count: 0 },
];

test("JSDoc scope includes top-level definitions, transparent wrappers, and all class members", async () => {
  await assertLintCases(presence, rules.presence, { extension: "ts" });
});

test("JSDoc content checks follow scoped functions, fields, accessors, and destructured roots", async () => {
  for (const example of content) {
    await assertLintCases([example], example.rule, { extension: "ts" });
  }
});

test("declaration-only JSDoc return contracts distinguish values from explicit no-result types", async () => {
  await assertLintCases(returns, rules.returns, { extension: "ts" });
});
