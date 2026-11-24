Inputs: Task, Context, Plan, Candidate, Checks, checkpoint scopes and identities, applicable rules, and requirement IDs.

Apply the [checkpoint review contract](../references/review-contract.md).
Inspect the final diff, affected callers, clone dispositions, tests, and raw results.
Do not treat earlier verdicts as proof.

- R1: Each requirement has implementation and verification evidence.
- R2: Reused operations preserve caller contracts.
  Necessary separation has a concrete reason.
  Scan coverage and unresolved limitations are accurately reported.
- R3: Final changes preserve deterministic decisions, explicit inputs, effect ownership, failure propagation, and cleanup.
  Check dependencies changed since earlier checkpoints.
- R4: Permanent tests exercise the required application behavior.
  Assertions reject identified incorrect outcomes.
  Necessary surrounding refactors permit reliable tests without hacks.
- R5: Obsolete implementations and temporary probes are removed.
  Project standards and assertions remain intact.
- R6: Required checks cover the current candidate.
  Completion claims respect the authorized stopping point.

Return all artifacts, final Review, current Findings, and exactly one Outcome:

- complete: PASS covers the unchanged candidate and required evidence.
- repair: no blocker remains, findings are repairable within scope, and another required review is permitted.
- incomplete: required evidence, a decision, or independent review remains unavailable, or a review limit prevents completion.
