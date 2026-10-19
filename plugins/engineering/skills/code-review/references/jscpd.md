# jscpd capability notes

Checked 2026-10-19 against the official jscpd 5 documentation and the installed `jscpd@5` CLI (5.4.1).

- [CLI options](https://jscpd.dev/reference/cli): `--debug` prints merged configuration; the clone flags in the skill, `--cross-formats`, `--dead-code`, and the dead-code options are documented for v5.4.1.
- [Config file](https://jscpd.dev/reference/config-file): jscpd reads configuration from the working directory. A config can select scan roots with `path` when the command names none, or narrow coverage through `format`, `pattern`, or `ignore`; CLI arguments override matching settings. The review skill runs without positional paths or scan flags when a project config exists.
- [Cross-format detection](https://jscpd.dev/guides/cross-format): the `js-ts` preset compares JavaScript, JSX, TypeScript, and TSX together; without it, token detection compares files only within each format.
- [Clone types](https://jscpd.dev/concepts/clone-types): renamed clones use identifier/literal normalization, gap and syntax-tree passes find near misses, and semantic detection is experimental. A semantic match is a review lead.
- [Dead code](https://jscpd.dev/guides/dead-code): this is a separate run for JS/TS, related component formats, and Python. Rust needs supplied compiler diagnostics. Include-tests and include-entry-exports widen reporting, but static reachability still needs human review.

The default full clone scan is limited by supported formats. Project-configured scans may cover less, by design. Structural, semantic, and dead-code passes have narrower language coverage than token matching. The skill checks merged configuration and reports the scope instead of claiming an unrestricted scan ran.
