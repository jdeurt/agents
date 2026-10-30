Inputs: Task, Context, Plan, Candidate, requirement-to-test map, cleanup evidence, and test code with relevant application paths.

Apply the [checkpoint review contract](../references/review-contract.md).
Trace each scenario from setup through its application action to its assertions.

- T1: Scenarios and independent expected outcomes precede implementation.
  Permanent test additions and changes follow implementation.
- T2: Added scenarios cover a concrete guarantee that existing coverage does not protect.
  Reuse suitable existing scenarios.
  Extend them only for an uncovered guarantee.
- T3: Tests run real internal parsing, decisions, and persistence.
  External fixtures represent an authoritative contract.
- T4: Assertions reject a plausible incorrect result.
  Setup does not create the outcome that the action must cause.
  Expectations do not call or copy the implementation.
- T5: Tests require no internal mocks, private-state manipulation, guessed sleeps, or production switches solely for testing.
- T6: Task-created probes and temporary settings are removed.
  Pre-existing work and necessary permanent fixtures remain intact.

Return the supplied artifacts and test Review.
Choose exactly one Outcome:

- incomplete: required evidence, a decision, or independent review remains unavailable.
- repair implementation: no blocker remains, but correct tests require implementation or surrounding-code changes.
- repair tests: no blocker or implementation finding remains, but test construction or assertions require correction.
- approved: PASS covers the current tests and application paths.

Repair implementation first when both implementation and tests need correction.
Do not weaken assertions or add internal mocks to conceal coupling.
