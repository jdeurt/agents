import { assertLintCases } from "./eslint-test-support.ts";
import { test } from "bun:test";

const declarationRule = "jdeurt/const-on-top";
const declarationCases = [
  { source: "let first = 1; const second = 2; inspect();", count: 0 },
  { source: "inspect(); let value = 1;", count: 1 },
  { source: "inspect(); const value = 1;", count: 1 },
  { source: "function run() { inspect(); let value = 1; }", count: 1 },
  { source: "function run() { inspect(); const value = 1; }", count: 1 },
  { source: "inspect(); { let value = 1; inspect(value); }", count: 0 },
  { source: "class Sample { static { inspect(); let value = 1; } }", count: 1 },
  { source: "class Sample { static { inspect(); const value = 1; } }", count: 1 },
  { source: "inspect(); export let value = 1;", count: 1 },
  { source: "inspect(); export const value = 1;", count: 1 },
  { source: "for (let index = 0; index < 2; index++) { inspect(index); }", count: 0 },
  { source: "for (const value of values) { inspect(value); }", count: 0 },
  { source: "for (let value in values) { inspect(value); }", count: 0 },
  {
    source:
      '"use strict"; import value from "module"; export { value }; type Name = string; interface Entry {} declare const external: unknown; function run() {} let first = 1; const second = 2;',
    count: 0,
  },
  { source: "inspect(); function run() {} const value = 1;", count: 1 },
  { source: "if (value) { let first = 1; inspect(); const second = 2; }", count: 1 },
];

test("const and let declarations stay in each scope's declaration prefix", async () => {
  await assertLintCases(declarationCases, declarationRule, { extension: "ts" });
  await assertLintCases(declarationCases, declarationRule, { extension: "test.ts" });
});
