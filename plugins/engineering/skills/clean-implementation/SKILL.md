---
name: clean-implementation
description: >-
  Use when implementing a feature, fixing a bug, or refactoring application behavior.
  Reuse existing operations and check implementation boundaries, permanent tests, and verification evidence through focused reviews.
metadata:
  workflow: mermaid-v1
---

```mermaid
flowchart TD
_start@{ shape: sm-circ, label: "Start" }
inspect["inspect.md"]
plan["plan.md"]
implement["implement.md"]
boundaries["review-boundaries.md [subagent:fresh]"]
tests["tests.md"]
test_review["review-tests.md [subagent:fresh]"]
audit["audit.md"]
verify["verify.md"]
assess["assess.md"]
repair["route-repair.md"]
review["review.md [subagent:fresh]"]
_stop@{ shape: framed-circle, label: "Stop" }
_start -->|Outcome is ready| inspect
_start -->|Outcome is incomplete| _stop
inspect --> plan
plan -->|Outcome is ready| implement
plan -->|Outcome is incomplete| _stop
implement -->|Outcome is implemented| boundaries
implement -->|Outcome is incomplete| _stop
boundaries -->|Outcome is approved| tests
boundaries -->|Outcome is repair| plan
boundaries -->|Outcome is incomplete| _stop
tests -->|Outcome is ready| test_review
tests -->|Outcome is revisit| plan
tests -->|Outcome is incomplete| _stop
test_review -->|Outcome is approved| audit
test_review -->|Outcome is repair tests| tests
test_review -->|Outcome is repair implementation| plan
test_review -->|Outcome is incomplete| _stop
audit --> verify
verify --> assess
assess -->|Outcome is repair| repair
assess -->|Outcome is review| review
assess -->|Outcome is incomplete| _stop
review -->|Outcome is repair| repair
review -->|Outcome is complete or incomplete| _stop
repair -->|Outcome is repair implementation| plan
repair -->|Outcome is repair tests| tests
repair -->|Outcome is repair verification| audit
repair -->|Outcome is incomplete| _stop
```

## Notes

- Use `jdeurt-meta:graph-workflows` to navigate this graph. It requires Python 3 for its CLI.
- Pass Task, Context, Plan, Candidate, Checks, and checkpoint Reviews as explicit artifacts. Each node preserves supplied artifacts.
- Use an accessible source checkout and its configured check tools. Record unavailable tools and unsupported source formats.
- Read [the design basis](research/basis.md) when checking provenance, detector claims, or changes to this workflow's policy.
