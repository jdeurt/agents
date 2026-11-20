Inputs: Task, Context, Plan, Candidate, probe inventory, and checkpoint Reviews.

After implementation, reuse, extend, or write permanent workflow tests for the planned scenarios.
Identify the uncovered guarantee before adding a scenario.

Run the real application path responsible for the result.
Keep internal parsing, decisions, and persistence real.
Replace external boundaries with contract-backed fixtures when needed.
Establish expectations independently of the implementation.
Assert the state and effects caused by the action.
Include required failure, recovery, and intermediate states.

Stop a test design that requires internal mocks, private-state manipulation, guessed sleeps, or production switches solely for tests.
Identify the responsible coupling.
Return a Testability finding with the smallest necessary implementation or surrounding-code refactor.
Distinguish coupling from a missing fixture, unavailable service, or unknown requirement.

Do not retain probes as permanent tests by default.
Rebuild retained scenarios to the permanent-test contract.
Remove task-created probes, temporary fixtures, diagnostics, and settings.
Preserve pre-existing work and necessary permanent fixtures.
Record cleanup evidence without adding file-inventory tests.

Run targeted static checks for test edits.
Invalidate earlier reviews when their inspected code or dependencies change.

Return all supplied artifacts, updated Candidate, requirement-to-test map, cleanup evidence, and Testability findings.
Choose exactly one Outcome:

- incomplete: an external blocker or required decision prevents the next action.
- revisit: no blocker remains, but implementation or invalid boundary coverage requires another implementation pass.
- ready: no blocker remains, suitable permanent coverage exists, no temporary probes remain, and no unresolved testability finding remains.
