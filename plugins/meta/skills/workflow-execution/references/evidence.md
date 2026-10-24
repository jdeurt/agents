# Mermaid shape evidence

Checked 2026-10-24 against [Mermaid's official flowchart documentation](https://mermaid.js.org/syntax/flowchart.html#expanded-node-shapes-in-mermaid-flowcharts-v1130).

The documentation introduces expanded `node@{ shape: ..., label: ... }` declarations in Mermaid 11.3.0 and later. Its shape table lists sm-circ for start, framed-circle as a stop alias, and fork for fork/join.

The workflow dialect uses those requested declarations. Filename targets, skill identifiers, subagent comments, fork/join pairing, and execution behavior are repository-defined conventions. Mermaid itself does not execute agent instructions. The CLI does not load Mermaid or evaluate diagram code. Renderer support depends on the client version. Older renderers can display the source as text.
