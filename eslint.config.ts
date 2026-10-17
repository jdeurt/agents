import js from "@eslint/js";
import tseslint from "typescript-eslint";
import unicorn from "eslint-plugin-unicorn";

const files = ["**/*.{ts,tsx,js,jsx,mjs,cjs}"];
export default [
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      ".marketplace-build/**",
      "plugins/**",
    ],
  },
  ...[
    js.configs.recommended,
    ...tseslint.configs.recommended,
    unicorn.configs.recommended,
  ].map((config) => ({ ...config, files })),
  {
    files,
    languageOptions: {
      globals: {
        console: "readonly",
        Bun: "readonly",
        process: "readonly",
        Buffer: "readonly",
      },
    },
    rules: {
      "max-lines": [
        "error",
        { max: 350, skipBlankLines: false, skipComments: false },
      ],
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_.*", varsIgnorePattern: "^_.*" },
      ],
      "unicorn/no-array-reduce": "off",
      "unicorn/prevent-abbreviations": "off",
      "unicorn/prefer-top-level-await": "off",
      "unicorn/no-nested-ternary": "off",
      "unicorn/prefer-logical-operator-over-ternary": "off",
      "unicorn/no-useless-undefined": "off",
      "unicorn/prefer-string-replace-all": "off",
      "unicorn/filename-case": [
        "error",
        { cases: { kebabCase: true, pascalCase: true } },
      ],
    },
  },
];
