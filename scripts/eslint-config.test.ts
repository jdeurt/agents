import * as z from "zod/mini";
import { ESLint } from "eslint";
import assert from "node:assert/strict";
import { createConfig } from "../eslint.config.ts";
import { test } from "bun:test";
import unicorn from "eslint-plugin-unicorn";

const ruleOptions = z.array(z.unknown());
const rulesSchema = z.record(z.string(), ruleOptions);
const configSchema = z.looseObject({ rules: rulesSchema });
const inheritedRules = [
  "no-array-sort",
  "max-nested-calls",
  "consistent-boolean-name",
  "no-top-level-side-effects",
  "no-unreadable-for-of-expression",
  "prefer-simple-condition-first",
  "prefer-top-level-await",
  "no-nested-ternary",
  "prefer-logical-operator-over-ternary",
  "no-useless-undefined",
  "prefer-string-replace-all",
];
const defaultComplexityMaximum = 20;
const coreRules = ["no-use-before-define", "no-magic-numbers", "no-shadow"];
const methodSpacing = "@stylistic/lines-between-class-members";
const declarationSpacing = "@stylistic/padding-line-between-statements";

function engine(isTyped = false) {
  return new ESLint({ overrideConfigFile: true, overrideConfig: createConfig({ typed: isTyped }) });
}

async function messages(source: string, rule: string, extension = "js") {
  const results = await engine().lintText(source, { filePath: `scripts/eslint-policy-sample.${extension}` });
  const diagnostics = results.flatMap((result) => result.messages);
  assert.equal(
    diagnostics.some((message) => message.fatal),
    false,
    JSON.stringify(diagnostics)
  );

  return diagnostics.filter((message) => message.ruleId === rule);
}

test("representative typed and untyped configs retain inherited rule defaults and TypeScript replacements", async () => {
  const preset = new ESLint({ overrideConfigFile: true, overrideConfig: [unicorn.configs.recommended] });
  const inherited = configSchema.parse(await preset.calculateConfigForFile("sample.js"));

  for (const isTyped of [false, true]) {
    const eslint = engine(isTyped);

    for (const extension of ["js", "ts"]) {
      const config = configSchema.parse(
        await eslint.calculateConfigForFile(`scripts/eslint-policy-sample.${extension}`)
      );
      assert.deepEqual(config.rules.complexity, [1, defaultComplexityMaximum]);
      assert.deepEqual(config.rules["unicorn/try-complexity"], [1, { max: 1 }]);

      for (const name of inheritedRules) {
        const rule = `unicorn/${name}`;
        assert.deepEqual(config.rules[rule], inherited.rules[rule], `${rule}, typed=${String(isTyped)}, ${extension}`);
        assert.equal(config.rules[rule][0], 2, `${rule} must remain enabled`);
      }

      for (const name of coreRules) {
        const severity = extension === "ts" ? 0 : 1;
        assert.equal(config.rules[name][0], severity, `${name}, typed=${String(isTyped)}, ${extension}`);

        if (extension !== "ts") {
          continue;
        }

        const replacement = config.rules[`@typescript-eslint/${name}`];
        assert.equal(replacement[0], 1);

        if (name !== "no-magic-numbers") {
          continue;
        }

        const options = z.looseObject({ ignore: z.array(z.number()) }).parse(replacement[1]);
        assert.deepEqual(options.ignore, [0, 1, 2]);
      }

      assert.deepEqual(config.rules[methodSpacing], [
        1,
        { enforce: [{ blankLine: "always", prev: "method", next: "method" }] },
        { exceptAfterOverload: true, exceptAfterSingleLine: false },
      ]);
    }
  }
});

