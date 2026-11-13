# Authoring evidence

Read when revising format, packaging, or namespace conventions. Checked 2026-10-17; verify live documentation before relying on version-sensitive behavior.

- [Agent Skills specification](https://agentskills.io/specification): skills use `SKILL.md` with YAML name and description, matching directory names, relative supporting resources, and progressive disclosure. This supports the portable structure and selective-reading guidance.
- [Claude Code plugin manifest reference](https://code.claude.com/docs/en/plugins-reference#name): plugin identifiers forbid colons; component namespaces use the plugin identifier. This supports `jdeurt-meta:importing` references with a hyphenated plugin name.
- [OpenAI plugin packaging](https://developers.openai.com/plugins/build/plugins): client manifests, MCP configuration, and component packaging have distinct roles. This repository keeps client configuration in the packaging layer rather than authored skill directories.

The `jdeurt-` prefix and Bun-based workflow are repository conventions, not requirements of the Agent Skills format. Outcome-based evaluation, controlled comparisons, and independent review are authoring practices; their value for a particular skill must be demonstrated rather than assumed. These sources do not establish that a skill improves every task or works identically in every client.
