Inputs: Task, Context, Plan, Candidate, requirement-to-test map, Checks, checkpoint Reviews, and current Findings.

Keep Candidate unchanged.
Classify the required repair before editing.
Choose exactly one Outcome:

- incomplete: a required decision, source, dependency, or review remains unavailable.
- repair implementation: no blocker remains, but production behavior, ownership, dependencies, or implementation steps must change, or boundary coverage is invalid.
- repair tests: no blocker or implementation repair remains, but permanent tests or their fixtures must change.
- repair verification: no blocker or code repair remains, but scan selection, check selection, or execution evidence requires correction.

Return all artifacts, the classification, and affected claims.
Include test corrections alongside required implementation repairs.
Send testability coupling through implementation repair.
Do not repeat a valid boundary review for assertion or command-selection corrections.

For verification repair, update only check-selection instructions in Plan.
Preserve project scan restrictions.
Return through audit to obtain current evidence.
Classify any required code edit as implementation or test repair instead.
