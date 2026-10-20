# Effect-boundary proposal: evaluation

Trial date: 2026-10-20. This report accompanies the [opt-in proposal](effect-boundaries.md).
The implementation favors missed effects over speculative attribution. The naming vocabulary still needs project-specific review.
Do not enable these rules across consumers from these results alone.

## Repository scope

The implementation started from freshly fetched `jdeurt/agents` main at `d563ff4e6c514984df8349b23dd5a6b1e21bdff2`.
The comparison scans used fixed source revisions. The agents scan used an archive of that base revision, excluding the new implementation.
The other repositories used isolated temporary shallow clones. Their working trees remained clean.
No comparison source, repository setting, branch, or hook was changed. No dependency installation ran in either comparison repository.

`jdeurt/codex-pocket` is the resolved Codex Pocket repository. It is private.
`jdeurt/opencodex` is a large public fork owned by the user, with relevant frontend and backend TypeScript.
Repository metadata reported 298,560 KB of Git storage for OpenCodex. The measured JS/TS coverage below, rather than that storage figure, justified its selection.
No work or clinical repository was selected. This report includes no private source excerpts.

| Repository            | Revision                                   | Files analyzed | Source lines | Initial naming / separation | Final naming / separation | Parse/configuration errors |
| --------------------- | ------------------------------------------ | -------------: | -----------: | --------------------------: | ------------------------: | -------------------------: |
| `jdeurt/agents`       | `d563ff4e6c514984df8349b23dd5a6b1e21bdff2` |             35 |        4,605 |                      38 / 1 |                    19 / 0 |                          0 |
| `jdeurt/codex-pocket` | `d47e288873c49271ce3bd0343d3311d90da8f31c` |            189 |       17,970 |                      99 / 0 |                    38 / 0 |                          0 |
| `jdeurt/opencodex`    | `04d4ad8ce9e174a9f8d852e5bca0f52776bb7374` |          5,546 |    1,645,075 |                  7,738 / 67 |                 2,256 / 0 |                          0 |

All scans selected tracked `.js`, `.jsx`, `.mjs`, `.cjs`, `.ts`, `.tsx`, `.mts`, and `.cts` files.
They included tests, fixtures, declarations, and tracked distribution files. No size cutoff or semantic exclusion was applied.
The line count sums each source string split on a newline, including its final empty element when present.
Each rule reports at most once per named function, so diagnostic counts are not effect-operation counts.

The temporary runner used ESLint 10.13.0, the installed TypeScript ESLint parser, and the proposed plugin through Bun 1.4.3.
It enabled only `jdeurt/name-effects` and `jdeurt/separate-effects`, both at warning severity, using the same defaults in every repository.
It parsed JSX, selected CommonJS for `.cjs`, and disabled inline suppression processing to count all proposed findings.
No type project, application dependency resolution, build, or execution was needed in the comparison repositories.

A preliminary runner configuration failed to match TypeScript extensions. That invalid pass was discarded.
The table includes only complete passes with zero parse/configuration errors.

## Empirical changes

The first valid implementation reported all detected categories missing from a name.
It also inferred object-literal property names, treated captured local writes as external, and used broad computation prefixes.
Review of source around the findings motivated these generic changes:

1. Accept one effect word across the vocabulary, including common lifecycle verbs. An orchestration name need not enumerate logging and bookkeeping.
2. Ignore inferred object-literal callback names. Stream callbacks, dependency implementations, and test doubles frequently have fixed API names.
3. Ignore writes to bindings owned by an enclosing function. Local parser cursors and accumulators are not proven externally observable.
4. Restrict default computation contracts to `calculate`, `compute`, and `derive`. `parse`, `validate`, `normalize`, and `serialize` have legitimate stateful meanings.
5. Require at least two arithmetic operators and a resolved parameter reference for a returned calculation candidate. Ignore status increments and constant arithmetic.
6. Accept omitted standard operation words, including `unlink`, `cleanup`, `migrate`, `toggle`, and `emit`.

All three repositories were rerun after refinement. There are no repository-specific exemptions, file-name allowlists, or function-name allowlists in the implementation.
The scans used identical configuration. Temporary synthetic examples independently checked the generic exclusions and positive cases.

## Reviewed findings

I inspected surrounding code for all final agents and Codex Pocket findings.
For OpenCodex, I inspected initial separation cases and a systematic sample of 24 production naming findings before the last vocabulary expansion.
That sample selected evenly spaced entries from 1,294 findings under `src/`, `gui/src/`, and `desktop/src/`, in tracked-file order.
The indices were `floor(i * (1294 - 1) / 23)` for `i` from 0 through 23.
This is a coverage sample, not a random sample or a statistically valid precision estimate.

A **useful review** means the detected operation is real and the name plausibly hides that operation.
An **ambiguous finding** means the operation is real but the name can already communicate its role in context.
A **vocabulary false positive** means an ordinary effect word was missing from the dictionary.
These labels evaluate naming advice, not whether the function necessarily needs refactoring.

