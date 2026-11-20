Inputs: Task, Context, Plan, Candidate, applicable project rules, and code with relevant callers and dependencies.

Apply the [checkpoint review contract](../references/review-contract.md).
Inspect the implementation before permanent test additions or changes.

- B1: Changed operations have explicit roles as deterministic decisions or effectful runtime owners.
- B2: Pure operations depend only on explicit inputs and immutable constants.
  Trace mutable captures, implicit instance state, clocks, randomness, configuration reads, logging, persistence, and network calls.
  Injected I/O remains an effect.
- B3: Pure operations preserve their inputs and shared objects.
  Local mutation remains private.
- B4: Runtime owners manage resources and execute effects.
  Business decisions remain in deterministic operations.
- B5: Failure policy preserves propagation, cancellation, early returns, and unconditional cleanup.
  Queue completion remains separate from success.
- B6: Existing helpers were assessed by contract.
  New abstractions own meaningful operations or lifecycles.
  Consolidation preserves affected callers.

Return the supplied artifacts and boundary Review.
Choose exactly one Outcome:

- approved: PASS covers the implementation's current claims.
- repair: no blocker remains, but implementation findings require correction.
- incomplete: required evidence, a decision, or independent review remains unavailable.

Do not approve purity from a name, signature, or dependency injection alone.
