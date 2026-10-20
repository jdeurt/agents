---
name: coherent-editing
description: Apply coherence rules during initial writing or editing, then review all changes at the end of the turn before handoff. Covers documentation, prose, UI copy, comments, and agent instructions. Do not revisit newly written content for intermediate coherence polishing.
---

# Coherent Editing

Apply these rules at two points in the turn:

1. Apply them when first creating or editing the requested content.
2. Review all changes at the end of the turn, before the final response or handoff.

Between these points, do not revisit newly written content for coherence polishing. Leave that content until the final review. This timing governs coherence reviews.

Cover Markdown, documents, presentations, interface strings, code comments, configuration descriptions, and agent instructions, including small changes. Focus on readable content and behavior that depends on it.

Track affected files and text using the task context or existing diffs. Do not create a separate tracking document. During the final review, read the complete affected result. Make necessary corrections and recheck their dependencies within that final review.

## Preserve the intended meaning

Establish the current facts, requirements, assumptions, and reader needs before editing. Preserve accepted requirements outside the requested change. A later request does not remove earlier constraints. Shortening text must not remove necessary conditions, caveats, or instructions.

Keep scope and uncertainty accurate. Do not turn a possibility into a guarantee, a recommendation into a requirement, or a limited claim into a general one without support.

## Make the text stand on its own

Describe the current intended state directly. Remove explanations, comparisons, and consequences that only make sense in light of an earlier version. Keep revision history when the user requests it or the file's purpose requires it, such as a changelog or migration guide.

Give each passage a useful job. Remove content whose purpose no longer applies. Do not add filler to preserve length, headings, layout, or structure. Consolidate repetition unless it helps the reader use the text.

Review phrases such as “not X,” “instead of X,” and “no longer X.” Retain them when they express an active constraint, prevent a relevant mistake, or resolve a likely misunderstanding. Otherwise state the current fact or action, or remove the sentence.

## Follow the consequences of an edit

During the final review, read the complete changed text and unchanged passages that depend on it. Keep unrelated files outside the review. Check titles, summaries, examples, links, labels, captions, tables, and instructions for agreement. Search for superseded terms and synonyms, then read for meaning. Keyword searches alone do not establish consistency.

For interface copy, check associated help text, accessible names, validation, and states, including collapsed or offscreen content. For documentation and agent instructions, check referenced paths, commands, names, prerequisites, and downstream instructions. When a fact or rule changes, update every affected explanation and example.

Inspect rendered output when layout or interaction affects meaning. If you cannot inspect a relevant part, identify the limitation. Do not claim that you checked that part. Within the final review, recheck each correction. Expand that review only when a finding points to a broader dependency.

## Common editing failures

| Failure                                                                 | Correction                                                         |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------ |
| A guide narrates how its old process was removed.                       | State the current process unless history serves the reader's task. |
| A shortened setup guide loses a required prerequisite.                  | Preserve the prerequisite while removing repetition.               |
| A deleted section leaves a heading with “Nothing else is needed.”       | Remove the heading if it no longer serves a purpose.               |
| “May reduce delays” becomes “Prevents delays.”                          | Preserve the supported uncertainty.                                |
| A renamed command remains in examples or agent instructions.            | Update every affected reference.                                   |
| A field becomes optional but still has a required marker or validation. | Align the copy and dependent behavior.                             |

Finish when the affected text is accurate, necessary, internally consistent, and understandable without the editing conversation. Report unresolved limitations plainly.
