Inputs: Task, Context, Plan, Candidate, requirement-to-test map, reuse Checks, and checkpoint Reviews.

Trace each requirement through the selected test and its independently established expected result.
Identify the plausible incorrect result and the assertion that rejects it.

For bug fixes, check that the regression fails on the prior implementation for the reported behavioral reason.
Record unavailable prior versions or environments as unverified.

Run focused selections during repair.
At completion, run the affected feature-area checks subject to project restrictions.
Confirm that filtered commands actually ran the intended cases.
Reuse current passing evidence.
Broaden checks only when affected dependencies, failures, or unresolved risks require it.

Do not edit Candidate in this node.
Return code and test corrections as repair findings.
Keep verification state disposable.
For required manual checks, record the operation, expected result, and observed result.

Return all artifacts with behavior Checks.
Include requirement coverage, exact commands, raw results, candidate identity, test-quality findings, missing evidence, and CI status when in scope.
