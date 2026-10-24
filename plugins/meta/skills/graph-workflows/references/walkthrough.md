# Nested parallel change-brief walkthrough

The supporting examples in `examples/` are not installable skills. Their WORKFLOW.md descriptors and node files are fixture resources within graph-workflows. These commands assume a jdeurt/agents checkout with Bun.

```sh
bun run workflow validate plugins/meta/skills/graph-workflows/references/examples/change-brief/WORKFLOW.md
bun run workflow show plugins/meta/skills/graph-workflows/references/examples/change-brief/WORKFLOW.md split
bun run workflow fork plugins/meta/skills/graph-workflows/references/examples/change-brief/WORKFLOW.md split --true review --true clarity
```

Direct validation resolves the parent's node files, paired controls, and template. It lists example:evidence-review as an unresolved demonstration identifier. The focused tests copy both descriptors into a disposable registry to validate and traverse the complete nested workflow. They do not add installed skills. Navigation does not execute node instructions.

## Supported task

Supply synthetic artifacts:

- Change facts: “The export command now accepts `--output` to choose its destination directory.”
- Evidence notes: “A focused CLI check invoked the export command with `--output` and wrote the report to the specified directory. Default destination behavior was not tested.”

Execute _start and draft. A suitable Candidate is:

> The export command accepts `--output` to choose its destination directory. A focused CLI check wrote the report there. Default destination behavior remains untested.

At split, assess both conditions. Both are true. The comments request fresh subagent review and inherited-context subagent clarity. Dispatch them concurrently when the harness supports it. Give review Candidate, Evidence, the target skill identifier, and required execution instructions. Give clarity Candidate and its own instructions. Neither branch changes Candidate or writes shared files.

The review node targets example:evidence-review directly. Execute that workflow's _start, check, and _stop. Return supported with reasons tying the candidate to the supplied check. Map the returned artifacts and arrive at gather.

The clarity branch returns its observation and arrives at gather. Wait for both selected branches. Execute gather once with their explicit outputs. The supported condition is true and the unsupported condition false. Execute _stop and fill its template.

Expected content:

```markdown
# Change brief

The export command accepts `--output` to choose its destination directory. A focused CLI check wrote the report there. Default destination behavior remains untested.

## Original review

- Verdict: supported
- Reasons and limits: The supplied check supports the selected destination. The brief preserves the untested default behavior.

## Original clarity review

The paragraph separates the change, evidence, and limitation clearly.
```

## Recovery and fallback

- Missing Evidence notes blocks _start before drafting.
- Unknown or conflicting ordinary conditions block selection.
- Missing local node files and incorrect fork/join pairing fail validation. Unresolved skill identifiers block execution until available.
- Without agents, execute both branches and the entire nested workflow inline with separate artifacts. Never claim concurrency or context control that did not occur.
- If a branch fails, retain other branch outcomes and completed effects. The example's join cannot claim successful combined review.

To exercise qualification, inject an erroneous Candidate: “The export change improves performance. One invocation completed in 200 milliseconds, but no baseline was measured.” Supply Evidence stating only that duration and absent baseline. This is fault injection. A correct draft should qualify the expectation immediately.

The nested review returns unsupported because one duration cannot establish improvement. The parent selects qualify after the join. A valid revision states that improvement remains unverified. Original review stays unsupported. Its reasons state that the revision received no second review. The clarity note also remains an assessment of the original candidate.

CLI checks establish structure and navigation. Agent execution establishes actual review, nested return, and branch completion. Neither establishes client installation or discovery.
