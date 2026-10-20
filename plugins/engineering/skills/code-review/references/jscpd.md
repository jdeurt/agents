# jscpd capability notes

Checked 2026-10-19 against the official jscpd v5 documentation. Tool availability and supported formats depend on the installed version.

## Sources

- [Agent guide](https://jscpd.dev/guides/agents): MCP startup paths, scan refresh, clone tools, `kinds`, and incomplete result lists.
- [CLI options](https://jscpd.dev/reference/cli): analysis switches, `--kind`, debug output, reporters, and dead-code options.
- [Configuration](https://jscpd.dev/reference/config-file): project settings, scan roots, filters, and command-line precedence.
- [Clone types](https://jscpd.dev/concepts/clone-types): exact, renamed, and edited copies.
- [Cross-format detection](https://jscpd.dev/guides/cross-format): the `js-ts` preset compares JavaScript, JSX, TypeScript, and TSX.
- [Dead code](https://jscpd.dev/guides/dead-code): dependency reachability, supported languages, confidence, and Rust diagnostics.

## MCP and source coverage

The client starts the stdio server with `jscpd --mcp /absolute/project/path`. The path must identify the active project. A plugin installation path would scan the plugin instead.

The server caches its scan. `check_current_directory` refreshes the configured paths after an edit. `get_file_clones` inspects file matches. `check_duplication` compares a snippet with the scanned project.

Each clone tool accepts `kinds`. Request `exact`, `renamed`, and `similar` for this review. The `similar` kind includes gap and syntax-tree passes. Syntax-tree matching supports fewer languages than token matching and excludes test files. Preserve this limitation in the report.

Lists default to 100 entries. Total counts can exceed returned counts. Inspect notes and unavailable analyses before claiming complete coverage. Raise `limit`, inspect individual files, or use the CLI when needed.

The MCP scan root stays fixed for a running server. A tool call cannot replace it with another project. Check client startup configuration before relying on results.

## CLI and configuration

Read configuration from the active project directory. Configured paths, formats, patterns, ignores, and size thresholds affect coverage. Command-line values take precedence over corresponding settings. Preserve these restrictions unless the user authorizes a change.

The skill's fallback command enables normalization for renamed copies. It enables `--max-gap-lines 2` for edited copies and `--similarity 0.8` for related syntax trees. `--kind exact,renamed,similar` limits the report to the requested kinds. These settings do not require an embedding model.

For a configured project, inspect merged settings with `--debug` only after checking its enabled analyses. Add required analysis switches without silently replacing project restrictions. Report unavailable passes and source excluded by policy.

## Dead-code scope

Dead-code analysis uses the CLI. The documented MCP tools do not expose it. Scan the dependency context and filter findings to added code from the change baseline.

JavaScript, TypeScript, related component formats, and Python have native dead-code analysis. Rust requires supplied compiler diagnostics. Other languages need another supported checker or an explicit coverage limitation.

Static reachability can miss dynamic loading and external consumers. Check callers and runtime entry points before deleting code. Test and public-entry exports need deliberate review. Never run project build scripts solely to obtain Rust diagnostics.
