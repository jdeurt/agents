Inputs: Task, latest Outcome, any Blockers, and whichever of Context, Plan, Candidate, Checks, and Reviews were produced.

Remove only task-created probes and temporary settings identified in the inventory.
Preserve observations and pre-existing work.
Report remaining artifacts when cleanup is blocked.
Refresh Candidate's diff after cleanup.
Mark artifacts and checks absent after an early stop as unavailable or unrun.

## Outputs

- Status: complete only after Outcome complete. Otherwise return incomplete.
- Resulting behavior and candidate revision or diff, when produced.
- Reused operations and concrete reasons for necessary separation.
- Necessary surrounding refactors and their verification benefit.
- Probe cleanup status.
- Requirement coverage, check results, evidence references, and independent-review status.
- Blocked or unrun checks and exact next actions.
- Relevant unrelated existing debt encountered.

Return at Task's authorized stopping point.
Completion does not authorize publication, merging, or deployment.
