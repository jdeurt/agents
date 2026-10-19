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

### Engineering edit hook

The Engineering plugin installs Soubi's `lint-format-edited-files` `PostToolUse` command hook for local Claude Code and local Codex. It runs with Bun after successful `Write`, `Edit`, `MultiEdit`, or `apply_patch` calls. Codex requires the user to trust the installed plugin hook. Cloud-orchestrated ChatGPT Work does not run plugin hooks; installing the plugin on the web does not deploy its scripts. The generated files are `dist/{claude,codex}/plugins/engineering/hooks/hooks.json`, four `scripts/post-edit*.ts` assets, and build-time copies of the root `eslint.config.ts` and `prettier.config.mjs`. The source hook is `plugins/engineering/hooks/post-edit.ts`.

Install Bun on the local host. If Bun is absent, the hook asks the agent to request installation. On first use, Bun installs dependencies from the packaged `hook-deps/package.json` into a private cache with install scripts disabled. The private package has no lockfile or separate runtime-version branch. The host Bun still needs to run the installed ESLint plugins; repository checks use Bun 1.4.3. The hook copies the runner into the cache so its imports resolve there, without altering the edited project. If this bounded setup fails, the hook reports the reason and leaves the edit intact. The build-copied repository configuration uses `@eslint/js` recommended, Unicorn `recommended` (there is no supported Unicorn `strict` preset), TypeScript ESLint `strictTypeChecked` plus `stylisticTypeChecked` for TS files when the project tsconfig enables strict null checks, and React Hooks' modern flat `recommended-latest`. The repository enables strict null checks and uses these type-aware presets itself. The shared configuration applies a 350-line and 120-column lint limit. It warns on the requested core ESLint and Unicorn rules and uses ESLint Stylistic to separate functions, classes, control-flow blocks, and completed switch cases, while keeping `if`/`else` chains and grouped cases together. It rejects unsafe narrowing assertions in type-aware mode and chained assertions in both modes; untrusted JSON is parsed with Zod Mini. A TS file without a suitable tsconfig uses untyped `strict` and `stylistic` rules and reports the skipped type-aware checks. It uses the project's tsconfig and never runs `tsc`, changes compiler options, or emits build files.

The hook always uses the build-copied repository ESLint and Prettier policies. It does not load the edited project's ESLint config, Prettier config, or Prettier ignore file. Disable the installed hook in the client to opt out. The ESLint Prettier plugin formats in the same pass with the bundled double-quote, semicolon, two-space, 120-column, LF defaults. ESLint applies enabled rules' declared automatic fixes; suggestions remain manual. A changed file triggers a re-read notice. The hook only writes explicitly named source files inside the current workspace, ignores common generated directories, and returns success even when lint finds errors or a tool is unavailable. Type-aware checks still need a suitable project tsconfig to supply TypeScript's program; if one is unavailable, the hook reports the skipped checks.

The shared policy adds React Doctor's framework-independent flat `recommended` preset to React files in the ESLint pass. Its `all` preset includes rules for unrelated frameworks, so the hook does not enable it across every project. The hook does not run a project-installed React Doctor CLI or load its configuration. Shell commands and arbitrary MCP tools are excluded because their output does not reliably identify the exact edited files. When lint reports findings, the agent is told to fix those caused by the edit and follow the same rules in future edits.

Cloudflare is imported as a complete native plugin from [cloudflare/skills](https://github.com/cloudflare/skills), following its default branch. Its Apache-2.0 license and remote MCP configuration are preserved. This trusted import allows all scripts, hooks, and local MCP configurations; upstream install and build scripts are still never run during import.

shadcn is imported from [shadcn-ui/ui](https://github.com/shadcn-ui/ui), with its license alongside the skill. Compiled Codex skills omit Claude's `allowed-tools` and `user-invocable` fields; Claude packages retain them.

Writing Clearly and Concisely is the portable skill snapshot supplied on the user's Desktop, including its bundled 1918 Elements of Style reference. UI/UX Design is a locally maintained skill snapshot. Client-specific metadata and icons are excluded from authored plugin sources; the publishing pipeline owns harness-specific behavior.
