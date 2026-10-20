import { ESLint } from "eslint";
import assert from "node:assert/strict";
import { createConfig } from "../eslint.config.ts";

const samplePrefix = "scripts/policy-sample.";

export interface LintExample {
  source: string;
  count: number;
  extension?: string;
}

interface Options {
  extension?: string;
  eslint?: ESLint;
}

export async function assertLintCases(examples: LintExample[], rule: string, options: Options = {}) {
  const eslint = options.eslint ?? new ESLint({ overrideConfigFile: true, overrideConfig: createConfig() });

  for (const example of examples) {
    const filePath = samplePrefix + (example.extension ?? options.extension ?? "js");
    const results = await eslint.lintText(example.source, { filePath });
    const diagnostics = results.flatMap((result) => result.messages);
    const matching = diagnostics.filter((message) => message.ruleId === rule);

    assert.equal(
      diagnostics.some((message) => message.fatal),
      false,
      JSON.stringify(diagnostics)
    );
    assert.equal(matching.length, example.count, example.source);
  }
}
