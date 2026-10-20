---
name: formatting-linting
description: Use when setting up formatting and linting for a new project or applying the bundled JavaScript and TypeScript policies to an existing project. Provides shared ESLint and Prettier configuration and instructions for fixing findings.
---

# Formatting and Linting

Inspect the project's language, package manager, existing configuration, source directories, and generated output before making changes. Use the project's package manager; prefer Bun for a new Bun project. Preserve the user's requested policy and fix violations without weakening rules. This skill installs no automatic edit hooks.

## JavaScript

Use these bundled files for JavaScript and TypeScript projects, including React:

- [ESLint configuration](references/javascript/eslint.config.ts) defines the rules and typed project setup.
- [Prettier configuration](references/javascript/prettier.config.mjs) defines formatting.
- [Local ESLint rules](references/javascript/eslint-rules.ts) implements the named-string and constant-placement policies imported by the ESLint configuration.

Read all three before adoption. Copy them together into the project root, keeping their filenames and relative imports intact. The config's opening AGENTS comment requires explicit user authorization specifying which rules to add, remove, or modify before changing that file; retain the comment. For an existing project, inspect configuration and scripts first and reconcile the requested adoption with its conventions. Do not overwrite unrelated project settings.

For a new project, replace the placeholder with this installed skill's directory and run from the project root:

```sh
skill_dir="/path/to/installed/formatting-linting"
cp "$skill_dir/references/javascript/eslint.config.ts" .
cp "$skill_dir/references/javascript/prettier.config.mjs" .
cp "$skill_dir/references/javascript/eslint-rules.ts" .
bun add --dev --exact eslint@10.13.0 @eslint/js@10.0.1 @stylistic/eslint-plugin@5.10.0 typescript-eslint@8.71.2 eslint-plugin-unicorn@78.0.0 eslint-config-prettier@10.1.8 eslint-plugin-prettier@5.5.7 eslint-plugin-react-hooks@7.1.1 eslint-plugin-react-doctor@0.9.18 prettier@3.9.9 prettier-plugin-toml@3.0.2 typescript@5.9.3 jiti@2.7.0
```

These versions match the marketplace source's resolved dependencies. ESLint loads the TypeScript configuration through `jiti`; keep it even for a JavaScript-only project. Install runtime type declarations needed by the project, such as Bun's types for Bun code. When updating versions, check the imported presets and APIs against the installed packages and run the complete project checks.

Provide a project `tsconfig.json` that includes every owned JavaScript and TypeScript source file. Enable strict null checks and `allowJs` so the typed ESLint presets can inspect JavaScript too. Match the project's runtime and module system; for a new Bun project, start with:

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowImportingTsExtensions": true,
    "allowJs": true,
    "strict": true,
    "noEmit": true
  },
  "include": ["./*", "src/**/*", "scripts/**/*"],
  "exclude": ["node_modules", "dist", "build", ".marketplace-build", ".marketplace-verify"]
}
```

Adapt source and output paths to the actual project. When project service reports a file outside its TypeScript program, fix the program's source coverage instead of silently dropping type-aware rules. Markdown, JSON, TOML, vendored assets, and generated output need their appropriate formatting or validation commands; JavaScript ESLint rules do not validate those formats.

Add scripts using the project's package manager for ESLint with `--max-warnings 0`, Prettier checks, and `tsc --noEmit`. With Bun:

```sh
bun --bun eslint . --max-warnings 0
bun --bun prettier --check .
bun --bun tsc --noEmit
```

Run automatic fixes only within the authorized source scope, inspect the diff, then rerun checks. Suggestions without declared automatic fixes require a deliberate edit. Include the project's existing tests and build when the changes affect behavior. Report the checked scope, results, and any remaining findings.

### Policy details

The configuration uses recommended JavaScript and Unicorn rules, TypeScript ESLint strict and stylistic type-checked presets, and React Hooks and React Doctor presets for React files. It preserves inherited rule severities and defaults unless the source config explicitly overrides them. Complexity warns above 20 and try complexity warns above 1; the zero-warning command makes both enforceable. TypeScript files use the TypeScript equivalents of `no-use-before-define`, `no-magic-numbers`, and `no-shadow`.

Prettier uses double quotes, semicolons, two-space indentation, 120 columns, ES5 trailing commas, and LF endings. Nonconflicting ESLint Stylistic recommended rules remain active. The config lists each omitted rule and its concrete Prettier conflict. Explicit spacing requires blank lines between class members, including single-line methods, and around class declarations. Keep TypeScript overload signatures together with their implementation.

`jdeurt/no-magic-strings` requires names for string values of at least three characters. Static named constants, including static arrays and objects, are allowed. Inline paths and user-facing text in calls must be extracted; string syntax such as property names, module sources, TypeScript literal types, and directives is exempt. The rule also inspects template text and JSX text. Choose meaningful names near the scope that owns each value.

`jdeurt/const-on-top` requires constants before executable statements in their program or block scope. Leading imports, type declarations, function declarations, and variable declarations can share the declaration prefix. Loop-header declarations remain valid. Preserve evaluation order and dependencies when restructuring; the rule deliberately does not automatically hoist initializers.

`unicorn/consistent-function-scoping` flags functions that can move outward because they do not capture local state. It permits closures and other nested functions according to its own scope analysis; it does not ban every nested function, inline callback, or class method. Do not invent a broader function-placement restriction without the user's specified policy.
