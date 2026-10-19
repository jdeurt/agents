---
name: code-review
description: Use when reviewing a completed code change or finishing a distinct feature or bug fix. Inspect duplication and dead code with jscpd across the languages it supports.
---

# Code review

Review the completed logical change after each distinct feature or bug fix, including when one task contains several changes. Run the scans from the project root. Use `npx` with Node.js; Bun is not required. Download the local semantic model once if it is not cached:

```sh
npx -y jscpd@5 --semantic-download
```

Check the active jscpd configuration with `npx -y jscpd@5 --debug`. A project config can restrict formats, paths, or files. If those filters exclude source relevant to this review, use a temporary minimal JSON config with `--config <path>` for the clone scan and explain any remaining exclusions. Preserve project entry-point or framework settings needed for the dead-code scan.

Scan for exact, renamed, near-miss, structural, and semantic clones, including JavaScript/TypeScript cross-format copies, then scan for dead code:

```sh
npx -y jscpd@5 . --reporters ai --ignore-identifiers --ignore-literals --ignore-annotations --max-gap-lines 2 --similarity=0.8 --semantic --cross-formats js-ts
npx -y jscpd@5 . --dead-code --dead-code-categories all --min-confidence 0 --include-tests --include-entry-exports --reporters ai
```

Review findings involving the completed change. Inspect both sides of a plausible clone before refactoring; treat semantic matches as leads. Check callers, dynamic use, and framework entry points before removing reported dead code. Rerun the relevant scan after resolving a finding. Report relevant findings and any scan that could not run.

Without a restrictive project config, the clone scan covers every format jscpd supports; structural, semantic, and dead-code checks cover their documented language subsets. Rust dead-code analysis requires compiler diagnostics supplied to jscpd; do not run project build scripts merely to obtain them. See the bundled `jdeurt-engineering:jscpd` skill for additional jscpd workflows. Read [jscpd capability notes](references/jscpd.md) before changing scan options or interpreting coverage.
