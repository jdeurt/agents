Inputs: Task, Context, and any Candidate, Checks, Testability findings, or checkpoint Reviews from a repair.

Map each requirement to its application operation and proposed implementation.
Define its behavior scenario before implementation:

- Starting state and application action.
- Independently established expected result.
- Plausible incorrect result that verification must reject.

Select existing workflow tests first.
Add a scenario only for an uncovered requirement or failure condition.
Include affected consumers when changing a shared helper.

For each proposed helper, identify the closest existing implementation.
Explain the contract difference that prevents reuse or extension.
If no candidate exists, record the searched areas.
Keep separate implementations when their rules or lifecycles differ.
Do not add modes solely to share similar syntax.

Place decisions and transformations in deterministic operations.
Pass changing state, configuration, time, and identities explicitly.
Assign I/O and resource state to runtime owners.
Trace transitive calls before describing an operation as pure.

When reliable tests require internal mocks, private state, guessed timing, or excessive setup, identify the responsible coupling.
Choose the smallest coherent implementation change that permits reliable verification.
Include surrounding refactors when necessary.
Name affected callers and the concrete verification benefit.
Keep unrelated cleanup outside the plan.

Return all supplied artifacts with updated Plan, Blockers, and exactly one Outcome:

- ready: implementation decisions and required inputs are established.
- incomplete: a required decision, source, or dependency prevents implementation.
