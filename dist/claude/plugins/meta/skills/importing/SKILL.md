---
name: importing
description: "Use when adding, removing, updating, or configuring external skills and plugins in jdeurt/agents. Manage import markers, refs, and executable-content policies."
---

# Importing

Work from a checkout of `jdeurt/agents`. Read its `AGENTS.md`, `imports.toml`, `marketplace.toml`, and `docs/maintenance.md` before changing imports; the checkout's current tooling is authoritative. If only the installed plugin is available, locate or obtain the repository checkout before running these commands. Do not edit the installed plugin cache.

Use Bun TypeScript and Bun's package manager. `main` stores authored content, import declarations, and `.import` markers. Builds resolve upstream content into temporary sources and publish generated output to `marketplace`. Do not check imported directories or generated output into `main`.

## Choose what to import

Import a **skill** when adding one workflow to an existing compiled plugin. Include the directory containing `SKILL.md`, not only that Markdown file: references, assets, and allowed helper files travel with it.

Import a **plugin** when preserving a complete upstream package, including its manifests, skills, assets, and permitted integrations. Declare only clients for which the package supplies a compatible manifest. Whole-plugin imports retain native files rather than translating arbitrary components between clients.

Inspect the selected tree, manifest paths, license, script references, hooks, and local MCP commands. Select an upstream license path relative to the repository root. Imports never execute upstream installation or build scripts. Trees with symlinks or paths escaping the selected directory fail validation.

## Add and remove

Run commands at the repository root. Replace the example values with inspected paths:

```sh
bun run imports:add skill example https://github.com/owner/repository.git skills/example plugins/design/skills/example LICENSE
bun run imports:add plugin example https://github.com/owner/repository.git plugins/example plugins/example LICENSE --harness codex
bun run imports:remove example
```

Whole plugins require `--harness codex`, `--harness claude`, or `--harness both`. Review the newly registered plugin's description, category, and version in `marketplace.toml`. Source names stay short; the build adds `jdeurt-` to plugin identities.

The add command writes `imports.toml` and a sibling marker such as `plugins/design/skills/example.import` or `plugins/example.import`. The marker contains the import name; the corresponding directory must be absent on `main`. Do not nest imports inside an imported plugin.

Imports follow the upstream default branch unless `--ref <branch|tag|commit>` is provided. A branch tracks its latest commit; a commit pins content. Edit or remove `ref` in TOML to change this selection. Use `path = "."` for a plugin at the upstream repository root. There is no import lockfile.

## Configure executable content

The default omits recognized code files, executable and shebang files, and files under `scripts/` or `bin/`. Paths in `scripts` are relative to the selected import directory:

```toml
scripts = ["scripts/check.ts", "scripts/helpers.ts"]
hooks = false
local_mcp = false
```

Allow required helper files explicitly, or use `scripts = "all"` when the user wants the complete script tree. `hooks = true` separately permits hook configuration, including inline commands. `local_mcp = true` separately permits local MCP launch commands. These integrations still need any omitted script dependencies explicitly included. Remote entries in supported inline or default-file configurations remain available. Custom configuration references are omitted unless `local_mcp` is enabled.

Filtering adds an omission notice to affected skills and `IMPORT-POLICY.md`. Do not fetch, recreate, or execute excluded components to work around it. Explain a blocked dependency and change the declared policy only within the user's requested scope. The policy controls package contents; it does not sandbox agent actions or prove included code safe.

## Validate the import

```sh
bun run imports:check
bun run imports:sync
bun run build
bun run check
bun test
```

Inspect `.marketplace-build/` for expected resources, omission notices, and preserved integrations. `check` resolves upstreams again, so rebuild if an upstream changes between build and check. Keep declarations, markers, and registry changes together in the source commit. For release validation, build transformations, and publication, use `jdeurt-meta:publishing`.