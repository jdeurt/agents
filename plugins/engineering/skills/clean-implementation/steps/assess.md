Inputs: Task, Context, Plan, Candidate, reuse and behavior Checks, and checkpoint Reviews.

Give unresolved findings IDs, source locations, required outcomes, and repair or blocker classifications.
Keep unrelated existing debt outside the task unless it prevents verification.

Return all artifacts, current Findings, and exactly one Outcome:

- incomplete: a missing decision, dependency, environment, permission, or required evidence prevents the next action.
- repair: no blocker remains, but repairable findings or stale required evidence remain.
- review: no blocker or repair remains, required checks and checkpoint coverage apply to Candidate, and relevant duplication findings have concrete dispositions.

Tool failures, empty test selections, unsupported formats, and missing reports cannot become passing evidence.
