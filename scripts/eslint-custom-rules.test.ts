import { ESLint } from "eslint";
import assert from "node:assert/strict";
import { assertLintCases } from "./eslint-test-support.ts";
import { createConfig } from "../eslint.config.ts";
import { test } from "bun:test";

const rules = { strings: "jdeurt/no-magic-strings", declarations: "jdeurt/const-on-top" };
const titles = {
  strings: "magic strings honor boundaries, named data, syntax, templates, and JSX",
  options: "magic string options apply an inclusive maximum length",
  declarations: "const and let declarations stay in each scope's declaration prefix",
};
const stringCases = [
  { source: 'inspect("1234567890");', count: 0 },
  { source: 'inspect("12345678901");', count: 1 },
  { source: 'const text = "12345678901";', count: 0 },
  { source: 'let text = "12345678901";', count: 1 },
  { source: 'const result = inspect("12345678901");', count: 1 },
  { source: 'const data = { paths: ["12345678901"] };', count: 0 },
  { source: 'const data = { paths: ["12345678901"] } satisfies Record<string, string[]>;', count: 0 },
  { source: 'inspect(["12345678901"]);', count: 1 },
  { source: 'inspect({ value: "12345678901" });', count: 1 },
  { source: 'if (value === "12345678901") {}', count: 1 },
  { source: 'inspect({ "12345678901": 1, ["123456789012"]: 2 });', count: 0 },
  { source: 'import value from "long-module-name"; export { value } from "other-module-name";', count: 0 },
  { source: 'type Name = "12345678901"; type Imported = import("long-module-name");', count: 0 },
  { source: '"long directive";\ninspect();', count: 0 },
  { source: 'declare module "long-module-name" {}', count: 0 },
  { source: "inspect(`12345${value}67890`);", count: 0 },
  { source: "inspect(`12345${value}678901`);", count: 1 },
  { source: "inspect(`${value}`);", count: 0 },
  { source: "const text = `12345678901${value}`;", count: 0 },
  { source: "inspect(`12345678901`);", count: 1 },
  { source: 'const view = <span title="1234567890">1234567890</span>;', count: 0 },
  { source: 'const view = <span title="12345678901">12345678901</span>;', count: 2 },
  { source: "const view = <span>    </span>;", count: 0 },
];
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
const optionCases = [
  { source: 'inspect("ab");', count: 0, maximum: 2 },
  { source: 'inspect("abc");', count: 1, maximum: 2 },
  { source: 'inspect("");', count: 0, maximum: 0 },
  { source: 'inspect("a");', count: 1, maximum: 0 },
  { source: "inspect(`${value}`);", count: 0, maximum: 0 },
];
const filename = "scripts/custom-policy-sample.tsx";

test(titles.strings, async () => {
  await assertLintCases(stringCases, rules.strings, { extension: "tsx" });
});

test(titles.declarations, async () => {
  await assertLintCases(declarationCases, rules.declarations, { extension: "ts" });
});

test(titles.options, async () => {
  const invalid = new ESLint({
    overrideConfigFile: true,
    overrideConfig: [...createConfig(), { rules: { [rules.strings]: ["error", { minLength: -1 }] } }],
  });

  for (const example of optionCases) {
    const eslint = new ESLint({
      overrideConfigFile: true,
      overrideConfig: [...createConfig(), { rules: { [rules.strings]: ["error", { minLength: example.maximum }] } }],
    });

    await assertLintCases([example], rules.strings, { eslint, extension: "tsx" });
  }

  await assert.rejects(invalid.lintText(optionCases[0].source, { filePath: filename }), /should be >= 0/);
});
