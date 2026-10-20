// AGENTS: Do not modify this file unless the user explicitly authorizes the change and specifies which rules to add,
// remove, or modify. Do not weaken rules to make checks pass.
import { defineConfig } from "eslint/config";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import prettierOptions from "./prettier.config.mjs";
import prettierRecommended from "eslint-plugin-prettier/recommended";
import reactDoctorLint from "eslint-plugin-react-doctor";
import reactHooks from "eslint-plugin-react-hooks";
import stylistic from "@stylistic/eslint-plugin";
import tseslint from "typescript-eslint";
import unicorn from "eslint-plugin-unicorn";

// The build copies this source and bundles these pinned dependencies for Engineering.
const resolutionRoot = fileURLToPath(new URL(".", import.meta.url));

export function createConfig(options: { typed?: boolean; tsconfigRootDir?: string; hook?: boolean } = {}) {
  const files = ["**/*.{ts,tsx,js,jsx,mjs,cjs,mts,cts}"];
  const tsFiles = ["**/*.{ts,tsx,mts,cts}"];
  const reactRules = reactHooks.configs.flat["recommended-latest"].rules;

  return defineConfig([
    ...(options.hook ? [] : [{ ignores: ["dist/**", "node_modules/**", ".marketplace-build/**"] }]),
    { ...js.configs.recommended, files },
    { ...unicorn.configs.recommended, files },
    ...(options.typed
      ? [...tseslint.configs.strictTypeChecked, ...tseslint.configs.stylisticTypeChecked]
      : [...tseslint.configs.strict, ...tseslint.configs.stylistic]
    ).map((entry: Record<string, unknown>) => ({ ...entry, files: tsFiles })),
    {
      files,
      languageOptions: {
        globals: { console: "readonly", Bun: "readonly", process: "readonly", Buffer: "readonly" },
      },
      rules: {
        "max-lines": ["error", { max: 350, skipBlankLines: false, skipComments: false }],
        "max-len": ["error", { code: 120, tabWidth: 2 }],
        "no-duplicate-imports": "warn",
        "no-inner-declarations": "warn",
        "no-self-compare": "warn",
        "no-unreachable-loop": "warn",
        "no-use-before-define": "warn",
        complexity: "warn",
        eqeqeq: "warn",
        "no-lonely-if": "warn",
        // Structural offsets and small counts are self-explanatory; other values need names.
        "no-magic-numbers": ["warn", { ignore: [0, 1, 2] }],
        "no-shadow": "warn",
        "no-var": "error",
        "prefer-const": "warn",
        "sort-imports": "warn",
        "unicorn/no-repeated-call-wrappers": "warn",
        "unicorn/try-complexity": "warn",
        "unicorn/no-array-reduce": "off",
        "unicorn/name-replacements": "off",
        "unicorn/filename-case": ["error", { cases: { kebabCase: true, pascalCase: true } }],
      },
    },
    {
      files: tsFiles,
      plugins: { "@typescript-eslint": tseslint.plugin },
      rules: {
        "no-magic-numbers": "off",
        "no-shadow": "off",
        "no-use-before-define": "off",
        "@typescript-eslint/no-magic-numbers": ["warn", { ignore: [0, 1, 2] }],
        "@typescript-eslint/no-shadow": "warn",
        "@typescript-eslint/no-use-before-define": "warn",
        "@typescript-eslint/consistent-type-imports": "error",
        "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_.*", varsIgnorePattern: "^_.*" }],
        "no-restricted-syntax": [
          "error",
          {
            selector: ":matches(TSAsExpression, TSTypeAssertion) > :matches(TSAsExpression, TSTypeAssertion)",
            message: "Validate the value instead of chaining type assertions.",
          },
        ],
      },
    },
    ...(options.typed
      ? [{ files: tsFiles, rules: { "@typescript-eslint/no-unsafe-type-assertion": "error" as const } }]
      : []),
    { files: ["**/*.{jsx,tsx}"], languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } } },
    { files: ["**/*.{jsx,tsx}"], plugins: { "react-hooks": { rules: reactHooks.rules } }, rules: reactRules },
    { ...reactDoctorLint.configs.recommended, files: ["**/*.{jsx,tsx}"] },
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
    prettierRecommended,
    {
      files,
      rules: {
        "prettier/prettier": ["error", prettierOptions, { usePrettierrc: false }],
        curly: ["error", "all"],
        "unicorn/no-nested-ternary": unicorn.configs.recommended.rules?.["unicorn/no-nested-ternary"] ?? "error",
      },
    },
    {
      files,
      plugins: { "@stylistic": stylistic },
      rules: {
        "@stylistic/lines-between-class-members": [
          "warn",
          { enforce: [{ blankLine: "always", prev: "method", next: "method" }] },
          { exceptAfterOverload: true },
        ],
        "@stylistic/padding-line-between-statements": [
          "warn",
          { blankLine: "always", prev: "*", next: ["function", "class", "if", "switch", "for", "while", "do", "try"] },
          { blankLine: "always", prev: ["function", "class", "if", "switch", "for", "while", "do", "try"], next: "*" },
          {
            blankLine: "always",
            prev: "*",
            next: {
              selector:
                ":matches(ExportNamedDeclaration, ExportDefaultDeclaration)[declaration.type='ClassDeclaration']",
            },
          },
          {
            blankLine: "always",
            prev: {
              selector:
                ":matches(ExportNamedDeclaration, ExportDefaultDeclaration)[declaration.type='ClassDeclaration']",
            },
            next: "*",
          },
          { blankLine: "always", prev: { selector: "SwitchCase[consequent.length>0]" }, next: ["case", "default"] },
          { blankLine: "always", prev: "*", next: "return" },
        ],
      },
    },
  ]);
}

const config = createConfig({ typed: true });

export default config;
