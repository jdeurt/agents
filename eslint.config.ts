// AGENTS: Do not modify this file unless the user explicitly authorizes the change and specifies which rules to add,
// remove, or modify. Do not weaken rules to make checks pass.
import { defineConfig } from "eslint/config";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import policy from "./eslint-rules.ts";
import prettierOptions from "./prettier.config.mjs";
import prettierRecommended from "eslint-plugin-prettier/recommended";
import reactDoctorLint from "eslint-plugin-react-doctor";
import reactHooks from "eslint-plugin-react-hooks";
import stylistic from "@stylistic/eslint-plugin";
import tseslint from "typescript-eslint";
import unicorn from "eslint-plugin-unicorn";
const RECOMMENDED_LATEST = "recommended-latest";
const DIST = "dist/**";
const NODE_MODULES = "node_modules/**";
const MARKETPLACE_BUILD = ".marketplace-build/**";
const MARKETPLACE_VERIFY = ".marketplace-verify/**";
const READONLY = "readonly";
const ERROR = "error";
const WARN = "warn";
const OFF = "off";
const IGNORED_PRIVATE_NAME_PATTERN = "^_.*";
const CHAINED_TYPE_ASSERTION_SELECTOR =
  ":matches(TSAsExpression, TSTypeAssertion) > :matches(TSAsExpression, TSTypeAssertion)";
const CHAINED_TYPE_ASSERTION_MESSAGE = "Validate the value instead of chaining type assertions.";
const JSX_TSX = "**/*.{jsx,tsx}";
const ALL = "all";
const UNICORN_NO_NESTED_TERNARY = "unicorn/no-nested-ternary";
const ALWAYS = "always";
const FUNCTION = "function";
const CLASS = "class";
const SWITCH = "switch";
const FOR = "for";
const WHILE = "while";
const TRY = "try";
const EXPORTED_CLASS_SELECTOR =
  ":matches(ExportNamedDeclaration, ExportDefaultDeclaration)[declaration.type='ClassDeclaration']";
const COMPLETED_SWITCH_CASE_SELECTOR = "SwitchCase[consequent.length>0]";
const CASE = "case";
const DEFAULT = "default";
const RETURN = "return";

// The build copies this source and bundles these pinned dependencies for Engineering.
const resolutionRoot = fileURLToPath(new URL(".", import.meta.url));

// Keep each omission tied to an actual conflict; eslint-config-prettier also disables compatible rules.
export const stylisticConflicts: Record<string, string> = {
  "@stylistic/arrow-parens": "Prettier arrowParens=always conflicts with as-needed parentheses.",
  "@stylistic/brace-style": "Prettier keeps else/catch/finally beside the closing brace; Stroustrup separates them.",
  "@stylistic/comma-dangle": "Prettier trailingComma=es5 omits function argument commas required by always-multiline.",
  "@stylistic/indent-binary-ops":
    "Prettier indents wrapped string concatenation arguments further than this rule allows.",
  "@stylistic/member-delimiter-style": "Prettier uses semicolons in TypeScript members, not none/comma delimiters.",
  "@stylistic/operator-linebreak": "Prettier leaves assignment operators before a line break; before forbids this.",
  "@stylistic/quote-props": "Prettier quotes only necessary object keys; consistent-as-needed quotes all sibling keys.",
  "@stylistic/quotes": "Prettier singleQuote=false uses double quotes; the preset requires single quotes.",
  "@stylistic/semi": "Prettier semi=true requires semicolons; the preset forbids them.",
  "@stylistic/jsx-one-expression-per-line": "Prettier preserves inline JSX text and elements to preserve whitespace.",
  "@stylistic/multiline-ternary": "Prettier can wrap a ternary branch while retaining its condition and operator line.",
};