### Agents examples

| Base source                                              | Observation                                                 | Assessment                                                                                                       |
| -------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `scripts/build-files.ts:59`, `checkedDirectoryPath`      | Calls `lstat`, then `realpath`.                             | Useful review: a path-looking helper reads the live filesystem.                                                  |
| `scripts/compile-native.ts:23`, `sourceBuiltFile`        | Calls `stat` to derive executable mode.                     | Useful review: the result depends on filesystem metadata.                                                        |
| `scripts/sync-imports.ts:52`, `digest`                   | Reads filesystem metadata and traverses directory contents. | Useful review: its name alone can suggest an in-memory hash.                                                     |
| `scripts/import-config.ts:192`, `validateMarkers`        | Validates live filesystem markers.                          | Initial separation advice was ambiguous and is removed. Naming remains a project convention question.            |
| `scripts/compile-plugin.ts:73`, `restoreServerDirectory` | Writes through its input record.                            | Initial naming noise removed: `restore` describes an effect.                                                     |
| `scripts/build-marketplace.ts:232`, `main`               | Logs a CLI result.                                          | Remaining conventional-name false-positive candidate. The default vocabulary does not special-case entry points. |
| `scripts/git.ts:7`, `git`                                | Spawns the named command.                                   | Remaining domain-name ambiguity. The name can be clear without an additional verb.                               |
| `scripts/import-policy.ts:147`, `restrictSurface`        | Deletes input properties.                                   | Correct mutation attribution, but the verb may already communicate mutation.                                     |

### Codex Pocket examples

Paths and behavioral summaries below identify the reviewed locations without reproducing private implementation text.

