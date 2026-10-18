import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// The build copies this file into Engineering. The hook resolves dependencies
// from the edited project, while repository lint resolves its own dependencies.
const resolutionRoot = process.env.JDEURT_EDIT_LINT_PROJECT_ROOT ?? fileURLToPath(new URL(".", import.meta.url));
const require = createRequire(path.join(resolutionRoot, "package.json"));
async function load(name: string) {
  const module = await import(pathToFileURL(require.resolve(name)).href);
  return module.default;
}
async function optional(name: string) {
  try {
    return await load(name);
  } catch {
    return undefined;
  }
}

const js = await load("@eslint/js");
const tseslint = await load("typescript-eslint");
const unicorn = await load("eslint-plugin-unicorn");
const reactHooks = await optional("eslint-plugin-react-hooks");
const prettier = await optional("eslint-plugin-prettier/recommended");

export function reactHookRules(
  plugin:
    | {
        configs?: { flat?: Record<string, { rules?: Record<string, unknown> }>; [name: string]: unknown };
      }
    | undefined
) {
  const modern = plugin?.configs?.flat?.["recommended-latest"]?.rules;
  const older = plugin?.configs?.["recommended-latest"] as { rules?: Record<string, unknown> } | undefined;
  return modern ?? older?.rules;
}
export const reactHooksAvailable = Boolean(reactHookRules(reactHooks));
export const formattingIntegrated = Boolean(prettier);

export function createConfig(options: { typed?: boolean; tsconfigRootDir?: string; hook?: boolean } = {}) {
  const files = ["**/*.{ts,tsx,js,jsx,mjs,cjs,mts,cts}"];
  const tsFiles = ["**/*.{ts,tsx,mts,cts}"];
  const reactRules = reactHookRules(reactHooks);
  return [
    ...(options.hook ? [] : [{ ignores: ["dist/**", "node_modules/**", ".marketplace-build/**", "plugins/**"] }]),
    { ...js.configs.recommended, files },
    { ...unicorn.configs.recommended, files },
    ...(options.typed ? ["strictTypeChecked", "stylisticTypeChecked"] : ["strict", "stylistic"])
      .flatMap((name) => tseslint.configs[name] ?? [])
      .map((entry: Record<string, unknown>) => ({ ...entry, files: tsFiles })),
    {
      files,
      languageOptions: {
        globals: { console: "readonly", Bun: "readonly", process: "readonly", Buffer: "readonly" },
      },
      rules: {
        "max-lines": ["error", { max: 350, skipBlankLines: false, skipComments: false }],
        "max-len": ["error", { code: 120, tabWidth: 2 }],
        "unicorn/no-array-reduce": "off",
        "unicorn/prevent-abbreviations": "off",
        "unicorn/prefer-top-level-await": "off",
        "unicorn/no-nested-ternary": "off",
        "unicorn/prefer-logical-operator-over-ternary": "off",
        "unicorn/no-useless-undefined": "off",
        "unicorn/prefer-string-replace-all": "off",
        "unicorn/filename-case": ["error", { cases: { kebabCase: true, pascalCase: true } }],
      },
    },
    {
      files: tsFiles,
      plugins: { "@typescript-eslint": tseslint.plugin },
      rules: {
        "@typescript-eslint/consistent-type-imports": "error",
        "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_.*", varsIgnorePattern: "^_.*" }],
      },
    },
    ...(reactRules && reactHooks
      ? [{ files: ["**/*.{jsx,tsx}"], plugins: { "react-hooks": reactHooks }, rules: reactRules }]
      : []),
    ...(options.typed
      ? [
          {
            files: tsFiles,
            languageOptions: {
              parserOptions: { projectService: true, tsconfigRootDir: options.tsconfigRootDir ?? resolutionRoot },
            },
          },
        ]
      : []),
    ...(prettier ? [prettier] : []),
  ];
}

export default createConfig();
