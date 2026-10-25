Inputs: Task, Context, Plan, Candidate, requirement-to-test map, and checkpoint Reviews.

Keep Candidate unchanged.
Return repair findings for consolidation or removal.

Run the configured jscpd scan across changed source and unchanged source it could duplicate.
Preserve established roots, exclusions, thresholds, and format settings.
Record the version, command, formats, unsupported source, and report completeness.
Use a compatible existing detector if jscpd is unavailable or cannot cover required source.
If none is available, record that check as blocked.

Compare baseline and candidate with identical settings.
Use installed baseline support when available.
Otherwise compare reports or inspect relevant pairs against original source.
Record unresolved provenance as unknown.
A lower repository-wide duplication percentage does not establish a clean change.

Read both fragments of each relevant clone.
Classify its disposition:

- Reuse or consolidate: the operations share a contract and owner.
- Necessary separation: identify the concrete rule or lifecycle difference.
- Generated or external source: identify its owner and established exclusion.
- Unrelated existing debt: retain it outside this task.

Repeat behavioral searches for newly introduced operations, including differently named helpers.
Use separate renamed or structural passes for concrete suspected duplication when installed tooling supports the formats.
Treat normalized matches as candidates to inspect.
Do not enable experimental external semantic services by default.

Check obsolete copies and forwarding layers.
Use supported dead-code analysis when available.
Check dynamic uses and public entry points before proposing removal.
Do not raise thresholds, add ignores, or rename code to conceal findings.

Return all artifacts with reuse Checks.
Include candidate identity, raw reports, scan coverage, reviewed dispositions, helper-search evidence, repair findings, and blocked checks.
A zero-clone report does not establish correct reuse or architecture.
