---
name: workflow-authoring
description: Use when creating or revising a workflow skill with Mermaid, Markdown-backed nodes, conditional edges, nested workflows, or parallel branches.
---

# Author a workflow skill

Apply `jdeurt-meta:skill-authoring`. Read `jdeurt-meta:workflow-execution` and its `references/format.md` for the authoritative dialect. Keep readable Markdown primary.

Establish the task, audience, available inputs, expected outputs, user scope, and evidence of completion. Choose a graph when decisions or reusable workflows help the task. Define acceptance criteria before authoring.

## Create the workflow

1. Preserve required standard skill frontmatter. Add `metadata.workflow: mermaid-v1`.
2. Put the Mermaid fence first in the body. Add only optional execution-relevant Notes bullets afterward.
3. Use flowchart TD and the exact expanded start/stop and fork/join shapes from the format.
4. Put public input bullets in `steps/_start.md` and public output bullets in `steps/_stop.md`.
5. Give each ordinary node an identifier and either a Markdown filename or a plugin:skill-name target.
6. Write self-contained node files with their purpose, required inputs, instructions, and returned outputs. Use headings when helpful.
7. Use unlabeled arrows for unconditional flow. Never mix unconditional and conditional outgoing edges at one source.
8. Use conditions for observable decisions. Arrows never imply fork/join semantics by themselves.
9. For parallel work, pair Fork and Join files and map each branch's supplied inputs and returned outputs.

A Markdown filename reads from the skill's steps directory. A skill identifier can target an ordinary prose skill or workflow. Place optional agent-preference comments directly above their node declarations. No hyperlinks, graph path syntax, wrapper files, or separate call type are needed. Keep input and return descriptions in free-form bullets.

The stop file can link a Markdown output template. Notes provide shared context, never hidden flow or undeclared node inputs.

Each node must execute independently with supplied artifacts. It cannot depend on another node's wording, reasoning, history, or “previous step” references. Inherited context does not remove explicit inputs.

Use exactly `%% subagent:fresh` or `%% subagent:inherit` immediately above a node. No comment means continue on the same thread. Prefer the requested behavior when supported. Otherwise execute all work using the closest supported behavior without routine disclaimers or false capability claims. Add only requested mechanics. Do not impose execution caps or count-reporting requirements.

## Validate and exercise

In a jdeurt/agents checkout:

```sh
bun run workflow validate plugins/meta/skills/change-brief/SKILL.md --root plugins/meta/skills
bun run workflow show plugins/meta/skills/change-brief/SKILL.md split --root plugins/meta/skills
bun run workflow fork plugins/meta/skills/change-brief/SKILL.md split --true review --true clarity --root plugins/meta/skills
```

The installed executor bundles the same CLI. It checks structure, references, declared branch mappings, and control pairing. It cannot prove condition truth or node self-containment.

Exercise complete tasks with actual node instructions. Cover success, alternate decisions, missing evidence, ambiguous conditions, nested return, parallel completion and failure, and inline fallback. Check discovery separately from execution. Validate packaging for intended clients. Static checks do not establish client installation or improved task outcomes.

Request independent read-only review in a fresh context when available. Supply scope, all files, acceptance criteria, authoritative format, and actual results. Assess the seven skill-authoring areas plus self-contained nodes and fork/join semantics. Resolve findings and recheck affected cases.

Use [the evaluation cases](references/evaluation.md) for focused tests. The sibling change-brief and evidence-review skills demonstrate nested review and parallel branches. Deliver files, actual validation results, useful execution evidence, and unresolved limits.
