import { expect, test } from "bun:test";
import { ESLint } from "eslint";
import path from "node:path";
import { createConfig } from "../eslint.config.ts";

async function findings(source: string, typed: boolean) {
  const engine = new ESLint({
    cwd: process.cwd(),
    overrideConfigFile: true,
    overrideConfig: createConfig({ typed, tsconfigRootDir: process.cwd(), hook: true }),
  });
  const [result] = await engine.lintText(source, { filePath: path.resolve("scripts/unsafe-casts.test.ts") });

  return result.messages.map((item) => item.ruleId);
}

test("type-aware lint rejects direct unknown narrowing", async () => {
  const rules = await findings('const value: unknown = JSON.parse("{}"); value as { name: string };', true);
  expect(rules).toContain("@typescript-eslint/no-unsafe-type-assertion");
});

test("both presets reject chained as and angle-bracket assertions", async () => {
  for (const typed of [true, false]) {
    const asRules = await findings("const value = 1; (value as unknown) as string;", typed);
    const angleRules = await findings("const value = 1; <string><unknown>value;", typed);
    expect(asRules).toContain("no-restricted-syntax");
    expect(angleRules).toContain("no-restricted-syntax");
  }
});

test("Zod Mini parsing narrows unknown input without unsafe assertions", async () => {
  const rules = await findings(
    'import * as z from "zod/mini"; const value: unknown = JSON.parse("{}"); const parsed = z.object({name:z.string()}).parse(value); console.log(parsed.name);',
    true
  );
  expect(rules).not.toContain("@typescript-eslint/no-unsafe-type-assertion");
  expect(rules).not.toContain("no-restricted-syntax");
});