| Base source                                 | Observation                                                                    | Assessment                                                                                                                          |
| ------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/activity-spinner.tsx:29`    | A refresh routine performs a network request and updates captured bookkeeping. | Initial over-report removed by lifecycle naming and captured-local conservatism.                                                    |
| `src/hooks/use-notification-presence.ts:18` | A close routine clears captured connection state.                              | Initial noise removed. The state belongs to the enclosing hook invocation.                                                          |
| `scripts/harness-check.ts:34`               | An object callback implements a fixed metadata callback contract.              | Initial naming noise removed by ignoring inferred property names.                                                                   |
| `src/server/reducer.ts:14`                  | A reducer-named function mutates its input state.                              | Useful review: callers can reasonably expect a transformation to return a new state. Intentional mutation remains a valid contract. |
| `src/server/delegation-db.ts:8`             | A noun-named database factory creates a directory.                             | Useful review of hidden filesystem initialization. Database calls themselves are outside the detector.                              |
| `src/server/images.ts:22`                   | A value-looking helper reads filesystem metadata on its local-file path.       | Useful review of conditional I/O.                                                                                                   |
| `src/server/harness/claude.ts:151`          | A class method implements a `run` contract and updates instance state.         | Remaining API-name ambiguity. Renaming may break the contract.                                                                      |
| `scripts/delegation-check.ts:108`           | An existence predicate checks filesystem access.                               | Remaining ambiguity: filesystem access is inherent in the question the name asks.                                                   |

### OpenCodex systematic sample

The line references use the fixed revision in the scope table. “Removed” means the final default vocabulary now accepts the name.
“Ambiguous” findings remain visible to an opting-in project. They are not counted as demonstrated naming defects.

| Source                                              | Function                               | Final assessment                                                |
| --------------------------------------------------- | -------------------------------------- | --------------------------------------------------------------- |
| `gui/src/api-targets.ts:197`                        | `discoverApiTargets`                   | Ambiguous: discovery can imply a request.                       |
| `gui/src/pages/integrations/integration-api.ts:542` | `toggleIntegration`                    | Removed vocabulary false positive.                              |
| `src/adapters/cursor/live-transport.ts:1363`        | `onData`                               | Ambiguous event-handler contract with instance bookkeeping.     |
| `src/chat/outbound.ts:472`                          | `emit`                                 | Removed vocabulary false positive.                              |
| `src/cli/account-extended.ts:804`                   | `cmdPause`                             | Ambiguous CLI command with logging.                             |
| `src/cli/integrations.ts:414`                       | `handleCommandcodeCommand`             | Ambiguous CLI handler with logging.                             |
| `src/clients/aside-profiles.ts:50`                  | `leafDestination`                      | Useful review: reads a filesystem link.                         |
| `src/codex/catalog/parsing.ts:438`                  | `ensureAutoCompactTokenLimit`          | Ambiguous: writes an input default.                             |
| `src/codex/inject.ts:426`                           | `reconcileAndDerivePlan`               | Ambiguous: reconciliation reads live configuration.             |
| `src/codex/native-profile-store.ts:258`             | `assertCanonicalFile`                  | Ambiguous: a filesystem assertion needs metadata.               |
| `src/codex/shim-migration.ts:47`                    | `migrateLegacyUnixShim`                | Removed vocabulary false positive.                              |
| `src/config/live-reconcile.ts:158`                  | `adoptPersistedProviderIntoLiveConfig` | Ambiguous domain verb for input mutation.                       |
| `src/lab/automation/config-persistence.ts:83`       | `cleanupFile`                          | Removed vocabulary false positive.                              |
| `src/lab/public/purge.ts:120`                       | `unlinkLocalCommunityFile`             | Removed vocabulary false positive.                              |
| `src/lib/translator-budget.ts:250`                  | `chargeRetained`                       | Ambiguous accounting verb for instance mutation.                |
| `src/oauth/kiro.ts:620`                             | `run`                                  | Useful review: a vague helper performs a token-refresh request. |
| `src/providers/request-pacing.ts:343`               | `runQueue`                             | Ambiguous queue orchestration contract.                         |
| `src/remote-control/workspace-sessions.ts:714`      | `ensureRuntime`                        | Ambiguous lifecycle operation.                                  |
| `src/server/audio-upstream.ts:68`                   | `resolveAudioUpstream`                 | Useful review: also writes through its logging-context input.   |
| `src/server/port-reclaim.ts:284`                    | `scanListenEntries`                    | Ambiguous system scan that launches a subprocess.               |
| `src/server/responses/native-injection.ts:269`      | `observe`                              | Ambiguous stateful observer contract.                           |
| `src/service/desktop-supervision.mjs:158`           | `identity`                             | Useful review: consults filesystem identity.                    |
| `src/update/job.ts:1574`                            | `defaultProbeProxyIdentity`            | Ambiguous network-probe name.                                   |
| `src/web-search/xai-executor.ts:64`                 | `runXaiWebSearch`                      | Ambiguous orchestration with incidental logging.                |

The sample yielded five clear vocabulary false positives removed, four retained useful reviews, and fifteen retained ambiguous naming findings.
No incorrect direct-operation attribution was identified in these reviewed examples.
This does **not** establish a low overall false-positive rate. The remaining naming ambiguity is substantial.
The full set of 2,256 OpenCodex findings was not manually adjudicated.

## Negative cases and intentional misses

Actual-source checks confirmed that the pure AST helpers `property` and `typeOf` in agents did not report.
OpenCodex's nested parser helpers in `src/lab/public/strict-json.ts` stopped reporting captured local cursor updates.
The refined Codex Pocket scan produced no findings in `src/components/` or `src/hooks/`.
That last result is also a recall limitation: React setters, anonymous hook callbacks, and captured refs are deliberately not inferred.

All three final scans produced zero separation diagnostics.
The separation rule is supported by temporary positive fixtures, but this trial did not demonstrate a useful positive separation finding in the real repositories.
It must not be presented as a general detector of mixed computation and I/O.

The 67 temporary evaluations covered:

- Positive direct global I/O, aliased/default/namespace Node imports, input updates/deletes, module writes, and instance writes.
- Naming token boundaries, acronyms, snake_case, lifecycle names, configurable categories, computation prefixes, and explained rule-specific suppression.
- Pure helpers, unknown methods, async-only functions, shadowed globals/imports, local arrays/maps/copies, and nested local mutation.
- React handlers/hooks/setters/refs, object callback contracts, class initializers, constructors, getters, and setters.
- Returned arithmetic candidates, one-step status arithmetic, constant-only arithmetic, and parameter shadowing.
- Accepted misses for wrappers, computed calls, CommonJS imports, input mutator methods, aliases, and anonymous callbacks.
- The known reachability false positive: an effect in an unreachable branch still reports.

No permanent regression test or evaluation runner was added, as requested.
The existing import integration fixture only copies the new module directory so the existing packaging tests continue to exercise the complete source tree.
Temporary scripts and raw diagnostic contexts were kept outside the repository. Raw private-source contexts are not published here.

## Reproduce the scan

Use the revisions above and install this proposal's root dependencies with the frozen Bun lockfile.
For each comparison checkout, enumerate tracked JS/TS files with `git ls-files -z` and the extensions listed above.
For each source, call `Linter.verify` with:

- A file pattern that explicitly includes all eight extensions.
- `typescript-eslint`'s parser, JSX enabled, and no project service.
- The proposed plugin registered as `jdeurt`.
- Only the two proposed rules enabled at warning severity, with no options.
- The actual relative filename and `allowInlineConfig: false`.

Count the two rule IDs separately. Count all parser/configuration messages separately and require zero.
Do not execute a comparison repository's own ESLint configuration, install its hooks, or modify its sources.

## Adoption conclusion

Keep the proposal disabled by default. The detector is conservative, but a fixed vocabulary cannot judge domain naming reliably.
A scoped project trial can extend the vocabulary and review specific suppressions.
A rule-wide rollout is not justified by the observed ambiguity or the absence of real-source separation positives.
Do not relax existing strict TypeScript, lint, formatting, or packaging checks to enable it.
