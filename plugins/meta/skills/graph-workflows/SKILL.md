---
name: graph-workflows
description: Use when creating, revising, executing, or inspecting a graph workflow skill. Define readable Mermaid workflows and run Markdown-backed nodes, skill targets, and explicit fork/join branches.
---

# Graph workflows

Use the reference for the requested task:

- **Write or revise a workflow:** read [writing guidance](references/writing.md) and the [shared standard](references/standard.md).
- **Execute or inspect a workflow:** read [execution guidance](references/executing.md) and the [shared standard](references/standard.md).
- **Validate or navigate:** use the bundled `scripts/workflow.ts` CLI as described in the execution guidance. It requires Bun.

The standard defines top-down Mermaid, filename and skill targets, unconditional and conditional edges, explicit fork/join, and subagent preference comments. Keep each node self-contained. Apply the user's scope and project rules throughout the work.
