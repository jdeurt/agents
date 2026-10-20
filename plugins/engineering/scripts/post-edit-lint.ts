import * as sharedConfig from "../eslint.config.ts";
import * as ts from "typescript";
import { ESLint } from "eslint";
import { access } from "node:fs/promises";
import path from "node:path";

export const TYPESCRIPT = /\.(?:[cm]?ts|tsx)$/i;
export interface Finding {
  ruleId?: string | null;
  severity: number;
  line?: number;
  message: string;
  fatal?: boolean;
}
const hasFile = async (name: string) => {
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
      if (await hasFile(path.join(current, name))) {
        return path.join(current, name);
      }
    }

    if (current === limit) {
      break;
    }

    current = path.dirname(current);
  }

  return;
}

function hasStrictNullChecks(tsconfig: string) {
  const document = ts.readConfigFile(tsconfig, (filename) => ts.sys.readFile(filename));

  if (document.error) {
    throw new Error("invalid tsconfig");
  }

  const parsed = ts.parseJsonConfigFileContent(document.config, ts.sys, path.dirname(tsconfig));

  if (parsed.errors.length > 0) {
    throw new Error("invalid tsconfig");
  }

  return parsed.options.strictNullChecks ?? parsed.options.strict ?? false;
}

function strictNullCheckSkipReason(tsconfig: string) {
  let isStrict: boolean;

  try {
    isStrict = hasStrictNullChecks(tsconfig);
  } catch {
    return "project tsconfig could not be resolved";
  }

  if (!isStrict) {
    return "project tsconfig does not enable strict null checks";
  }
}

async function bundledConfig(file: string, root: string, shouldForceUntyped = false) {
  const tsconfig = await nearest(path.dirname(file), ["tsconfig.json"], root);
  let isTyped = Boolean(!shouldForceUntyped && tsconfig && TYPESCRIPT.test(file));
  let typedSkipReason: string | undefined;

  if (isTyped && tsconfig) {
    typedSkipReason = strictNullCheckSkipReason(tsconfig);
    isTyped = !typedSkipReason;
  }

  return {
    config: sharedConfig.createConfig({ typed: isTyped, tsconfigRootDir: tsconfig ? path.dirname(tsconfig) : root, hook: true }),
    typed: isTyped,
    typedSkipReason,
  };
}

export async function lint(file: string, content: string, root: string) {
  const bundled = await bundledConfig(file, root);
  const options = {
    cwd: root,
    fix: true,
    overrideConfigFile: true as const,
    overrideConfig: bundled.config,
  };

  const engine = new ESLint(options);

  if (await engine.isPathIgnored(file)) {
    return { ignored: true, findings: [] as Finding[] };
  }

  const results = await engine.lintText(content, { filePath: file });
  let result = results[0];
  let isTypedSkipped = false;

  if (
    bundled.typed &&
    result.messages.some((item: Finding) => item.fatal && /project service|tsconfig/i.test(item.message))
  ) {
    const untyped = await bundledConfig(file, root, true);
    // This file is outside its project TS program; keep linting with untyped rules.
    const retry = new ESLint({
      ...options,
      overrideConfig: untyped.config,
    });
    const retryResults = await retry.lintText(content, { filePath: file });
    result = retryResults[0];
    isTypedSkipped = true;
  }

  return {
    ignored: false,
    output: result.output,
    findings: result.messages,
    typedSkipped: isTypedSkipped,
    typedSkipReason: bundled.typedSkipReason,
  };
}
