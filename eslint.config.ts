import js from "@eslint/js";
import tseslint from "typescript-eslint";
import unicorn from "eslint-plugin-unicorn";
import reactHooks from "eslint-plugin-react-hooks";
import reactDoctorLint from "eslint-plugin-react-doctor";
import prettierRecommended from "eslint-plugin-prettier/recommended";
import { fileURLToPath } from "node:url";

// The build copies this source and bundles these pinned dependencies for Engineering.
const resolutionRoot = fileURLToPath(new URL(".", import.meta.url));
export const formattingIntegrated = true;

export function createConfig(options: { typed?: boolean; tsconfigRootDir?: string; hook?: boolean } = {}) {
  const files = ["**/*.{ts,tsx,js,jsx,mjs,cjs,mts,cts}"];
  const tsFiles = ["**/*.{ts,tsx,mts,cts}"];
  const reactRules = reactHooks.configs.flat["recommended-latest"].rules;
  return [
    ...(options.hook ? [] : [{ ignores: ["dist/**", "node_modules/**", ".marketplace-build/**"] }]),
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
    { files: ["**/*.{jsx,tsx}"], plugins: { "react-hooks": reactHooks }, rules: reactRules },
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
  ];
}

export default createConfig();
