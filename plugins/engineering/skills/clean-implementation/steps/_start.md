## Inputs

- Requested behavior, acceptance requirements, and authorized stopping point.
- Source checkout and existing working changes, when available.

Record the request, scope, and requirement IDs as Task before checking prerequisites.
Establish missing expected outcomes from authoritative requirements.
Do not infer correctness from current behavior.

Return Task, the checkout reference, Blockers, and exactly one Outcome:

- ready: source access and decisions needed for inspection and planning are available.
- incomplete: required access or a material decision remains unavailable. Name the next action.