test("complexity uses ESLint's default maximum of twenty", async () => {
  const boundary = 19;
  const cases = Array.from({ length: boundary }, (_, index) => `if (value === ${String(index)}) { count++; }`).join(
    "\n"
  );
  const accepted = await messages(`function inspect(value) { let count = 0; ${cases} return count; }`, "complexity");
  assert.equal(accepted.length, 0);
  const rejected = await messages(
    `function inspect(value) { let count = 0; ${cases} if (value) { count++; } return count; }`,
    "complexity"
  );
  assert.equal(rejected.length, 1);
  assert.match(rejected[0]?.message ?? "", /Maximum allowed is 20/);
});

test("try complexity uses Unicorn's default maximum of one", async () => {
  const accepted = await messages("try { const value = 1; } catch {}", "unicorn/try-complexity");
  assert.equal(accepted.length, 0);
  const rejected = await messages("try { if (value) { inspect(); } } catch {}", "unicorn/try-complexity");
  assert.equal(rejected.length, 1);
  assert.match(rejected[0]?.message ?? "", /Maximum allowed is 1/);
});

test("nested calls use Unicorn's default maximum of three", async () => {
  const accepted = await messages("const result = first(second(third(value)));", "unicorn/max-nested-calls");
  assert.equal(accepted.length, 0);
  const rejected = await messages("const result = first(second(third(fourth(value))));", "unicorn/max-nested-calls");
  assert.equal(rejected.length, 1);
  assert.match(rejected[0]?.message ?? "", /Maximum allowed is 3/);
});

test("class methods and declarations require separating blank lines in JavaScript and TypeScript", async () => {
  for (const extension of ["js", "ts"]) {
    const adjacentMethods = await messages("class Sample {\nfirst() {}\nsecond() {}\n}", methodSpacing, extension);
    assert.equal(adjacentMethods.length, 1);
    const separatedMethods = await messages("class Sample {\nfirst() {}\n\nsecond() {}\n}", methodSpacing, extension);
    assert.equal(separatedMethods.length, 0);

    for (const prefix of ["", "export "]) {
      const adjacentClasses = await messages(
        `${prefix}class First {}\n${prefix}class Second {}`,
        declarationSpacing,
        extension
      );
      assert.equal(adjacentClasses.length, 1, `${prefix || "plain "}${extension} classes`);
      const separatedClasses = await messages(
        `${prefix}class First {}\n\n${prefix}class Second {}`,
        declarationSpacing,
        extension
      );
      assert.equal(separatedClasses.length, 0);
    }
  }
});

test("TypeScript overload declarations stay adjacent to their implementations", async () => {
  const source = [
    "class Sample {",
    "  first(value: string): string;",
    "  first(value: number): number;",
    "  first(value: string | number): string | number { return value; }",
    "",
    "  second() {}",
    "}",
  ].join("\n");
  const accepted = await messages(source, methodSpacing, "ts");
  assert.equal(accepted.length, 0);
  const rejected = await messages(source.replace("\n\n  second", "\n  second"), methodSpacing, "ts");
  assert.equal(rejected.length, 1);
});

test("TypeScript replacement rules report their intended violations", async () => {
  const samples = [
    { name: "no-use-before-define", source: "const result = value;\nconst value = 1;" },
    { name: "no-magic-numbers", source: "function count(value: number) { return value + 7; }" },
    { name: "no-shadow", source: "const value = 1;\nfunction inspect() { const value = 2; return value; }" },
  ];

  for (const sample of samples) {
    const diagnostics = await messages(sample.source, `@typescript-eslint/${sample.name}`, "ts");
    assert.equal(diagnostics.length, 1, sample.name);
    assert.equal(diagnostics[0]?.severity, 1);
  }
});

test("ESLint's published source retains the explicit authorization instruction", async () => {
  const source = await Bun.file(new URL("../eslint.config.ts", import.meta.url)).text();
  const comment = source
    .split("\n")
    .filter((line) => line.startsWith("//"))
    .join(" ")
    .replaceAll("// ", "");
  assert.ok(
    comment.includes(
      "AGENTS: Do not modify this file unless the user explicitly authorizes the change and specifies which rules to add, " +
        "remove, or modify. Do not weaken rules to make checks pass."
    )
  );
});
