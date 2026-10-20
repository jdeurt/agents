# Maintenance

Bun TypeScript is the language of choice. Use Bun 1.4.3 and Git. Prefer Bun's built-in file I/O, TOML/YAML, hashing, subprocesses, and test runner. ESLint and Prettier enforce the repository's formatting and lint rules.

`main` contains authored plugins, `marketplace.toml`, and external dependencies in `imports.toml`. Each dependency has a `.import` marker containing its import name at the destination: `plugins/design/skills/shadcn.import` becomes the entire `plugins/design/skills/shadcn/` directory during a build. A whole-plugin marker lives at `plugins/<name>.import`. Imported directories and an import lockfile are never committed to `main`.

## Imports

```sh
bun run imports:add skill example https://github.com/owner/repository.git skills/example plugins/design/skills/example LICENSE
bun run imports:add plugin example https://github.com/owner/repository.git plugins/example plugins/example LICENSE --harness codex
bun run imports:remove example
bun run imports:sync
```

The add command writes `imports.toml` and the marker. Whole-plugin imports also register a native plugin in `marketplace.toml`; review its description, category, version, and supported clients. The registry name is applied to the packaged plugin manifest. Use `--harness claude` or `--harness both` when the upstream supplies those manifests. Native plugins retain their files, MCP configuration, hooks, and assets; they are not automatically translated between clients.

By default, each build fetches the latest commit from the upstream default branch. Add `--ref <branch|tag|commit>` for an explicit source selection. A branch tracks its tip; a commit pins the content. Edit or remove `ref` in `imports.toml` to change that choice. `path = "."` imports the repository root. The license path is relative to that repository root.

`imports:sync` resolves imports and builds packages into ignored `.marketplace-build/`. It leaves authored files and markers untouched. Upstream install and build scripts are never executed. Imported trees must be self-contained, with no symlinks. The import process copies the full selected directory and its upstream license.

## Imported code policy

Imports omit recognized code files, executable files, shebang scripts, and files under `scripts/` or `bin/` by default. Use paths relative to the imported directory to allow specific files:

```toml
scripts = ["scripts/check.ts", "scripts/helpers.ts"]
hooks = false
local_mcp = false
```

Set `scripts = "all"` to retain every script. Allowed scripts must exist; include their required helper files explicitly. `hooks = true` retains hook configuration, including inline shell commands. `local_mcp = true` retains local MCP launch commands. These flags are independent of file inclusion; allow any script files those integrations need. Remote entries in supported inline or default-file configurations remain available. Custom configuration references are omitted unless `local_mcp` is enabled.

When content is omitted, the build appends an explanation to each included `SKILL.md` and adds `IMPORT-POLICY.md`. The note instructs agents not to download, recreate, or execute omitted components to bypass the policy. This is a packaging policy, not a sandbox or malware scanner: agent instructions can still request commands, and included code remains subject to the client's execution permissions.

Source plugin names stay short. Build output prefixes plugin manifest and catalog names with `jdeurt-`, giving command namespaces such as `jdeurt-design`. Upstream prose and scripts are not rewritten to translate hard-coded names.

## Validation and publication

```sh
bun install --frozen-lockfile --ignore-scripts
bun run lint
bun run check-types
bun run format:check
bun run imports:check
bun run build
bun run check
bun test
```

`build` fetches current imports into temporary sources and writes compiled plugins and local-path catalogs into ignored `.marketplace-build/`. `check` independently resolves current upstreams and compares the generated output; an upstream change between these commands requires rebuilding.

`bun run publish:marketplace` requires a clean checkout at current `origin/main` and Git push access. It resolves imports once, builds and verifies that same content, and publishes the generated catalogs, client plugin directories, and README to `marketplace`. `--dry-run` validates the snapshot without changing Git refs.

Each changed snapshot replaces `marketplace` with a single parentless commit. Identical trees are skipped. A force-with-lease prevents overwriting concurrent branch changes, and a source check rejects a build when `main` advances. This branch has separate history from `main`; never merge it into source. GitHub has no per-branch artifact setting to disable pull-request suggestions.

GitHub Actions validates changes and publishes after pushes to `main`, nightly at 10:17 UTC, or on manual dispatch. It uses the built-in Actions token with `contents: write`, then smoke-tests the published branch in Codex. It never writes generated content to `main`. The publisher hashes each compiled plugin before versioning. Changed content advances its previous patch version unless the authored version is newer. Unchanged content retains its version. Hashes and release versions live only in generated `.publication.json` on `marketplace`.

