---
name: evidence-review
description: Check a supplied candidate brief against supplied evidence notes and return a supported or unsupported verdict with reasons.
metadata:
  invocation: explicit
  workflow: mermaid-v1
---

```mermaid
flowchart TD
_start@{ shape: sm-circ, label: "Start" }
check["check.md"]
_stop@{ shape: framed-circle, label: "Stop" }
_start --> check
check --> _stop
```