export function createConfig(options: { typed?: boolean; tsconfigRootDir?: string } = {}) {
  const files = ["**/*.{ts,tsx,js,jsx,mjs,cjs,mts,cts}"];
  const tsFiles = ["**/*.{ts,tsx,mts,cts}"];
  const reactRules = reactHooks.configs.flat[RECOMMENDED_LATEST].rules;

  return defineConfig([
    { ignores: [DIST, NODE_MODULES, MARKETPLACE_BUILD, MARKETPLACE_VERIFY] },
    { ...js.configs.recommended, files },
    { ...unicorn.configs.recommended, files },
    // Keep TypeScript-only core replacements scoped while enabling typed checks for JavaScript too.
    ...(options.typed
      ? [...tseslint.configs.strictTypeChecked, ...tseslint.configs.stylisticTypeChecked]
      : [...tseslint.configs.strict, ...tseslint.configs.stylistic]
    ).map((entry: Record<string, unknown>) => ({ ...entry, files: options.typed && !entry.files ? files : tsFiles })),
    {
      files,
      languageOptions: {
        globals: { console: READONLY, Bun: READONLY, process: READONLY, Buffer: READONLY },
      },
      rules: {
        "max-lines": [ERROR, { max: 350, skipBlankLines: false, skipComments: false }],
        "max-len": [ERROR, { code: 120, tabWidth: 2 }],
        "no-duplicate-imports": WARN,
        "no-inner-declarations": WARN,
        "no-self-compare": WARN,
        "no-unreachable-loop": WARN,
        "no-use-before-define": WARN,
        complexity: WARN,
        eqeqeq: WARN,
        "no-lonely-if": WARN,
        // Structural offsets and small counts are self-explanatory; other values need names.
        "no-magic-numbers": [WARN, { ignore: [0, 1, 2] }],
        "no-shadow": WARN,
        "no-var": ERROR,
        "prefer-const": WARN,
        "sort-imports": WARN,
        "unicorn/no-repeated-call-wrappers": WARN,
        "unicorn/try-complexity": WARN,
        "unicorn/no-array-reduce": OFF,
        "unicorn/name-replacements": OFF,
        "unicorn/filename-case": [ERROR, { cases: { kebabCase: true, pascalCase: true } }],
      },
    },
    {
      files: tsFiles,
      plugins: { "@typescript-eslint": tseslint.plugin },
      rules: {
        "no-magic-numbers": OFF,
        "no-shadow": OFF,
        "no-use-before-define": OFF,
        "@typescript-eslint/no-magic-numbers": [WARN, { ignore: [0, 1, 2] }],
        "@typescript-eslint/no-shadow": WARN,
        "@typescript-eslint/no-use-before-define": WARN,
        "@typescript-eslint/consistent-type-imports": ERROR,
        "@typescript-eslint/no-unused-vars": [
          WARN,
          { argsIgnorePattern: IGNORED_PRIVATE_NAME_PATTERN, varsIgnorePattern: IGNORED_PRIVATE_NAME_PATTERN },
        ],
        "no-restricted-syntax": [
          ERROR,
          {
            selector: CHAINED_TYPE_ASSERTION_SELECTOR,
            message: CHAINED_TYPE_ASSERTION_MESSAGE,
          },
        ],
      },
    },
    ...(options.typed
      ? [{ files: tsFiles, rules: { "@typescript-eslint/no-unsafe-type-assertion": ERROR } as const }]
      : []),
    { files: [JSX_TSX], languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } } },
    { files: [JSX_TSX], plugins: { "react-hooks": { rules: reactHooks.rules } }, rules: reactRules },
    { ...reactDoctorLint.configs.recommended, files: [JSX_TSX] },
    ...(options.typed
      ? [
          {
            files,
            languageOptions: {
              parserOptions: { projectService: true, tsconfigRootDir: options.tsconfigRootDir ?? resolutionRoot },
            },
          },
        ]
      : []),
    prettierRecommended,
    {
      ...stylistic.configs.recommended,
      files,
      rules: Object.fromEntries(
        Object.entries(stylistic.configs.recommended.rules ?? {}).filter(
          ([rule]) => !Object.hasOwn(stylisticConflicts, rule)
        )
      ),
    },
    {
      files,
      rules: {
        "prettier/prettier": [ERROR, prettierOptions, { usePrettierrc: false }],
        curly: [ERROR, ALL],
        "unicorn/no-nested-ternary": unicorn.configs.recommended.rules?.[UNICORN_NO_NESTED_TERNARY] ?? ERROR,
      },
    },
    {
      files,
      plugins: { "@stylistic": stylistic, jdeurt: policy },
      rules: {
        "jdeurt/no-magic-strings": ERROR,
        "jdeurt/const-on-top": ERROR,
        "@stylistic/lines-between-class-members": [
          ERROR,
          ALWAYS,
          { exceptAfterSingleLine: false, exceptAfterOverload: true },
        ],
        "@stylistic/padding-line-between-statements": [
          WARN,
          { blankLine: ALWAYS, prev: "*", next: [FUNCTION, CLASS, "if", SWITCH, FOR, WHILE, "do", TRY] },
          { blankLine: ALWAYS, prev: [FUNCTION, CLASS, "if", SWITCH, FOR, WHILE, "do", TRY], next: "*" },
          {
            blankLine: ALWAYS,
            prev: "*",
            next: {
              selector: EXPORTED_CLASS_SELECTOR,
            },
          },
          {
            blankLine: ALWAYS,
            prev: {
              selector: EXPORTED_CLASS_SELECTOR,
            },
            next: "*",
          },
          { blankLine: ALWAYS, prev: { selector: COMPLETED_SWITCH_CASE_SELECTOR }, next: [CASE, DEFAULT] },
          { blankLine: ALWAYS, prev: "*", next: RETURN },
        ],
      },
    },
  ]);
}

const config = createConfig({ typed: true });

export default config;
