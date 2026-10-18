import { access } from "node:fs/promises";
import path from "node:path";
import { ESLint } from "eslint";
import * as ts from "typescript";
import * as z from "zod/mini";
import * as sharedConfig from "../eslint.config.ts";
export { default as PRETTIER_DEFAULTS } from "../prettier.config.mjs";

export const TYPESCRIPT = /\.(?:[cm]?ts|tsx)$/i;
export const FLAT_ESLINT_CONFIG = [
  "eslint.config.js",
  "eslint.config.mjs",
  "eslint.config.cjs",
  "eslint.config.ts",
  "eslint.config.mts",
  "eslint.config.cts",
];
export const LEGACY_ESLINT_CONFIG = [
  ".eslintrc",
  ".eslintrc.js",
  ".eslintrc.cjs",
  ".eslintrc.json",
  ".eslintrc.yaml",
  ".eslintrc.yml",
];
export interface Finding {
  ruleId?: string | null;
  severity: number;
  line?: number;
  message: string;
  fatal?: boolean;
}
const exists = async (name: string) => {
  try {
    await access(name);
    return true;
  } catch {
    return false;
  }
};

export async function nearest(start: string, names: string[], limit: string) {
  let current = start;
  while (current === limit || current.startsWith(`${limit}${path.sep}`)) {
    for (const name of names) {
      if (await exists(path.join(current, name)))
        return path.join(current, name);
    }
    if (current === limit) break;
    current = path.dirname(current);
  }
  return undefined;
}

async function fallbackConfig(
  file: string,
  root: string,
  forceUntyped = false
) {
  const tsconfig = await nearest(path.dirname(file), ["tsconfig.json"], root);
  let typed = Boolean(!forceUntyped && tsconfig && TYPESCRIPT.test(file));
  let typedSkipReason: string | undefined;
  if (typed) {
    try {
      if (!tsconfig) throw new Error("missing tsconfig");
      const document = ts.readConfigFile(tsconfig, (filename) => ts.sys.readFile(filename));
      if (document.error) throw new Error("invalid tsconfig");
      const parsed = ts.parseJsonConfigFileContent(
        document.config,
        ts.sys,
        path.dirname(tsconfig)
      );
      if (parsed.errors.length > 0) throw new Error("invalid tsconfig");
      if (!(
        parsed.options.strictNullChecks ??
        parsed.options.strict ??
        false
      )) {
        typed = false;
        typedSkipReason = "project tsconfig does not enable strict null checks";
      }
    } catch {
      typed = false;
      typedSkipReason = "project tsconfig could not be resolved";
    }
  }
  return {
    config: sharedConfig.createConfig({ typed, tsconfigRootDir: tsconfig ? path.dirname(tsconfig) : root, hook: true }),
    typed,
    typedSkipReason,
    integrated: sharedConfig.formattingIntegrated,
  };
}

export async function formattingIntegrated(
  file: string,
  root: string,
  configPath: string | undefined
) {
  if (!configPath) {
    try {
      const fallback = await fallbackConfig(file, root);
      return fallback.integrated;
    } catch {
      return false;
    }
  }
  try {
    const engine = new ESLint({ cwd: path.dirname(configPath) });
    const config = z.object({ rules: z.optional(z.record(z.string(), z.unknown())) }).parse(
      await engine.calculateConfigForFile(file)
    );
    const rule = config.rules?.["prettier/prettier"];
    return (
      rule !== undefined &&
      rule !== 0 &&
      rule !== "off" &&
      (!Array.isArray(rule) || (rule[0] !== 0 && rule[0] !== "off"))
    );
  } catch {
    return false;
  }
}

export async function lint(
  file: string,
  content: string,
  root: string,
  configPath: string | undefined
) {
  const fallback = configPath ? undefined : await fallbackConfig(file, root);
  const options: Record<string, unknown> = {
    cwd: configPath ? path.dirname(configPath) : root,
    fix: true,
  };
  if (fallback) {
    options.overrideConfigFile = true;
    options.overrideConfig = fallback.config;
  }
  const engine = new ESLint(options);
  if (await engine.isPathIgnored(file))
    return { ignored: true, findings: [] as Finding[] };
  const run = async () => {
    const results = await engine.lintText(content, { filePath: file });
    return results[0];
  };
  let result = await run();
  let typedSkipped = false;
  if (
    fallback?.typed &&
    result.messages.some(
      (item: Finding) =>
        item.fatal && /project service|tsconfig/i.test(item.message)
    )
  ) {
    const untyped = await fallbackConfig(file, root, true);
    // This file is outside its project TS program; keep linting with untyped rules.
    const retry = new ESLint({
      ...options,
      overrideConfig: untyped.config,
    });
    const results = await retry.lintText(content, { filePath: file });
    result = results[0];
    typedSkipped = true;
  }
  return {
    ignored: false,
    output: result.output,
    findings: result.messages,
    typedSkipped,
    typedSkipReason: fallback?.typedSkipReason,
  };
}
