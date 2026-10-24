---
description: "Design clear, accessible interfaces and user flows. Use for UI/UX design and review."
name: ui-ux-design
---

# UI/UX design

Make the user's task easy to understand and complete. Reduce effort, establish clear hierarchy, and make every interaction communicate what happens next.

## Start with the outcome

Identify the person doing the work, their goal, their context, and the information they have. Design for the actual task performer, including delegates and frequent users, rather than assuming the buyer does the work.

Choose one primary outcome for each flow. Judge steps by their contribution to that outcome. Do not optimize a secondary metric, such as account creation, at the expense of the task the user came to complete.

Understand the problem before selecting a solution. Balance observed behavior, research, and product judgment; stated preferences alone do not establish the best approach. Make reasonable assumptions when context is sufficient. Recommend one approach and explain the meaningful tradeoffs.

## Give each element a purpose

Define what each element does for the intended reader. Prefer one element for each purpose. Remove elements that repeat another element's job without adding value; retain repetition when it improves access or prevents backtracking. Order content by what the reader needs first.

Ground the design in its subject. Choose information and emphasis that belong to the actual task and audience. Preserve verified quantities and outcomes; do not invent statistics or content to fill a layout.

Lead with useful content: the plot in an analysis, the state and next action in a workflow. Do not add a hero, statistic row, decorative label, image, demonstration, or extra panel by default. Include each only when it serves the surface.

Keep necessary detail scannable through short, meaningful sections placed where the reader needs them. Complete the task without adding filler.

## Minimize work

Fit the user's tools, habits, knowledge, and channel. Carry context across necessary handoffs. Prefer sensible defaults and useful integration to requiring a new habit.

Count effort as decisions, data entry, lookups, commitments, and channel changes, not merely screens or clicks. Remove unnecessary steps, skip inapplicable questions, reuse known information, and preserve progress. Do not compress a clear sequence into one overwhelming screen just to reduce the step count.

Ask for information users know. Provide recognizable choices or search instead of asking them to retrieve obscure codes or copy information from another system. Let users check prefilled values when mistakes would matter.

Deliver value before asking for optional commitment. Defer account creation, profile completion, and configuration until they are useful. Offer “Do this later” when possible. Keep authentication, consent, and confirmation where the actual risk or requirement warrants them.

Inform without blocking. Prefer contextual inline guidance to modal gates. Require a decision only when proceeding without it would create a meaningful problem. Defaults must not silently authorize purchases, sharing, or other consequential actions.

## Give users enough context to act

At each decision, show the facts and consequences needed to make it. Make the next useful action visible. When work passes between people or systems, show who owns the next step and whether the current user needs to do anything.

Distinguish progress from outcome. A request received is not a request approved; a finished background job is not necessarily a completed user task. Use success, failure, cancellation, and completion only when the facts support those meanings.

Translate system signals into concepts the intended audience understands. Include technical detail when it helps that audience do its work. Keep unrelated diagnostics out of the primary flow.

For each status, establish its audience, meaning, display condition, and unknown fallback. When designing a status model, make the surface, source signal, exact label, next action, owner, impact, urgency, severity, and terminality explicit where relevant. Match severity to impact on the user. Give each audience the smallest useful set of states. Do not prettify a raw enum and assume its meaning is clear. The same source state may need different explanations for different audiences.

When status is uncertain, omit an optional label or show a neutral “Status unavailable” with a supported recovery path. Never invent an outcome or expose an unmapped source value. Signal missing mappings internally and treat repeated unknown states as design debt to resolve.

Keep source facts available in permissioned support and diagnostic surfaces. Preserve accurate events in audit records rather than simplifying away what happened. Review exports, copied text, and notifications for their recipients; do not assume language appropriate for one audience transfers to another.

Make shared controls accept audience-appropriate concepts, labels, actions, and severity rather than raw source values. Keep raw detail in controls explicitly designed for readers who need it.

## Build a clear visual hierarchy

Give each screen an obvious purpose and reading order. Make important information prominent through placement, size, weight, contrast, and spacing. Keep secondary details available without letting them compete with the main task.

Group related information through proximity and alignment. Separate distinct ideas with space. Treat structure as information: borders, dividers, labels, and numbering must explain a relationship. Number items when they form a sequence. Use a consistent spacing rhythm and layout grid where useful. Match density to the task: compact scanning for repeated work, more explanation for unfamiliar decisions. Avoid empty space that adds scrolling without improving comprehension.

Use a restrained palette with clear roles. Separate decorative accents from success, caution, danger, and informational states. Reserve strong color for meaningful emphasis, and communicate meaning through text or shape as well as color.

Keep reading backgrounds quiet. Use decoration and imagery only when they support the content. Choose typography for legibility and hierarchy at its intended size. Check line length and readability at the intended size. Keep type styles and icon styles coherent. Avoid isolated changes in color, capitalization, or typography without a communicative purpose. Adapt the visual language to the audience and purpose; no particular palette, font, or aesthetic is mandatory.

Use motion to explain a change or direct necessary attention. Prefer motion that responds to a user's action. Avoid repeated entrances, decorative transitions, and competing effects. Familiar treatments are appropriate when they serve the task; novelty does not justify reduced usability.

