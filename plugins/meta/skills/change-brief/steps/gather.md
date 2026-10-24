# Collect review results

## Purpose

Combine the selected independent reviews before the brief continues.

## Inputs

- Candidate: the unchanged proposed brief supplied to the reviews.
- Selected reviews: the branch identities selected at split.
- Verdict and Reasons: the evidence branch's complete returned result.
- Clarity note: the clarity branch's returned observation.

## Join

split

## Instructions

Wait for every selected review to reach this join successfully. Require the evidence verdict, reasons, and clarity note for this example. If a branch fails or blocks, report that state and completed effects. Do not claim a successful combined review. Preserve the exact review verdict and Candidate.

## Outputs

- Candidate: the unchanged proposed brief.
- Verdict and Reasons: the evidence assessment.
- Clarity note: the independent clarity assessment.
