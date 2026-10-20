---
name: code-review
description: Use when reviewing a completed code change or finishing a distinct feature or bug fix. Provides instructions on effective code reviews.
---

# Code review

Review each completed logical change after a distinct feature or bug fix. Review each change separately when one task contains several changes.

## Establish the review scope

Identify the active project root and the change baseline. Read the diff and the complete changed code. Include callers, dependencies, and unchanged source when they affect the change.

Read the project's written rules and tool configuration. Explicit project rules take precedence over this skill. An observed convention is not a written rule. Use observed conventions only where no explicit rule applies.

## Review against the style guide

Use `jdeurt-engineering:formatting-linting` for the project's language. Read [Rules of style](../formatting-linting/references/style-rules.md) before reviewing the change. Apply each relevant criterion with the language's native constructs.

Check the following areas:

- Legibility, naming, layout, declaration scope, and structural spacing.
- Duplication, dead work, simple operations, and supported dependencies.
- Conditions, control flow, mutation, state ownership, and repeatable calculations.
- API contracts, null checks, runtime validation, types, initialization, and exceptions.
- Asynchronous work, concurrency, resource cleanup, and cancellation.
- Collections, text, encoding, numbers, and data conversion.
- Input handling, protocols, performance, caches, interfaces, and graphics.

Inspect behavior and ownership before proposing a structural change. Check applicable formatting, lint, type, test, and build results. Fix findings within the authorized scope. Preserve the project's rules when a check fails.

## Review changed text

Perform this writing review at the end of the turn, before handoff.

Use `jdeurt-writing:coherent-editing` for all changed text. Include comments, Markdown, specifications, skills, agent instructions, and user-facing product copy. Read the complete affected text and dependent passages. Check meaning, consistency, links, examples, and interface states where applicable.

Use `jdeurt-writing:asd-ste100` only for technical and agent-facing text. Apply its scope to technical comments, Markdown, specifications, skills, and agent instructions. Do not apply ASD-STE100 to user-facing product copy.

Follow each skill's review and validation instructions. Preserve project rules, meaning, conditions, quoted material, and intentionally bad examples. Report the writing checks performed and their scope.

## Compare the change with other project source

Check added and changed code for Type-1, Type-2, and Type-3 duplicates. Type-1 means exact code, with layout or comment differences. Type-2 permits renamed identifiers or changed literals. Type-3 permits added, removed, or changed code.

Scan all appropriate project source, including unchanged files outside the diff. Filter findings to pairs involving added or changed code. A scan limited to changed files misses copies elsewhere.

Read [jscpd capability notes](references/jscpd.md) before selecting tools or interpreting coverage. Preserve configured scan roots, ignores, thresholds, and the user's scope. Exclude generated and vendored code according to project policy.

### Use the MCP server

Check that the server's configured paths target the active project root. The installed plugin directory is not the project root. Reconnect with the active project path if needed. Use the CLI fallback when the server cannot scan the project.

1. Call `check_current_directory` after the edit with `kinds: ["exact", "renamed", "similar"]`.
2. Call `get_file_clones` for changed files when the complete report needs a narrower view. Request the same kinds.
3. Use `check_duplication` when a snippet needs comparison with the scanned project. Request the same kinds.
4. Inspect both source fragments for each relevant match.

`similar` requests both gap and syntax-tree analysis. Some languages do not support the syntax-tree pass. Report unsupported passes and detection thresholds.

Check total counts, returned counts, truncation notes, and unavailable analyses. Increase `limit` or use focused file queries when a list is incomplete. Use the CLI fallback for remaining coverage gaps. Exclude a snippet's own unchanged location from evidence of duplication with other source.

### Use the CLI fallback

Run from the active project root. Inspect project configuration before using `--debug` to inspect merged settings. Keep this review to Type-1, Type-2, and Type-3 analyses.

When no project configuration exists, run:

```sh
npx -y jscpd@5 . --reporters ai --kind exact,renamed,similar --ignore-identifiers --ignore-literals --ignore-annotations --max-gap-lines 2 --similarity 0.8 --cross-formats js-ts
```

For a configured project, preserve its roots, ignores, thresholds, and format settings. Add only analysis switches needed for the requested clone kinds. Do not replace configured paths with the changed-file list. Report conflicts between requested coverage and project restrictions.

Read both fragments before treating a match as duplicate logic. Preserve intentional similarities when a shared abstraction would obscure their distinct contracts. Rerun the same analyses after a relevant fix.

## Check added code for dead code

Use the CLI for this step. The MCP server does not provide dead-code analysis.

Scan the project dependency context, then filter findings to code added by this change. Use the baseline and added diff ranges to identify that code. Include new files and declarations added within existing files.

Preserve project configuration when it exists:

```sh
npx -y jscpd@5 --dead-code --reporters ai
```

When no configuration exists, run:

```sh
npx -y jscpd@5 . --dead-code --dead-code-categories all --min-confidence 0 --include-tests --include-entry-exports --reporters ai
```

Check references, dynamic loading, public APIs, and framework entry points before deleting a finding. Treat static findings as evidence to inspect. Report unsupported languages or incomplete context. Use supplied compiler diagnostics for Rust. Do not run project build scripts merely to obtain Rust diagnostics.

## Report the result

Report material findings with paths, locations, and their effect.

For each style violation, include:

- The file and line in `path:line` form.
- The offending code or text.
- The rule identifier and title from Rules of style, such as `1A`.
- Why the code violates that rule and what effect the violation has.

Use the guide's exact identifiers. Do not invent rule identifiers. Use each rule's Why section to explain the reason for a finding. If an explicit project rule takes precedence, cite that rule and its source file.

State the style criteria and checks used. State the writing checks and their text scope. State the duplicate kinds, source coverage, and dead-code scope. Identify unresolved findings and checks that could not run. Distinguish an incomplete scan from a scan with no relevant findings.

## Example response

Review result: two style violations.

1. `src/report.ts:2` — **2H. Use explicit, supported dependencies**

   ```ts
   import { loadReport } from "./storage.ts";
   import { saveReport } from "./storage.ts";
   ```

   These statements split one module's dependencies across two declarations. Combine them so readers can see those dependencies in one place.

2. `src/storage.ts:18` — **9B. Document classes and callable contracts**

   ```ts
   /** Fetch a saved report by its identifier. */
   export async function loadReport(reportId: string) {
     return storage.read(reportId);
   }
   ```

   The comment omits the parameter and return descriptions. Callers must inspect the implementation to understand valid inputs and missing-report behavior. Describe the identifier, resolved value, and behavior when no report exists.

Checks: formatting, types, and tests passed. Lint failed on these violations. Type-1, Type-2, and Type-3 scans found no actionable code clones. The source review found no added dead code.
