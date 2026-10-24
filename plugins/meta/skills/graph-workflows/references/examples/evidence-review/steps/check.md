# Check claims against evidence

## Purpose

Decide whether the candidate's factual claims stay within the supplied evidence.

## Inputs

- Candidate: the exact text to assess.
- Evidence: the supplied observations, checks, and limitations.

## Instructions

Compare each factual claim with the evidence. Treat explicitly unverified expectations as qualified statements. Return supported only when every factual claim has relevant support and preserves the evidence's limits. Otherwise return unsupported. Explain each unsupported claim or state why all claims are supported. Do not browse, run tools, or assume unavailable evidence for this review. Do not infer truth from the candidate itself.

## Outputs

- Verdict: exactly supported or unsupported.
- Reasons: evidence-based explanations for the verdict, including uncertainty and missing checks.
