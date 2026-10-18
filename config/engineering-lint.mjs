// Fallback policy copied into the engineering plugin at build time.
export default {
  eslint: {
    javascript: "recommended",
    unicorn: "recommended",
    typescriptTyped: ["strictTypeChecked", "stylisticTypeChecked"],
    typescriptUntyped: ["strict", "stylistic"],
    reactHooks: "recommended-latest",
    rules: {
      "max-lines": [
        "error",
        { max: 350, skipBlankLines: false, skipComments: false },
      ],
      "max-len": ["error", { code: 120, tabWidth: 2 }],
    },
    safeFixes: [
      "prettier/prettier",
      "no-extra-semi",
      "no-multiple-empty-lines",
    ],
  },
  prettier: {
    singleQuote: false,
    semi: true,
    tabWidth: 2,
    printWidth: 120,
    trailingComma: "all",
    endOfLine: "lf",
  },
};
