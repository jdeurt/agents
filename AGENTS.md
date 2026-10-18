# Repository conventions

**Bun TypeScript is the language of choice** for this repository. Run `.ts` files directly with Bun; do not add a JavaScript compilation step. `prettier.config.mjs` is the shared ESM formatting configuration.

Prefer Bun built-ins over new dependencies: `Bun.file`/`Bun.write`, `Bun.TOML`, `Bun.YAML`, `Bun.CryptoHasher`, `Bun.spawn`/`Bun.spawnSync`, and `bun:test`. Use Node-compatible filesystem APIs for directory, symlink, and permission operations that lack a suitable Bun equivalent. Keep dependencies only where Bun does not provide the required behavior; explain that need before adding one.

Use the root ESLint and Prettier configuration in this repository. Engineering copies these same files into its edit hook at build time. The ESLint policy uses recommended JavaScript and Unicorn rules, TypeScript ESLint strict and stylistic type-checked rules, consistent type imports, and a 350-line limit including comments and blanks. It bans unsafe narrowing assertions and chained type assertions; validate unknown input with Zod Mini or checked control flow. React Hooks `recommended-latest` and React Doctor `recommended` apply to React files. Prettier uses double quotes, semicolons, two-space indentation, 120-column formatting, ES5 trailing commas, and LF line endings. React rules do not apply to this repository's CLI tooling.

Preserve imported third-party content except for declared import-policy filtering, omission notices, client compatibility fields, and built plugin identities. Lint and format repository-owned code, not vendored skill assets or generated packages. Declare external skills and plugins in `imports.toml` and commit only their `.import` markers. Resolve upstream content into temporary build sources; never write imported content or an import lockfile to `main`. Default to the upstream default branch, with optional explicit refs.

Run `bun run lint`, `bun run check-types`, `bun run format:check`, `bun run imports:check`, `bun run build`, `bun run check`, and `bun test` before committing. Generated plugin output and marketplace catalogs belong only in ignored build directories and the `marketplace` branch.

Edit source on `main`. Publish generated snapshots to `marketplace` with `bun run publish:marketplace`. Keep generated content out of `main`. Distribution commits have no parents and must never be merged into `main`. Keep harness-specific configuration out of authored `plugins/` sources, including client manifests, icons, and OpenAI metadata. Implement any required harness-specific behavior as supporting functionality in the publishing pipeline. Generate Mobbin and Bun MCP configuration from the packaging registry.

When creating or editing text intended for people or agents, apply [Coherent Editing](plugins/writing/skills/coherent-editing/SKILL.md). Keep the README brief; put maintenance and import details in `docs/maintenance.md`.

Cross-skill references in skill files use the built plugin namespace and a colon, such as `jdeurt-meta:importing`. Source directories and registry plugin names remain unprefixed.
