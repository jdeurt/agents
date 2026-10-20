---
name: formatting-linting
description: Use as a stylistic reference when writing code or setting up a new project.
---

# Formatting and Linting

Defines stylistic rules for writing code.

Explicit project linting, formatting, and coding rules take precedence over anything in this skill when they conflict. Written instructions in project files or configuration define project rules. Examples include instruction files, contributor guides, and ESLint or formatter settings. An observed pattern or convention in existing code is not itself a rule. Use observed norms to inform choices only where no explicit rule applies.

Inspect the project's language, package manager, existing configuration, source directories, and generated output before making changes. Use the project's package manager. Prefer Bun for a new Bun project. Preserve the user's requested policy and fix violations without weakening rules. This skill installs no automatic edit hooks.

## Style across languages

Read [Rules of style](references/style-rules.md) when writing or reviewing code in any language. Apply its legibility, correctness, maintainability, duplication, state, resource, and API principles using the language’s native constructs. The reference explains general concepts with TypeScript examples. Cite its numbered rule IDs in reviews. Follow its all-on-one-line or one-item-per-line convention independently at each nesting depth.

## JavaScript

Use these bundled files for JavaScript and TypeScript projects, including React:

- [ESLint configuration](references/javascript/eslint.config.ts) defines the rules and typed project setup.
- [Prettier configuration](references/javascript/prettier.config.mjs) defines formatting.
- [Local ESLint rule implementation](references/javascript/eslint-rules.ts) implements the variable-placement policy imported by the ESLint configuration.

Read all three before adoption. Copy them together into the project root, keeping their filenames and relative imports intact. The config's opening AGENTS comment requires explicit user authorization before you change that file. The user must specify which rules to add, remove, or change. Retain the comment.

For an existing project, inspect configuration and scripts first and reconcile the requested adoption with its conventions. Do not overwrite unrelated project settings.

For a new project, replace the placeholder with this installed skill's directory and run from the project root:

```sh
skill_dir="/path/to/installed/formatting-linting"
cp "$skill_dir/references/javascript/eslint.config.ts" .
cp "$skill_dir/references/javascript/prettier.config.mjs" .
cp "$skill_dir/references/javascript/eslint-rules.ts" .
bun add --dev --exact eslint@10.13.0 @eslint/js@10.0.1 @stylistic/eslint-plugin@5.10.0 typescript-eslint@8.71.2 eslint-plugin-unicorn@78.0.0 eslint-plugin-jsdoc@65.3.15 eslint-config-prettier@10.1.8 eslint-plugin-prettier@5.5.7 eslint-plugin-react-hooks@7.1.1 eslint-plugin-react-doctor@0.9.18 prettier@3.9.9 prettier-plugin-toml@3.0.2 typescript@5.9.3 jiti@2.7.0
```

These versions match the marketplace source's resolved dependencies. ESLint loads the TypeScript configuration through `jiti`. Keep `jiti` even for a JavaScript-only project. Install runtime type declarations needed by the project, such as Bun's types for Bun code. When updating versions, check the imported presets and APIs against the installed packages and run the complete project checks.

Provide a project `tsconfig.json` that includes every owned JavaScript and TypeScript source file. Enable `strict`, `allowJs`, and `checkJs` to check owned JavaScript and TypeScript. Type-aware ESLint rules supplement the compiler checks. Match the project's runtime and module system. For a new Bun project, start with:

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowImportingTsExtensions": true,
    "allowJs": true,
    "checkJs": true,
    "strict": true,
    "noEmit": true
  },
  "include": ["./*", "src/**/*", "scripts/**/*"],
  "exclude": ["node_modules", "dist", "build", ".marketplace-build", ".marketplace-verify"]
}
```

Adapt source and output paths to the actual project. If project service reports a file outside its TypeScript program, fix the program's source coverage. Keep the type-aware rules enabled. Markdown, JSON, TOML, vendored assets, and generated output need their appropriate formatting or validation commands. JavaScript ESLint rules do not check those formats.

Add scripts using the project's package manager for ESLint with `--max-warnings 0`, Prettier checks, and `tsc --noEmit`. With Bun:

```sh
bun --bun eslint . --max-warnings 0
bun --bun prettier --check .
bun --bun tsc --noEmit
```

Run automatic fixes only within the authorized source scope. Inspect the diff. Run the checks again. Suggestions without declared automatic fixes require a deliberate edit. Include the project's existing tests and build when the changes affect behavior. Report the checked scope, results, and any remaining findings.

### Policy details

The configuration uses recommended JavaScript and Unicorn rules with TypeScript ESLint strict and stylistic type-checked presets. React files also use React Hooks and React Doctor presets. It preserves inherited rule severities and defaults unless the source config explicitly overrides them.

The shared policy disables `unicorn/no-null` and permits `null`. Compiler strict null checks still require safe handling of nullable values.

Complexity warns above 20. Try complexity warns above 1. The zero-warning command makes both rules enforceable. TypeScript files use the TypeScript equivalents of `no-use-before-define`, `no-magic-numbers`, and `no-shadow`.

Prettier uses double quotes, semicolons, two-space indentation, 120 columns, ES5 trailing commas, and LF endings. Nonconflicting ESLint Stylistic recommended rules remain active. The config lists each omitted rule and its concrete Prettier conflict. Leave a blank line after the final import before a non-import statement. Leave blank lines between class members, including single-line methods, and around class declarations. Keep TypeScript overload signatures together with their implementation.

The documentation policy uses seven `eslint-plugin-jsdoc` rules. They require declaration summaries, parameter names and descriptions, and descriptions of returned values. It covers top-level function declarations, exported functions, and module-level arrow or function-expression bindings. It also covers every class and its methods, constructors, accessors, and function-valued fields. Nested functions and callbacks do not require documentation unless they are class members.

Use descriptions that explain the caller's contract. Keep type annotations in TypeScript signatures rather than repeating them in comments. Document destructured parameter objects as inputs. Individual object properties do not each require a separate tag.

Direct void-returning routines and constructors do not require return descriptions. Declaration-only signatures require return descriptions for value annotations, including named aliases. Keep shared documentation with a stacked overload group. Preserve the inherited starless documentation-comment format.

`jdeurt/const-on-top` requires both `const` and `let` declarations before executable statements in their program, block, or static-block scope. Imports, types, functions, and variables can share the declaration prefix. Runtime declarations may use either `const` or `let` first. After switching kinds, they cannot return to the earlier kind. Ambient `declare` bindings do not select a runtime group. Each nested scope tracks its own groups, and loop-header declarations remain valid.

The rule enforces declaration order only, regardless of whitespace. The separate `@stylistic/padding-line-between-statements` rule controls blank lines.

Preserve evaluation order and dependencies when restructuring. The rule deliberately does not automatically hoist initializers.

`unicorn/consistent-function-scoping` flags functions that can move outward because they do not capture local state. It permits closures and other nested functions according to its own scope analysis. It does not ban every nested function, inline callback, or class method. Do not invent a broader function-placement restriction without the user's specified policy.
