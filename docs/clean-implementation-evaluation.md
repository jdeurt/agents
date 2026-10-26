# Clean implementation evaluation

## Acceptance requirements

- A1: Keep the workflow language- and project-independent.
- A2: Use mermaid-v1 with complete instruction paths, explicit artifacts, exclusive outcomes, and early-stop routes.
- A3: Search existing helpers by behavior and contract before adding implementations.
- A4: Scan changed source against existing source and report detector coverage and baseline limitations.
- A5: Preserve pure decisions, explicit changing inputs, runtime ownership, failure propagation, and cleanup.
- A6: Plan independent behavior scenarios first. Use temporary probes during implementation. Write permanent tests afterward.
- A7: Return difficult correct tests to implementation and permit the smallest necessary surrounding refactor.
- A8: Use focused boundary, test, and integration reviewers with source and dependency evidence.
- A9: Preserve valid evidence and route implementation, test, and verification repairs separately.
- A10: Return incomplete for required missing evidence. Preserve the authorized stopping point.

## Activation cases

All cases are unrun.

- Direct request: implement a feature using existing validation.
- Paraphrase: fix retry handling without another helper.
- Nested task: implementation inside a larger delivery request.
- Outside scope: explain a function, draft prose, or configure a runtime without changing application behavior.

## Task cases

All cases are unrun.

1. Find an equivalent helper under another name in an unchanged package.
   Reuse it and verify affected consumers.
2. Preserve similar operations with different lifecycle contracts.
   Record the concrete separation reason.
3. Plan a reproduction scenario before implementation.
   Remove the temporary probe and retain an independently specified permanent test afterward.
4. Discover internal coupling while writing a correct test.
   Refactor the smallest necessary surrounding boundary and run the real application path.
5. Encounter unavailable jscpd or unsupported source.
   Use a compatible existing detector or leave the required check blocked.
6. Lack baseline provenance.
   Inspect original fragments or preserve the unresolved evidence gap.
7. Check a regression against prior behavior.
   Record an unavailable prior version as unverified.
8. Select zero test cases with a filter.
   Reject the run as verification evidence.
9. Find a hidden clock or logger call through an injected helper.
   Reject its purity claim and repeat affected checks after repair.
10. Permit mutation of a locally constructed collection without shared mutation.
11. Preserve unrelated baseline debt and pre-existing working changes.
12. Stop early for a missing checkout or material behavior decision.
13. Repair an assertion without repeating a valid boundary review.
14. Repair a command-selection error without changing production code.
15. Reuse an existing test without requiring it to establish a new coverage gap.
16. Invalidate a review when inspected code or dependencies change.
17. Repair implementation first when both coupling and tests need correction.
18. Return incomplete when independent review or required transitive source is unavailable.
19. Respect applicable review limits across checkpoints.

## Current evidence

The packaging regression uses local upstream fixtures with a folded description and nested metadata.
It checks both client packages, the retained navigation script, and the upstream license.
The regression fails with the prior header reconstruction and passes with the correction.
Local verification results are recorded in [PR #17](https://github.com/jdeurt/agents/pull/17).
CI validates the authored graph with the imported Graph Workflows CLI after building its package.
Automatic activation, complete development tasks, and comparative evaluations remain unrun.

Earlier independent draft reviews identified repair-routing and existing-test-reuse problems.
The draft incorporates those corrections.
The current committed candidate has no final independent PASS.
This document makes no demonstrated quality or efficiency improvement claim.
