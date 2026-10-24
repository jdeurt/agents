# Return the evidence assessment

## Purpose

Return the completed evidence review to its caller.

## Inputs

- Verdict: supported or unsupported from the evidence assessment.
- Reasons: the evidence-based explanations and limits.

## Instructions

Require one of the two declared verdicts and nonempty reasons. Block if either result is missing or invalid. Format the result with the review template. Return it to the caller without changing the verdict.

## Outputs

- Verdict: exactly supported or unsupported.
- Reasons: the supplied explanations and limits.

## Output template

[Evidence review result](../templates/result.md)
