---
name: soubi
description: "Use when changing agent-plugin compilation, packaging, compatibility, or harness adapters in a Soubi-based project. Consult Soubi's existing capabilities before adding custom behavior."
---

# Soubi

Read `node_modules/soubi/package.json` and `node_modules/soubi/README.md` to identify the installed version and supported entry points. If dependencies are absent in `jdeurt/agents`, use `bun install --frozen-lockfile --ignore-scripts`. Keep package operations and repository tooling on Bun.

## Consult the official documentation

Start with the [LLM documentation index](https://soubi.vercel.app/llms.txt), then fetch only relevant pages. Use the topic URLs listed by that index, for example:

- [Plugin configuration](https://soubi.vercel.app/docs/plugin-config) for identity, targets, MCP definitions, and packaged files.
- [Architecture](https://soubi.vercel.app/docs/architecture) for the compiler flow and extension boundaries.
- [Compatibility](https://soubi.vercel.app/docs/compatibility) and [fallback tiers](https://soubi.vercel.app/docs/fallback-tiers) for support and behavior changes.
- [Adapters](https://soubi.vercel.app/docs/adapters) for native output paths and translations.

The [complete Markdown documentation](https://soubi.vercel.app/llms-full.txt) is available when a focused page is insufficient; it is large, so extract relevant sections rather than loading it indiscriminately. Read [verification notes](references/evidence.md) when updating documentation routing or checking version assumptions.

The [documentation website](https://soubi.vercel.app/docs) and [official source](https://github.com/Aniket-508/soubi) provide the same project's broader context. Match online claims to the installed version using its declarations and implementation; current documentation can describe newer behavior.

## Prefer existing functionality

Before adding a transform, identify the required behavior and check whether Soubi already handles it through configuration, assets, an adapter, or its compiler API. This repository calls `compileProject` from `soubi/compiler`; inspect `scripts/compile-plugin.ts` to understand the integration.

Use supported Soubi functionality when it preserves the intended result. Add a narrow pipeline adapter only for a verified gap, with a test demonstrating that gap and the required output. Recheck existing workarounds when upgrading; remove them when Soubi handles the behavior correctly. Do not introduce client-specific configuration into authored plugin directories to bypass the publishing layer.

Inspect compiler warnings, failures, excluded features, and output for each intended harness. Do not silently accept a dropped or changed capability. Use `bun run build`, `bun run check`, and the relevant tests to verify an integration change. For release operations and repository-specific build transformations, use `jdeurt-meta:publishing`.