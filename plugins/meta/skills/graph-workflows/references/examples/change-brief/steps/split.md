# Dispatch independent reviews

## Purpose

Review evidence and clarity independently using separate agents when supported.

## Inputs

- Candidate: the exact proposed brief.
- Evidence: the observations and limitations supporting it.

## Fork

gather

## Branches

- review: supply Candidate and Evidence. Collect Verdict and Reasons.
- clarity: supply Candidate. Collect Clarity note.

## Instructions

Evaluate both outgoing conditions. Give each selected branch its declared inputs and instructions. Follow the graph's agent preferences when supported. Otherwise execute every selected branch using the closest supported arrangement with separate artifacts. Neither branch changes Candidate or writes shared files. Return the selected branch identities so the join knows which results to await.

## Outputs

- Selected reviews: the branch identities and their declared returned artifacts.
