---
name: coherent-editing
description: Keep text coherent when creating or editing files intended for people or agents to read, including documentation, prose, UI copy, comments, and agent instructions. Review affected content for stale wording, lost requirements, and broken references before handoff.
---

# Coherent Editing

Apply these rules whenever creating or editing text meant to be read by a person or an agent, including small changes. Cover Markdown, documents, presentations, interface strings, code comments, configuration descriptions, and agent instructions. Focus on readable content and behavior that depends on it.

Track affected files and text using the task context or existing diffs. Do not create a separate tracking document. After the intended edits are complete, review the complete affected result once before the final response or handoff. Recheck corrections and their dependencies as needed.

## Preserve the intended meaning

Establish the current facts, requirements, assumptions, and reader needs before editing. Preserve accepted requirements outside the requested change; a later request does not erase earlier constraints. Shortening text must not remove necessary conditions, caveats, or instructions.

Keep scope and uncertainty accurate. Do not turn a possibility into a guarantee, a recommendation into a requirement, or a limited claim into a general one without support.

## Make the text stand on its own

Describe the current intended state directly. Remove explanations, comparisons, and consequences that only make sense in light of an earlier version. Keep revision history when the user requests it or the file's purpose requires it, such as a changelog or migration guide.

Give each passage a useful job. Delete content whose purpose no longer applies. Do not add filler to preserve length, headings, layout, or structure. Consolidate repetition unless it helps the reader use the text.

Review phrases such as “not X,” “instead of X,” and “no longer X.” Retain them when they express an active constraint, prevent a relevant mistake, or resolve a likely misunderstanding. Otherwise state the current fact or action, or delete the sentence.

## Follow the consequences of an edit

Read the complete changed text and unchanged passages that depend on it. Keep unrelated files outside the review. Check titles, summaries, examples, links, labels, captions, tables, and instructions for agreement. Search for superseded terms and synonyms, then read for meaning; keyword searches alone do not establish consistency.

For interface copy, check associated help text, accessible names, validation, and states, including collapsed or offscreen content. For documentation and agent instructions, check referenced paths, commands, names, prerequisites, and downstream instructions. When a fact or rule changes, update every affected explanation and example.

Inspect rendered output when layout or interaction affects meaning. If a relevant part cannot be inspected, identify the limitation rather than claiming it was verified. Recheck each correction and expand the review only when a finding points to a broader dependency.

## Common editing failures

| Failure | Correction |
| --- | --- |
| A guide narrates how its old process was removed. | State the current process unless history serves the reader's task. |
| A shortened setup guide loses a required prerequisite. | Preserve the prerequisite while removing repetition. |
| A deleted section leaves a heading with “Nothing else is needed.” | Remove the heading if it no longer serves a purpose. |
| “May reduce delays” becomes “Prevents delays.” | Preserve the supported uncertainty. |
| A renamed command remains in examples or agent instructions. | Update every affected reference. |
| A field becomes optional but still has a required marker or validation. | Align the copy and dependent behavior. |

Finish when the affected text is accurate, necessary, internally consistent, and understandable without the editing conversation. Report unresolved limitations plainly.
