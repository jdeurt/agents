---
name: code-review
description: Use when reviewing a completed code change or finishing a distinct feature or bug fix. Provides instructions on effective code reviews.
---

# Code review

Review the completed logical change after each distinct feature or bug fix, including when one task contains several changes. Run from the project root with `npx`. Check whether jscpd found a project config:

```sh
npx -y jscpd@5 --debug
```

If it reports a config file, use that project's settings without adding the default scan flags:

```sh
npx -y jscpd@5
```

Review the analyses the project configured and report their scope. If semantic analysis is configured and its model is missing, download the model as jscpd requests. Do not bypass or replace a project config to widen coverage.

Only when no jscpd config exists, use the following defaults. Download the local semantic model once if it is not cached:

```sh
npx -y jscpd@5 --semantic-download
```

Scan for exact, renamed, near-miss, structural, and semantic clones, including JavaScript/TypeScript cross-format copies, then scan for dead code:

```sh
npx -y jscpd@5 . --reporters ai --ignore-identifiers --ignore-literals --ignore-annotations --max-gap-lines 2 --similarity=0.8 --semantic --cross-formats js-ts
npx -y jscpd@5 . --dead-code --dead-code-categories all --min-confidence 0 --include-tests --include-entry-exports --reporters ai
```

Review findings involving the completed change. Inspect both sides of a plausible clone before refactoring; treat semantic matches as leads. Check callers, dynamic use, and framework entry points before removing reported dead code. Rerun the relevant scan after resolving a finding. Report relevant findings and any scan that could not run.

Without a project config, the default clone scan covers every format jscpd supports; structural, semantic, and dead-code checks cover their documented language subsets. Rust dead-code analysis requires compiler diagnostics supplied to jscpd; do not run project build scripts merely to obtain them. See the bundled `jdeurt-engineering:jscpd` skill for additional jscpd workflows. Read [jscpd capability notes](references/jscpd.md) before changing scan options or interpreting coverage.
