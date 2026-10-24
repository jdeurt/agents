# Workflow validation evidence

Checked 2026-10-24 with Bun 1.4.3. Only synthetic task inputs were used.

## Deterministic validation

`bun test scripts/workflow*.test.ts` passed 44 tests across the graph/reference, control, and packaging test files. The tests cover filename and prose/workflow skill targets, recursive references, exact subagent comments, top-down syntax, unconditional/conditional edge separation, malformed and unreachable graphs, containment, branch selection, nested fork/join, and ordinary join rules.

Packaging tests compile Meta for Claude and Codex, write the generated resources to temporary directories, and reload the nested workflow there. A broken marked graph fails marketplace compilation. An unmarked skill retains ordinary validation behavior.

Repository lint, type checking, formatting, import validation, marketplace build, and build verification passed. The build contains five plugins and 662 generated files. Generated content stays outside source. The complete test suite is reserved for CI.

## Independent execution and review

A fresh read-only reviewer inspected the changed code, skills, references, examples, and repository guidance. All seven skill-authoring areas passed within the tested scope. Review also checked that each node file has enough declared inputs and instructions to operate without another node's prose or hidden history.

The reviewer authored a separate temporary workflow from the guide and validated its file references and navigation. It also executed the actual change-brief example:

- Supported inputs produced concurrent evidence and clarity branches, a complete nested evidence-review return, successful join, and the final brief template.
- The evidence branch used genuinely fresh context. The clarity branch used inherited context with its explicitly supplied Candidate artifact.
- An injected unsupported performance claim produced an unsupported verdict and a qualified brief. Both evidence and clarity labels preserved their original-candidate scope.
- Missing evidence blocked before drafting. A missing branch file failed validation in a temporary fixture.
- A forced inline run executed both branches and the nested workflow completely without claiming concurrency.
- Ambiguous conditions blocked navigation.

The review found and corrected join validation after role resolution, repeated-heading compatibility for ordinary skills, stale unconditional-edge guidance, and the clarity output's review scope. A recheck found no remaining material findings.

## Review limits

Type-1, Type-2, and Type-3 duplicate scans covered repository-owned source, excluding dependencies, generated packages, and Git data. Added-code matches were reviewed. Remaining matches are intentional test assertion structures or import blocks. A project-context dead-code scan found only test-referenced helpers and constants among the added code. No unresolved added-source finding remained.

Coherent Editing and ASD-STE100 review covered the changed instructions and prose. The structural linter reported three synonym suggestions around the technical verbs check and validate. Those distinguish task checks from CLI validation and were retained after review. The linter does not establish dictionary certification.

Actual Claude/Codex installation and model discovery were not exercised locally. The forced fallback establishes inline behavior, not execution on every unavailable-capability harness. Natural-language condition truth, node self-containment, and input/output mapping still require agent judgment. No task-outcome improvement claim is made.

Current Toolkit testing guidance was not accessible through the available repository search. Evaluation followed this repository's current skill-authoring and code-review guidance. The requested Mermaid shapes were checked against the official source linked in workflow-execution's evidence reference.