## Write useful interface language

Treat words as design content. Include text when it helps the reader understand, choose, or act. Sometimes no text is the best text: omit redundant explanations when the visual already communicates the meaning, while preserving necessary labels, instructions, and accessible names.

Use short, specific, calm language in sentence case. Use the reader's familiar domain terms, contractions, and one idea per sentence. Avoid blame, filler, hedging, robotic passive phrasing, unexplained acronyms, performative warmth, and celebration for routine work. Prefer plain wording to cleverness and simple punctuation to em dashes. Read copy aloud; rewrite anything you would not say naturally to the intended reader. Use real quantities and dates when helpful, and keep action wording consistent through the flow.

| Element | Design rule |
| --- | --- |
| Heading | Name the content clearly: “Projects,” not “Project list management.” |
| Button | State the action with a specific verb: “Save changes,” “Send invite,” “Delete project.” |
| Form | Keep labels short, usually 1–4 words, and visible. Put explanations in helper text and corrections in validation messages. |
| Selection | Use “Choose” or “Select” for fixed choices. Do not imply free entry when it is unavailable. |
| Status badge | Communicate one dimension. Separate next action, owner, and urgency when needed. |
| Table | Give distinct concepts distinct columns. Make labels and values easy to scan. |
| Filter | Use the same concepts as the content being filtered. Prefer precise labels such as “Last 7 days.” |
| Error | Explain what happened and what to do next. Do not guess the cause or hide partial failure. |
| Empty state | Explain what belongs here and offer a useful action. Distinguish no content, no matches, and failed loading. |
| Alert | Interrupt for material changes, decisions, required actions, blockers, or meaningful timing. |
| Toast | Confirm routine actions quietly: “Saved.” |
| Help text | Explain meaning, why it appears, consequences, or what happens next. |

Make consequential choices explicit in their labels: “Keep project” and “Delete project,” not “Cancel” and “OK.” Match every label, placeholder, and instruction to what the control actually permits.

Review ambiguous terms such as “Pending,” “Closed,” “Failed,” and “Complete” in context. They are useful only when the reader can understand their exact meaning.

Write complete strings with placeholders and proper pluralization. Allow for translated text rather than concatenating sentence fragments.

## Design the whole interaction

Account for relevant loading, empty, no-match, validation, partial-success, error, permission, and completion states. Explain unavailable actions when the reason matters. Preserve entered work through recoverable failures and offer a useful way forward.

Use familiar controls with consistent behavior. Use links for navigation and buttons for actions. Keep related actions and feedback near the content they affect. Avoid making users infer whether an action worked or repeat it because feedback is missing.

Use semantic structure, accessible names, associated input labels, logical keyboard order, and visible focus. Ensure dialogs handle focus and dismissal correctly. Keep essential instructions available without hover. Respect reduced-motion preferences when motion is present.

Let layouts reflow across narrow and wide screens and at zoom. Check long labels, realistic quantities, expanded content, and translated text. Preserve information needed to decide or act rather than truncating it to make the layout fit.

Measure actual contrast, including opacity and changing backgrounds:

- Ordinary text: at least 4.5:1.
- Large text, at least 18pt regular or 14pt bold: at least 3:1.
- Meaningful graphics and visual information needed to identify controls or states: at least 3:1 against adjacent colors.

Do not round failing ratios upward. Inspect thin type and fine lines at their actual size. Account for applicable exceptions without using them to excuse poor legibility. Contrast checks alone do not establish full accessibility.

Keep sensitive information within the intended audience and permissions. Notifications, URLs, analytics, and copied text need particular care because they can travel outside the interface.

## Evaluate the design

Walk through the complete task, including first use, waiting, handoffs, and recovery. Inspect rendered interactions when available; otherwise state what remains unverified. A successful build is not evidence that an interface is understandable or usable.

Check shared alignment, spacing, and supported appearances. When implementing, look for conflicting layout or style rules that unexpectedly change relationships or states. Remove content and decoration that no longer serve the task.

For a copy audit, inspect every visible string; do not assume current language is correct. Classify each as Keep, Rewrite, Map, Move, Hide, or Decide. Rewrite unclear language, map untranslated signals, move misplaced detail, hide useless content, and resolve undefined meaning rather than guessing. Check exact labels against their audience, display conditions, source facts, and intended actions. Treat misleading outcomes, unsafe disclosure, dead-end errors, and copy that contradicts the control as defects.

Ask:

- Can the intended user tell what this is, what matters, and what to do next?
- Does each required step earn its effort?
- Are state, outcome, ownership, and consequences truthful and clear?
- Does hierarchy survive realistic content and different screen sizes?
- Can users complete the task with a keyboard and recover from mistakes?

When measuring a live flow, define stable step-entry and completion events and a method for identifying abandonment. Use safe metadata. Improve the steps where users struggle without sacrificing the primary outcome.

Resolve concrete problems with concrete changes. Explain recommendations through their effect on the user's task. Scale the depth of analysis to the request, and do not claim research, testing, or measured improvements that did not occur.