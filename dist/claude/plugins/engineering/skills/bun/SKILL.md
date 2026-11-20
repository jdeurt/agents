---
name: bun
description: "Develop and troubleshoot Bun TypeScript projects using Bun's built-in utilities and official documentation MCP. Use for Bun runtime, package management, testing, and build tasks."
---

# Bun TypeScript

Use the Bun documentation MCP bundled with the engineering plugin at `https://bun.com/docs/mcp` to establish current APIs and version support before implementing Bun-specific behavior.

Search with `search_bun`, then retrieve the relevant page with `read_bun_page`. Use `list_bun_pages` to discover a topic and `grep_bun` for exact API names. Read the exposed tool schemas before calling them. Cite the documentation URLs returned by the server. If the MCP is unavailable, report the connection problem; do not substitute Markdown indexes or another documentation source.

Prefer Bun's native TypeScript execution, package manager, test runner, and built-in utilities over additional packages. Check for an appropriate Bun API before adding a dependency. Preserve required semantics, including error handling, permissions, encoding, and validation; use a library only when Bun does not provide the needed behavior.

Use the project's pinned Bun version and verify API availability against it. Run TypeScript directly with Bun and use `bun:test` for tests. Bun executes TypeScript without providing a complete type check, so retain the project's type-check command. Respect established linting and formatting rules.