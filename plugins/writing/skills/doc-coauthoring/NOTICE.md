# Attribution and adaptation notice

This skill is adapted from **Anthropic’s doc-coauthoring skill**, authored in the
[anthropics/skills repository](https://github.com/anthropics/skills).

- Source: [skills/doc-coauthoring/SKILL.md](https://github.com/anthropics/skills/blob/dbd4588f9e1033efb41dad4bef2f7947c8993d44/skills/doc-coauthoring/SKILL.md)
- Upstream revision: `dbd4588f9e1033efb41dad4bef2f7947c8993d44`
- Retrieved: 2026-10-19
- Licensing basis: inferred Apache License 2.0; see [LICENSE.txt](LICENSE.txt) and the qualification below.

The upstream [README](https://github.com/anthropics/skills/blob/dbd4588f9e1033efb41dad4bef2f7947c8993d44/README.md)
says many skills are open source under Apache 2.0, distinguishing them from
the separately licensed document-processing skills (`docx`, `pdf`, `pptx`, `xlsx`).
The upstream [marketplace declaration](https://github.com/anthropics/skills/blob/dbd4588f9e1033efb41dad4bef2f7947c8993d44/.claude-plugin/marketplace.json)
lists doc-coauthoring under `example-skills`. Together these support the inference
that Apache 2.0 applies to this example skill; neither is an explicit per-skill
license declaration. The source skill has no separate license or copyright notice,
and the inspected repository root has no LICENSE file. Upstream licensing remains
ambiguous; this adaptation retains the inferred license rather than claiming an
explicit upstream grant. The repository’s `THIRD_PARTY_NOTICES.md` concerns
software and fonts that are not included in this text-only adaptation.

## Changes in this version

Modified by jdeurt/agents: replace Claude-specific terminology with generic agent
terminology; replace product settings, artifact tool names, image-access claims,
and reader-testing UI assumptions with capability-dependent instructions and
fallbacks. Preserve context and audience gathering, outline selection, section
brainstorming and curation, targeted drafting and revision, and fresh-reader testing.
The automatic activation description follows this marketplace’s `Use when` convention.

This is an authored adaptation requested for this marketplace, rather than an
unmodified, automatically synchronized import. No upstream dependencies or assets
are bundled. This notice documents provenance; it is not an additional workflow step.
