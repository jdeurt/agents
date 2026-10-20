# Repository conventions

## Code

Use Bun TypeScript.
Run `.ts` files directly with Bun.
Do not add JavaScript compilation.

Prefer Bun built-ins to new dependencies.
Use Node-compatible filesystem APIs when Bun lacks suitable directory, symlink, or permission operations.
Keep dependencies only for behavior unavailable in Bun.
Explain the need before adding a dependency.

Use the root `eslint.config.ts`, `prettier.config.mjs`, and `eslint-rules.ts`.
Fix violations without weakening rules.
Keep lint errors and warnings at zero.
Keep linted code files within 350 lines, including comments and blank lines.
Do not use unsafe narrowing assertions or chained type assertions.
Check unknown input with Zod Mini or checked control flow.

Add tests for authored lint behavior, including whitespace rules, casting checks, and custom rules.
Parameter-only changes to existing rules do not require new tests.
Lint repository-owned code only.
Format repository-owned code only.
Exclude vendored assets and generated packages.

Before each commit, run:

- `bun run lint`
- `bun run check-types`
- `bun run format:check`
- `bun run imports:check`
- `bun run build`
- `bun run check`
- `bun test`

## Imports and publication

Preserve imported third-party content and licenses.
Apply only declared import-policy filtering, omission notices, client compatibility fields, and built plugin identities.

Declare external skills and plugins in `imports.toml`.
Commit only `.import` markers for imported content.
Resolve upstream content into temporary build sources.
Never write imported content or an import lockfile to `main`.
Use the upstream default branch unless an explicit ref applies.

Use feature branches for source changes.
Target `main` with source PRs.
Keep generated plugin output and catalogs in ignored build directories or the `marketplace` branch.
Publish snapshots with `bun run publish:marketplace`.

Keep generated content out of `main`.
Keep distribution commits parentless.
Never merge distribution commits into `main`.

Keep client-specific configuration out of authored `plugins/` sources.
This includes client manifests, icons, and OpenAI metadata.
Implement client behavior in the publishing pipeline.
Use Soubi for authored client packages.
Preserve native imports for their supported clients.
Generate MCP configuration from the packaging registry.

The build bundles the root lint files in Engineering's Formatting and Linting skill.

## Writing

Apply [Coherent Editing](plugins/writing/skills/coherent-editing/SKILL.md) to all text for people or agents, including product copy.
Apply `jdeurt-writing:asd-ste100` to technical writing and agent instructions.
Do not apply it to product copy for end users.

Keep the README brief.
Put maintenance and import details in `docs/maintenance.md`.
Use built plugin namespaces and colons in cross-skill references, such as `jdeurt-meta:importing`.
Keep source directories and registry plugin names unprefixed.
