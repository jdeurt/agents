Inputs: Task, Context, Plan, and any prior Candidate, probe inventory, or checkpoint scope records.

Implement through the selected owners and reusable operations.
Preserve shared inputs and keep local mutation private.
Keep business decisions outside effectful runtime owners.
Create abstractions for meaningful operations or independently owned lifecycles.
Collapse forwarding layers.

Keep failure policy with the caller that can choose propagation, retry, or fallback.
Preserve the original failure, cancellation, early returns, and unconditional cleanup.
Track queue completion separately from operation success.

Use temporary probes to investigate assumptions and reproduce failures.
Track their code, fixtures, diagnostics, and settings outside permanent test discovery.
Retain useful observations as evidence.
Do not add or modify permanent tests during this stage.

Migrate affected callers when consolidating code.
Remove only implementations made obsolete by this change.
Check public consumers, dynamic loading, and registrations before removal.
Preserve pre-existing tests unless their deletion is authorized under the applicable policy.

Run targeted static checks after each coherent editing batch.
Fix violations without suppressions, disabled rules, or weaker assertions.

Return all supplied artifacts and updated Candidate.
Include the exact revision or diff, owned edits, callers, probe inventory, observations, and raw check results.
Include a boundary map of changed operations, explicit inputs, effects, resource owners, and relevant call paths.
Invalidate checkpoint claims whose inspected source or dependencies changed.

Return exactly one Outcome:

- implemented: behavior is ready for boundary review and permanent tests.
- incomplete: a blocker prevents implementation. Preserve partial changes and identify the required next action.
