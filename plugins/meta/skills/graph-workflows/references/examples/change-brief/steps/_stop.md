# Return the change brief

## Purpose

Return the completed brief and its actual review evidence.

## Inputs

- Candidate: a supported paragraph or a paragraph qualified from explicit review reasons.
- Verdict: the nested review's verdict for the original candidate.
- Reasons: the returned reasons, including any qualification note.
- Clarity note: the independent observation about the original candidate's clarity.

## Instructions

Check that all declared artifacts exist. Format the result with the output template. Label both the verdict and clarity note as assessments of the original candidate. Preserve any qualification note. Do not claim that a qualified revision received another independent review.

## Outputs

- Brief: the final Candidate paragraph.
- Original review: the verdict and reasons, including limits on the review.
- Clarity note: the original candidate's clarity assessment.

## Output template

[Change brief result](../templates/result.md)
