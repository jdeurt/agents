# Execute a workflow skill

Read [the standard](standard.md). Read the entry graph, optional Notes, public Inputs in `steps/_start.md`, and public Outputs in `steps/_stop.md`. Read any template linked by the stop file. Establish supplied artifacts and authorized actions. A workflow grants no additional permissions.

Validate before actions. With Bun available, run the installed CLI:

```sh
bun /path/to/graph-workflows/scripts/workflow.ts validate /path/to/entry/SKILL.md --root /path/to/plugin/skills
```

Use actual paths. Omit the bundle root for a standalone workflow. Without Bun, inspect graph and references directly. Do not execute unresolved structural errors.

## Execute the graph

Begin at _start. Before each node, read its Markdown file and explicitly supply required inputs. The file defines what the node does. Ordinary nodes have no separate step/call taxonomy. A filename reads from this skill's steps directory. A plugin:skill identifier executes that skill, whether ordinary prose or a workflow.

Require each node to stand alone with its purpose, inputs, instructions, and returned outputs. Prior results enter only as supplied artifacts. Another node's prose, reasoning, or execution history cannot be a hidden prerequisite.

Execute within user scope and retain declared outputs. An unlabeled edge is unconditional. A node cannot mix unlabeled and conditional outgoing edges. At ordinary decisions, assess every condition and select exactly one true edge. Unknown or ambiguous conditions block. Execute _stop's content before returning.

Use `show FILE NODE` to inspect a node and `next FILE NODE` to navigate an ordinary decision:

```sh
bun /path/to/graph-workflows/scripts/workflow.ts next entry/SKILL.md gather --true _stop --false qualify --root /path/to/plugin/skills
```

The CLI validates and navigates. It does not execute node instructions, judge natural language, create agents, or retain execution state.

## Context and workflow invocation

Read `%% subagent:fresh` or `%% subagent:inherit` immediately above a node as its execution preference. No comment means continue on the same thread. Fresh requests a separate agent with only explicit inputs and necessary instructions. Inherit requests the context the harness can inherit.

Use the closest supported behavior when any capability is unavailable. Execute the complete work, including inline execution when needed. No routine capability disclaimer is necessary. Never claim context or concurrency that did not occur. Explicitly supply required artifacts in every mode.

Resolve skill identifiers through the installed registry. Use local resolution when the CLI identifies a matching plugin. Resolve any listed external identifiers before execution. Supply explicit inputs from available artifacts. If a target has no formal input contract, follow its own instructions and the user task. Clarify missing or ambiguous mappings.

Execute an ordinary prose skill according to its instructions. Execute a workflow skill from _start through _stop. Suspend the parent until completion. Retain declared returned outputs before assessing parent edges. Propagate failed or blocked execution. Never skip the skill or invent missing results.

## Fork and join

Read the node file to distinguish Fork from Join. Assess every fork condition before dispatch. Use `fork FILE NODE` with assessments to inspect all eligible branches. Unlabeled fork edges select all branches.

Run selected branches concurrently using separate agents when available, following their annotation preferences. Pass explicit branch inputs, relevant files and Notes, paired join, and effect ownership. Keep branch artifacts separate. If the harness cannot follow a preference, execute every selected branch using the closest supported behavior without false capability claims.

Each branch returns at the paired join. Wait for all selected branches, then execute the join once and merge mapped outputs. Propagate branch failures unless the join's instructions define authorized recovery. Preserve completed effects and inspect uncertain outcomes before retrying.

## Complete and recover

Return the stop file's declared outputs using its optional template. Report useful evidence and unresolved limits. For failed or blocked runs, identify the node, call or branch path, completed effects, missing inputs, and recovery action. Resume only while checkpoint artifacts remain valid.

Follow the graph's conditions and authorized task without adding execution caps or mandatory count reports. Read [the walkthrough](walkthrough.md) for the nested parallel example.
