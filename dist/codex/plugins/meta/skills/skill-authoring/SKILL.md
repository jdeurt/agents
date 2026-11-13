---
name: skill-authoring
description: "Use when creating, revising, or reviewing agent skills. Define precise activation, useful workflows, portable resources, and evidence-based validation."
---

# Skill authoring

Keep authoring instructions out of the target skill unless authoring is its task. Produce a skill that improves a recurring task through useful decisions, workflow knowledge, or resources, rather than repeating general model capabilities.

## Establish purpose and context

Identify the audience, expected inputs, task boundaries, observable result, and evidence of completion. Read project instructions and related skills. Update an existing skill when its purpose fits; split workflows only when their triggers or success criteria differ materially.

Choose invocation from the user's requirements and packaging constraints. Prefer automatic discovery for recognizable tasks. Start automatic descriptions with `Use when` and a precise request or workflow condition, followed by the capability. For explicit-only skills, describe the capability without an automatic trigger and preserve `metadata.invocation: explicit`; the packager produces client controls. Use ordinary intent language rather than broad topic lists.

Identify authoritative code, documentation, data, and standards. State when to read them and what they establish. Embed essential decisions missing from those sources, verify changing capability claims before relying on them, and distinguish genuine limitations from generic hedging.

Use another skill only for a necessary dependency or handoff. Normally rely on automatic selection when it covers the activity; preserve explicit references the user requests. Make the current skill understandable on its own and explain when and why a referenced workflow is needed. In this repository, write cross-skill references as `jdeurt-<plugin>:<skill>`, for example `jdeurt-meta:publishing`. Source plugin directories and registry names stay unprefixed; references already use the built identity. Colons separate plugin and skill, not parts of a plugin name.

## Write the finished skill

Cover these seven areas without turning each into boilerplate:

1. **Activation:** Make intended requests and nested workflow activities distinguishable from nearby out-of-scope tasks. Preserve explicit-only behavior when required.
2. **Context:** Route to authoritative sources and explain necessary dependencies or handoffs without copying their instructions.
3. **Workflow:** Supply the inputs, decisions, tools, operations, correctness constraints, results, and failure handling needed for completion. Use live tools for live facts and actions. Require a fixed sequence only when order protects an invariant. Honor user scope, project rules, and existing approvals; a skill grants no new permissions. Use examples to clarify difficult boundaries, stripping incidental identifiers.
4. **Wording:** Give short, direct instructions with consistent terms. Preserve facts, permissions, technical meaning, and uncertainty. Explain unusual constraints only when the reason changes a decision or prevents a likely error. State conditions, exceptions, and completion criteria explicitly; use `only when` for exclusive conditions and avoid generic hedges.
5. **Organization:** Keep core decisions in `SKILL.md`. Put substantial detail in focused resources linked directly where needed, with reading conditions. Give each file one purpose and maintain one authoritative copy of each rule. Add scripts, templates, or assets only when they materially help; remove unused files and duplication.
6. **Evidence:** When research informs decisions, preserve a focused synthesis in a supporting reference: source titles and URLs, check dates, relevant versions, and the rules justified. Separate source claims from conclusions and retain limitations. Link it with explicit reading conditions; do not bundle raw logs or manuals.
7. **Portability:** Use YAML frontmatter with `name` and `description`, a lowercase hyphenated name matching the skill directory, and relative resource paths. Declare required tools, access, and environment constraints rather than assuming availability. Keep content vendor-independent unless the task requires otherwise. Keep client manifests, icons, and OpenAI UI metadata out of authored `plugins/`; the packager owns them. Do not embed credentials, personal paths, temporary state, or unverified changing facts.

Read [the evidence notes](references/evidence.md) when checking format assumptions or revising these conventions. Research new domain claims from their own authoritative sources.

## Evaluate and review

Set acceptance criteria before tuning. Evaluate activation separately from execution: cover direct requests, paraphrases, work nested in broader tasks, and nearby requests that should not activate the skill. For changed workflows, exercise complete representative tasks and relevant failures, such as missing inputs, unavailable dependencies, conflicting sources, and unfamiliar but in-scope situations.

When claiming improvement, compare runs with and without the skill under equivalent conditions and fresh contexts. Judge artifacts and outcomes, not compliance with prescribed wording. Inspect traces only when a required process affects correctness. Use a defined rubric for qualitative results and blind comparisons when reviewer knowledge could bias them. Measure time or tokens when efficiency matters and repeat variable results.

Validate metadata, bundled paths, and packaging separately from task outcomes. Check each intended client or model when discovery, permissions, tools, or packaging behavior changes. Report checks outside scope as unrun and provide useful evaluation cases; do not claim demonstrated improvement without evidence.

After authoring or materially revising a skill, request an independent, read-only reviewer in a fresh context when delegation is available. Supply user scope, purpose, inputs, expected results, invocation and reuse decisions, authoritative sources, all skill files, intended clients, and evaluation/build results or explicit unrun status. Have the reviewer read all in-scope files and assess each of the seven finished-skill areas as pass, violation, or not applicable with evidence. Resolve missing evidence before calling an area passed; report violations with locations and impact. Recheck affected areas after fixes. For review-only work, return findings without recursively requesting another reviewer. If independent review is unavailable, disclose that limit rather than treating self-review as a replacement.

## Maintain and deliver

Turn demonstrated failures into regression cases. For selection failures, inspect discovery and descriptions; for execution failures, inspect workflow and resources. Reevaluate affected behavior when tools, models, requirements, or standards change. Remove obsolete workarounds, unnecessary steps, and guidance that equivalent testing shows adds no benefit; do not generalize a single unusual incident into a broad rule.

Refresh evidence when its sources or assumptions change. Read the complete edited result for contradictions, stale references, overlapping purposes, and lost requirements. Deliver the skill with verification results and unresolved limits. Publish only within the requested scope; for this marketplace's release process, use `jdeurt-meta:publishing`.