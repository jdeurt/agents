# Design basis

Sources checked 2026-10-25.
Verify the installed detector's capabilities before selecting commands.

## Sources and supported decisions

- [Pocket agent instructions](https://github.com/jdeurt/codex-pocket/blob/main/AGENTS.md) support explicit changing inputs, deterministic decisions, effect owners, transitive inspection, caller-owned failure policy, cleanup, and queue completion.
  This workflow does not adopt Pocket's language syntax restrictions, library choices, paths, or framework rules.
- [Toolkit skill authoring](https://github.com/develop-health/toolkit/blob/main/plugins/foundation/skills/skill-authoring/SKILL.md) supports specific activation, self-contained decisions, evidence, selective resources, and independent review.
- [Toolkit writing tests](https://github.com/develop-health/toolkit/blob/main/plugins/engineering/skills/writing-tests/SKILL.md) supports real application workflows, independent expectations, meaningful assertions, existing-test reuse, and independent review.
- [Toolkit verify behavior](https://github.com/develop-health/toolkit/blob/main/plugins/engineering/skills/verify-behavior/SKILL.md) supports focused editing checks and affected feature-area verification.
- [Graph Workflows standard](https://github.com/jdeurt/graph-workflows/blob/main/skills/graph-workflows/references/standard.md) defines mermaid-v1, instruction paths, explicit artifacts, exclusive outcomes, and fresh-review annotations.
  Its CLI validates navigation and local references.
  It cannot establish natural-language condition truth or implementation correctness.
- [jscpd reference](https://github.com/kucherenko/jscpd/blob/master/skills/jscpd/SKILL.md) describes exact, renamed, and structural clone detection with format-specific limitations.
  [Current upstream documentation](https://github.com/kucherenko/jscpd/blob/master/README.md) includes baseline comparison.
  Installed versions can differ.
  Normalized matches require source inspection.
  Experimental semantic services are not required.

## User-specified policy

Design behavior scenarios before implementation.
Use temporary probes during implementation.
Add or change permanent tests after implementation.
Return difficult correct tests to implementation.
Permit the smallest necessary surrounding refactor.

Use focused fresh reviewers during development.
Boundary review checks implementation before permanent test work.
Test review checks scenarios and application paths.
Final review checks integration and evidence.
Preserve still-valid evidence and route repairs to the responsible stage.

## Existing workflow assessment

Toolkit's test-writing and verification skills cover specialist testing decisions.
Its shipping workflow covers PRs, merges, and deployment.
The [Graph Workflows coding example](https://github.com/jdeurt/graph-workflows/blob/main/skills/graph-workflows/references/examples/write-code/WORKFLOW.md) is the closest orchestration reference.
This adaptation adds reuse discovery, probe sequencing, testability repair, clone disposition, focused reviews, and incomplete outcomes.

The existing `jdeurt-engineering:code-review` skill reviews completed code changes.
This workflow adds intermediate checkpoints rather than replacing that review capability.

## Evidence limits

Clone reports and behavioral helper searches provide complementary evidence.
Their combination is a design choice, not a demonstrated improvement claim.
Reviewers inspect source and relevant dependencies.
Their approval covers only inspected claims and evidence.
No comparative development-task evaluation establishes efficiency or correctness improvement for this draft.
