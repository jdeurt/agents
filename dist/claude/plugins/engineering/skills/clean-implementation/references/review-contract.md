# Checkpoint review contract

Use a fresh, read-only reviewer at each marked checkpoint.
Supply declared inputs, applicable project rules, and the source needed to check its criteria.
Include relevant callers and transitive dependencies.
Exclude the implementer's confidence, preferred verdict, and previous reviewer assessments.

Limit review to changed or invalidated claims at the checkpoint.
Retain still-valid scope records without requesting the same assessment again.
Expand inspection when a dependency affects those claims.
Do not substitute labels or passing tool results for source inspection.

Return the inspected scope, candidate identity, and PASS or FAIL.
For FAIL, identify the criterion, location, evidence, and violated behavior or missing input.
Do not list passing criteria.

The coordinator makes repairs.
The reviewer does not edit the candidate.
Use a fresh reviewer when checking corrections.
Preserve applicable review timing and attempt limits across checkpoints.
Return incomplete if those limits prevent a required review.

Invalidate evidence when its inspected code or dependencies change.
Repeat the affected review before the next dependent stage.
Reuse unchanged evidence only for its covered claims.
Do not change requirements or weaken checks to obtain approval.

Return incomplete when required source, evidence, or independent review is unavailable.
The coordinator cannot substitute its own PASS.
