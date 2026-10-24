# Workflow evaluation cases

Use the authoritative format in `jdeurt-meta:workflow-execution`. Judge artifacts and behavior, not exact wording.

## Activation

- “Create a workflow skill for reviewing a release brief.” Select workflow-authoring.
- “Turn these Markdown steps into a graph with nested review.” Select workflow-authoring.
- A larger design task needs a reusable conditional skill. Evaluate that subtask's intent.
- “Draw a Mermaid architecture diagram.” Mermaid alone does not select workflow-authoring.
- “Run this mermaid-v1 skill.” Select workflow-execution.
- “Improve a normal prose skill.” Select skill-authoring unless a graph is requested.

## Structural checks

Accept graph-first entries with standard frontmatter and optional Notes bullets. Accept the exact requested expanded start/stop, and fork/join shapes. Check their instruction files. Accept cycles and recursive references without arbitrary execution caps.

Reject duplicate or undefined nodes, missing terminals, invalid terminal edges, unreachable nodes, trapped components, mixed unconditional/conditional outgoing edges, unsupported Mermaid statements, and broken references. Reject ambiguous ordinary branch declarations. Validate filename or plugin:skill targets and immediately preceding subagent comments. Preserve unmarked skill behavior.

Check reciprocal fork/join roles, branch mappings, disjoint branches, nested regions, and conditional branch eligibility. Reject joins with no pair, cross-branch entry, and bypasses. Navigation never executes node content.

## Execution checks

Accept ordinary prose skills as identifier targets. Reject LR orientation and graph path or hyperlink targets. Execute the change-brief example with synthetic facts and evidence. Run the nested evidence-review from _start through _stop, then return to its caller. Exercise separate agents for independent branches. The join waits for all selected branch results before continuing. Exercise selected and unselected branches, a failed branch, and artifact collisions.

Execute full inline fallback when agents are unavailable. Do not make false context or concurrency claims. Check unannotated same-thread, subagent:fresh, and subagent:inherit execution, including the closest supported fallback.

Omit a required artifact and check that execution blocks before actions. Check unknown and multiple-true ordinary conditions. Check recovery from an unsupported candidate. Review every node independently using only its declared inputs. Static file checks cannot prove semantic self-containment.

## Evidence and review

Record actual inputs, selected conditions, branch outcomes, returned artifacts, and final results. Distinguish deterministic tests, agent execution, and client installation. Use independent review after material changes and report unrun checks accurately.
