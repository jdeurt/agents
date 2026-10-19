import { access } from "node:fs/promises";
import path from "node:path";
import { ESLint } from "eslint";
import * as ts from "typescript";
import * as sharedConfig from "../eslint.config.ts";

export const TYPESCRIPT = /\.(?:[cm]?ts|tsx)$/i;
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
      if (await exists(path.join(current, name))) return path.join(current, name);
    }

    if (current === limit) break;

    current = path.dirname(current);
  }

  return undefined;
}

async function bundledConfig(file: string, root: string, forceUntyped = false) {
  const tsconfig = await nearest(path.dirname(file), ["tsconfig.json"], root);
  let typed = Boolean(!forceUntyped && tsconfig && TYPESCRIPT.test(file));
  let typedSkipReason: string | undefined;

  if (typed) {
    try {
      if (!tsconfig) throw new Error("missing tsconfig");

      const document = ts.readConfigFile(tsconfig, (filename) => ts.sys.readFile(filename));

      if (document.error) throw new Error("invalid tsconfig");

      const parsed = ts.parseJsonConfigFileContent(document.config, ts.sys, path.dirname(tsconfig));

      if (parsed.errors.length > 0) throw new Error("invalid tsconfig");

      if (!(parsed.options.strictNullChecks ?? parsed.options.strict ?? false)) {
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

  if (await engine.isPathIgnored(file)) return { ignored: true, findings: [] as Finding[] };

  const results = await engine.lintText(content, { filePath: file });
  let result = results[0];
  let typedSkipped = false;

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
    const results = await retry.lintText(content, { filePath: file });
    result = results[0];
    typedSkipped = true;
  }

  return {
    ignored: false,
    output: result.output,
    findings: result.messages,
    typedSkipped,
    typedSkipReason: bundled.typedSkipReason,
  };
}
