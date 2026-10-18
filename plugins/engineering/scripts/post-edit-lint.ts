import { existsSync } from "node:fs";
import { access } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const TYPESCRIPT = /\.(?:[cm]?ts|tsx)$/i;
export const ESLINT_CONFIG = [
  "eslint.config.js",
  "eslint.config.mjs",
  "eslint.config.cjs",
  "eslint.config.ts",
  "eslint.config.mts",
  "eslint.config.cts",
  ".eslintrc",
  ".eslintrc.js",
  ".eslintrc.cjs",
  ".eslintrc.json",
  ".eslintrc.yaml",
  ".eslintrc.yml",
];
const packaged = new URL("../config/engineering-lint.mjs", import.meta.url);
const source = new URL(
  "../../../config/engineering-lint.mjs",
  import.meta.url
);
const defaults = (await import(
  (existsSync(packaged) ? packaged : source).href
)).default as {
  eslint: {
    javascript: string;
    unicorn: string;
    typescriptTyped: string[];
    typescriptUntyped: string[];
    reactHooks: string;
    rules: Record<string, unknown>;
    safeFixes: string[];
  };
  prettier: Record<string, unknown>;
};
export const PRETTIER_DEFAULTS = defaults.prettier;
// The checked-in fallback file is copied into the plugin during compilation.
export const SAFE_FIXES = new Set(defaults.eslint.safeFixes);
export type Finding = {
  ruleId?: string | null;
  severity: number;
  line?: number;
  message: string;
  fatal?: boolean;
};
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

export async function loadModule(name: string, directory: string) {
  const require = createRequire(path.join(directory, "package.json"));
  return import(pathToFileURL(require.resolve(name)).href);
}

export function reactHookRules(plugin: {
  configs: Record<string, any> & { flat?: Record<string, any> };
}) {
  const name = defaults.eslint.reactHooks;
  return plugin.configs.flat?.[name]?.rules ?? plugin.configs[name]?.rules;
}

async function fallbackConfig(
  file: string,
  root: string,
  forceUntyped = false
) {
  const js = (await loadModule("@eslint/js", root)).default;
  const unicorn = (await loadModule("eslint-plugin-unicorn", root)).default;
  const tseslint = (await loadModule("typescript-eslint", root)).default;
  const tsconfig = await nearest(path.dirname(file), ["tsconfig.json"], root);
  let typed = Boolean(!forceUntyped && tsconfig && TYPESCRIPT.test(file));
  let typedSkipReason: string | undefined;
  if (typed) {
    try {
      const ts = (await loadModule("typescript", root)).default;
      const document = ts.readConfigFile(tsconfig, ts.sys.readFile);
      if (document.error) throw new Error("invalid tsconfig");
      const parsed = ts.parseJsonConfigFileContent(
        document.config,
        ts.sys,
        path.dirname(tsconfig!)
      );
      if (parsed.errors.length) throw new Error("invalid tsconfig");
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
  const tsConfigs = (
    typed ? defaults.eslint.typescriptTyped : defaults.eslint.typescriptUntyped
  ).flatMap((name: string) => tseslint.configs[name] ?? []);
  let reactHooks: any;
  let reactRules: Record<string, unknown> | undefined;
  if (/\.(?:jsx|tsx)$/i.test(file)) {
    try {
      reactHooks = (await loadModule("eslint-plugin-react-hooks", root))
        .default;
      reactRules = reactHookRules(reactHooks);
    } catch {
      // Report the missing optional React rule set to the agent.
    }
  }
  let prettierRecommended: Record<string, unknown> | undefined;
  try {
    prettierRecommended = (
      await loadModule("eslint-plugin-prettier/recommended", root)
    ).default;
  } catch {
    // Standalone Prettier handles formatting when the ESLint integration is absent.
  }
  return {
    config: [
      js.configs[defaults.eslint.javascript],
      unicorn.configs[defaults.eslint.unicorn],
      ...tsConfigs.map((entry: Record<string, unknown>) => ({
        ...entry,
        files: ["**/*.{ts,tsx,mts,cts}"],
      })),
      {
        rules: defaults.eslint.rules,
      },
      ...(reactHooks && reactRules
        ? [
            {
              files: ["**/*.{jsx,tsx}"],
              plugins: { "react-hooks": reactHooks },
              rules: reactRules,
            },
          ]
        : []),
      ...(typed
        ? [
            {
              files: ["**/*.{ts,tsx,mts,cts}"],
              languageOptions: {
                parserOptions: {
                  projectService: true,
                  tsconfigRootDir: path.dirname(tsconfig!),
                },
              },
            },
          ]
        : []),
      ...(prettierRecommended ? [prettierRecommended] : []),
    ],
    typed,
    typedSkipReason,
    integrated: Boolean(prettierRecommended),
    reactHooksSkipped: /\.(?:jsx|tsx)$/i.test(file) && !reactRules,
  };
}

export async function formattingIntegrated(
  file: string,
  root: string,
  configPath: string | undefined
) {
  if (!configPath) {
    try {
      return (await fallbackConfig(file, root)).integrated;
    } catch {
      return false;
    }
  }
  try {
    const eslintModule = await loadModule("eslint", root);
    const legacy = path.basename(configPath).startsWith(".eslintrc");
    const ESLint = eslintModule.loadESLint
      ? await eslintModule.loadESLint({ useFlatConfig: !legacy })
      : eslintModule.ESLint;
    const engine = new ESLint({ cwd: path.dirname(configPath) });
    const config = await engine.calculateConfigForFile(file);
    const rule = config?.rules?.["prettier/prettier"];
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
  const eslintModule = await loadModule("eslint", root);
  const legacy =
    configPath && path.basename(configPath).startsWith(".eslintrc");
  const ESLint = eslintModule.loadESLint
    ? await eslintModule.loadESLint({ useFlatConfig: !legacy })
    : eslintModule.ESLint;
  const fallback = configPath ? undefined : await fallbackConfig(file, root);
  const options: Record<string, unknown> = {
    cwd: configPath ? path.dirname(configPath) : root,
    fix: (finding: Finding) => SAFE_FIXES.has(finding.ruleId ?? ""),
  };
  if (fallback) {
    options.overrideConfigFile = true;
    options.overrideConfig = fallback.config;
  }
  const engine = new ESLint(options);
  if (await engine.isPathIgnored(file))
    return { ignored: true, findings: [] as Finding[] };
  const run = async () =>
    (await engine.lintText(content, { filePath: file }))[0];
  let result = await run();
  let typedSkipped = false;
  if (
    fallback?.typed &&
    result?.messages?.some(
      (item: Finding) =>
        item.fatal && /project service|tsconfig/i.test(item.message)
    )
  ) {
    const untyped = await fallbackConfig(file, root, true);
    // This file is outside its project TS program; keep linting with untyped rules.
    const retry = new ESLint({
      ...options,
      overrideConfig: untyped.config,
      fix: options.fix,
    });
    result = (await retry.lintText(content, { filePath: file }))[0];
    typedSkipped = true;
  }
  return {
    ignored: false,
    output: result?.output,
    findings: result?.messages ?? [],
    typedSkipped,
    typedSkipReason: fallback?.typedSkipReason,
    reactHooksSkipped: fallback?.reactHooksSkipped,
  };
}