## Installation

Use the branch-qualified commands in the README. The repository is private, so clients need GitHub read access. Bun remains the repository's package manager; plugin distribution uses Git.

ChatGPT Web workspace admins can use **Admin > Plugins > Add > Import marketplace** with Source `https://github.com/jdeurt/agents`, Branch `marketplace`, and Path empty. Authorize a GitHub account with repository access. The importer supports branches, tags, or commits; branches receive future updates, with daily sync enabled by default. See [workspace import and sync](https://learn.chatgpt.com/docs/enterprise/plugin-management#configure-a-marketplace-sync).

Imported plugins declaring MCP servers are desktop-only, including remote HTTPS servers. This applies to Design, Engineering, and Cloudflare. Writing and Meta contain skills without MCP declarations. Web integrations require registered app references generated by the publishing pipeline; branch support alone does not make an MCP plugin Web-compatible. See [desktop-only restrictions](https://learn.chatgpt.com/docs/enterprise/plugin-management#desktop-only-plugins). Actual workspace import and service authentication must be verified in the target workspace.

## Compatibility and attribution

### Engineering formatting and linting

Engineering provides the `jdeurt-engineering:formatting-linting` skill for setting up project formatting and linting and fixing findings. Its JavaScript section links the bundled `references/javascript/eslint.config.ts`, `prettier.config.mjs`, and `eslint-rules.ts`. The build copies these files from the repository root into the skill for both clients; existing packaging validation compares the copies with their sources. Adopt all three files together so local rule imports resolve. The skill documents compatible pinned dependencies, the TypeScript config loader, project source coverage, and check commands. It uses the project's package manager, with Bun preferred for new Bun projects. Engineering installs no automatic edit hooks.

The shared repository configuration uses `@eslint/js` recommended, Unicorn `recommended` (there is no supported Unicorn `strict` preset), TypeScript ESLint `strictTypeChecked` plus `stylisticTypeChecked` for source files in type-aware mode, and React Hooks' modern flat `recommended-latest`. The repository enables strict null checks and `allowJs`, applying these type-aware presets and project service to authored JavaScript and TypeScript files (`.js`, `.jsx`, `.mjs`, `.cjs`, `.ts`, `.tsx`, `.mts`, and `.cts`). Its TypeScript program includes owned source across the repository with `**/*`, excluding `node_modules/`, `dist/`, `.marketplace-build/`, and `.marketplace-verify/`.

The shared configuration applies a 350-line lint limit and a 120-column Prettier formatting target. It requires braces for control flow, while concise arrow expressions remain valid. Unicorn rules without an explicit override use their recommended error severities and default options. Core `complexity` remains a warning with its default maximum of 20; `unicorn/try-complexity` remains a warning with its default maximum of 1. `bun run lint` rejects any warning. TypeScript files retain the `@typescript-eslint` equivalents of `no-use-before-define`, `no-magic-numbers`, and `no-shadow`, with the corresponding core rules disabled.

Repository ESLint checks authored JavaScript and TypeScript source. Markdown, TOML, JSON, and imported or generated content are outside those lint inputs; formatting, import-policy checks, schemas, and build validation cover their applicable constraints separately. The build verifies the generated distributions, including the bundled policies.

ESLint Stylistic applies every nonconflicting `recommended` rule with its default severity and options. The explicit class-spacing policy takes precedence over the preset: blank lines separate class members, including single-line methods, and class declarations, including exported declarations. TypeScript function and method overload signatures stay together with their implementation, including exported functions. Statement spacing requires a blank line after the final import before any non-import statement, while consecutive imports may remain together. It also separates functions, complete try/catch/finally statements, control-flow blocks, and completed switch cases, while keeping `if`/`else`, `try`/`catch`/`finally`, and grouped cases together. Only these recommended Stylistic rules are omitted because they conflict with the shared Prettier policy:

| Rule                                     | Conflicting Prettier behavior                                                                                          |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `@stylistic/arrow-parens`                | `arrowParens: "always"` retains parentheses that the preset's `as-needed` removes.                                     |
| `@stylistic/brace-style`                 | Prettier keeps `else`, `catch`, and `finally` beside the closing brace; Stroustrup requires a new line.                |
| `@stylistic/comma-dangle`                | `trailingComma: "es5"` omits multiline function argument and parameter commas required by the preset.                  |
| `@stylistic/indent-binary-ops`           | Prettier indents wrapped string concatenation arguments further than the preset permits.                               |
| `@stylistic/member-delimiter-style`      | Prettier uses TypeScript member semicolons; the preset requires no multiline delimiter and inline commas.              |
| `@stylistic/operator-linebreak`          | Prettier can leave assignment and logical operators at line ends; the preset requires operators before their operands. |
| `@stylistic/quote-props`                 | Prettier quotes only necessary object keys; `consistent-as-needed` also quotes sibling keys.                           |
| `@stylistic/quotes`                      | `singleQuote: false` uses double quotes; the preset requires single quotes.                                            |
| `@stylistic/semi`                        | `semi: true` requires semicolons; the preset forbids them.                                                             |
| `@stylistic/jsx-one-expression-per-line` | Prettier retains mixed inline JSX text and expressions, such as `<p>Hello {name}!</p>`.                                |
| `@stylistic/multiline-ternary`           | Prettier can wrap a JSX ternary branch while keeping the condition and `? (` on one line.                              |

The policy rejects unsafe narrowing assertions in type-aware mode and chained assertions in both modes; untrusted JSON is parsed with Zod Mini. Projects adopting the configuration need strict null checks and a TypeScript program covering all owned JavaScript and TypeScript source. Resolve program coverage errors rather than dropping type-aware rules.

The local `jdeurt/no-magic-strings` error allows inline strings up to 10 characters and requires named constants for longer values. Its `minLength` option defaults to 10, with the boundary included in the allowed range. Static constant declarations, including static arrays and objects, are allowed; inline paths and user-facing call arguments longer than 10 characters must be extracted. Object and class property keys, module sources, TypeScript literal syntax, and directives are exempt. Template and JSX text are checked too. `jdeurt/const-on-top` requires both `const` and `let` declarations before executable statements in their program or block scope. Imports, type declarations, function declarations, and variable declarations can share the leading declaration prefix, and loop-header declarations remain valid. Consecutive declarations of the same kind may stay together. Leave a blank line after the final `const` or `let` before another kind of declaration or other code. It offers no automatic hoist that could change evaluation order.

The inherited `unicorn/consistent-function-scoping` error flags functions that can move to an outer scope because they do not capture local state. Closures that capture locals, inline callbacks, and class methods remain valid where the rule permits them. `no-inner-declarations` and `max-nested-callbacks` do not express a general restriction on nested functions. The shared configuration adds no blanket function-placement restriction.

The shared policy adds React Doctor's framework-independent flat `recommended` preset and React Hooks' `recommended-latest` to React files. React Doctor's `all` preset includes rules for unrelated frameworks, so it is not enabled across every project. ESLint applies enabled rules' declared automatic fixes; suggestions remain manual. After fixing findings, review the diff and run formatting, linting, type checks, and the project's applicable tests and build.

### Imported sources

Cloudflare is imported as a complete native plugin from [cloudflare/skills](https://github.com/cloudflare/skills), following its default branch. Its Apache-2.0 license and remote MCP configuration are preserved. This trusted import allows all scripts, hooks, and local MCP configurations; upstream install and build scripts are still never run during import.

shadcn is imported from [shadcn-ui/ui](https://github.com/shadcn-ui/ui), with its license alongside the skill. Compiled Codex skills omit Claude's `allowed-tools` and `user-invocable` fields; Claude packages retain them.

Writing Clearly and Concisely is the portable skill snapshot supplied on the user's Desktop, including its bundled 1918 Elements of Style reference. UI/UX Design is a locally maintained skill snapshot. Client-specific metadata and icons are excluded from authored plugin sources; the publishing pipeline owns harness-specific behavior.

Writing imports [ASD-STE100](https://github.com/danyuchn/asd-ste100-skill) from the upstream default branch. Keep its description and activation conditions unchanged. The build moves an imported top-level `version` into `metadata.version` for portable skill metadata. Different values in those two fields fail import validation.

The import includes its MIT license, examples, references, and `scripts/ste-lint.py`. This Python script uses only the standard library. Run it for the structural checks described in the skill.

Review meaning and technical terms separately. The skill does not include the official ASD word dictionary or certify compliance with that dictionary.
