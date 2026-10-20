# Rules of style

Use each language’s native syntax and standard library. Examples use TypeScript.

## 1. Legibility

### 1A. Lay out lists consistently at each depth

Apply this layout to arguments, parameters, properties, collection items, and similar lists.
At each nesting depth, use one of these layouts:

- Put the complete list on one line.
- Put each item on a separate line.

Do not put several siblings on one line and other siblings on another line.
Choose the layout separately for each nested list.

**Why:**

Consistent sibling placement makes list boundaries easy to scan.
One item per line makes additions and removals easy to compare.
A complete short list can remain compact without hiding its structure.
Independent nested layouts preserve that balance at each depth.

**Good:**

```ts
// Good: each top-level property has its own line; the nested object is one line.
const options = {
  source,
  destination,
  limits: { minimum, maximum },
};

// Good: the complete argument list fits on one line.
publish(source, destination, options);

// Good: every parameter at this level has its own line.
/**
Publish a report to an authorized destination.
@param reportSource - The validated report input to publish.
@param reportDestination - The authorized destination for the report.
@param publicationOptions - Publication limits and other delivery options.
*/
function publishReport(
  reportSource: ValidatedReportSource,
  reportDestination: AuthorizedReportDestination,
  publicationOptions: ConfirmedPublicationOptions
) {
  publish(reportSource, reportDestination, publicationOptions);
}
```

**Bad:**

```text
// Bad: sibling arguments are packed onto multiple lines.
publish(
  source, destination,
  options, context
);

// Bad: sibling properties mix packed and separate lines.
const mixedOptions = {
  source, destination,
  limits,
};
```

### 1B. Use a predictable visual grammar

Use ordinary spaces.
Align nested code.
Make operator boundaries visible.
Put one statement on each line.
Write clear comments.

End each file with a newline.
Do not leave trailing whitespace.
Do not use irregular whitespace.
Aim for lines within 120 columns. Allow longer lines when a line break reduces clarity.

**Why:**

Spaces, alignment, and visible operators expose expression boundaries.
Separate statements and clear comments reduce the effort needed to follow execution.
A final newline keeps the final line separate during file concatenation.
Trailing and unusual whitespace can hide differences without conveying meaning.
A 120-column target keeps most lines readable in narrow views. Exceptions prevent awkward breaks that obscure an expression.

**Good:**

```ts
/**
Add subtotal and tax stated in the same currency.
@param subtotal - The pre-tax amount in the report currency.
@param tax - The tax amount in the same currency.
@returns The total amount in that currency.
*/
function calculateTotal(subtotal: number, tax: number) {
  const total = subtotal + tax;

  return total;
}
```

**Bad:**

```text
const total=subtotal+tax;return total;
```

### 1C. Separate structural units

Consecutive imports may remain together.
Put a blank line after the final import before any other statement.

Keep consecutive declarations of the same kind together. A group contains consecutive constant declarations or consecutive mutable declarations.
Separate unrelated groups when their purposes differ.
Put a blank line between constant and mutable declaration groups.
Put a blank line after the final declaration before executable code.

Put blank lines between class methods.
Put blank lines around class declarations.
Separate consecutive independent control-flow statements with blank lines.
Keep the arms and clauses of one construct together.
Put a blank line before a final return that follows another statement.

Keep overload signatures adjacent to their implementation. Do not put blank lines within an overload group.
Adapt declaration spacing to the language.

**Why:**

Blank lines distinguish dependencies, declarations, actions, and results.
Same-kind declaration groups expose initialization together, while group boundaries reveal changes in purpose or mutability.
Method, class, and control-flow spacing makes independent structural boundaries visible.
Keeping related arms and clauses together preserves the outline of one construct.

A separate final return makes the result easy to locate.
Overload signatures describe one implementation, so internal gaps would suggest separate operations.
Native declaration forms need equivalent boundaries rather than identical syntax.

**Good:**

```ts
import { SOURCE } from "./source.ts";
import { TARGET } from "./target.ts";

const route = [SOURCE, TARGET];

/**
Store an optional counter value with a reset operation.
*/
class Counter {
  #value: number | undefined;

  /**
  Read the stored counter value with an optional fallback.
  @param [fallback] - The value to use when the counter has no stored value.
  @returns The stored value, the supplied fallback, or undefined when neither exists.
  */
  read(): number | undefined;
  read(fallback: number): number;
  read(fallback?: number): number | undefined {
    return this.#value ?? fallback;
  }

  /**
  Initialize the counter to zero.
  */
  reset() {
    this.#value = 0;
  }
}

/**
Represent a gauge with an initial reading of zero.
*/
class Gauge {
  #value = 0;

  /**
  Read the current gauge value.
  @returns The stored numeric reading.
  */
  read() {
    return this.#value;
  }
}
```

**Bad:**

```text
// Missing blank lines obscure method, class, and declaration boundaries.
import { SOURCE } from "./source.ts";
import { TARGET } from "./target.ts";
const route = [SOURCE, TARGET];
/**
Store an optional counter value with a reset operation.
*/
class Counter {
  #value: number | undefined;
  /**
  Read the stored counter value with an optional fallback.
  @param [fallback] - The value to use when the counter has no stored value.
  @returns The stored value, the supplied fallback, or undefined when neither exists.
  */
  read(): number | undefined;
  read(fallback: number): number;
  read(fallback?: number): number | undefined {
    return this.#value ?? fallback;
  }
  /**
  Initialize the counter to zero.
  */
  reset() {
    this.#value = 0;
  }
}
/**
Represent a gauge with an initial reading of zero.
*/
class Gauge {
  #value = 0;
  /**
  Read the current gauge value.
  @returns The stored numeric reading.
  */
  read() {
    return this.#value;
  }
}
```

### 1D. Keep units small and expressions readable

Split long modules into units with named responsibilities.
Split complex functions into units with named responsibilities.
Split complex protected exception regions into units with named responsibilities.
Split deeply nested calls into named intermediate values.
Name complex expressions that produce iterables.
Unpack only the fields that you need.

Preserve useful behavior when you split code.
Meet the limits through cohesive, well-named operations or a simpler design.
Preserve required execution order when extracting those operations.
Use these limits:

- Keep each file within 350 lines, including comments and blank lines.
- Keep function complexity at or below 20.
- Keep try-block complexity at or below 1.
- Keep nested-call depth at or below 3.

Complexity measures branching. A straight-line body has complexity 1.
Add 1 for each decision point. Count these constructs as decision points:

- Add 1 for each if, else-if, or ternary condition.
- Add nothing for an else arm alone.
- Count each loop.
- Count each non-default case.
- Count each catch.
- Count each default-value choice.
- Add 1 for each logical AND, OR, or nullish choice.
- Add 1 for each optional access or optional call.

Do not count a logical choice again as a default-value choice.
An if with one logical AND adds 2 to the straight-line base of 1.
Count independent paths, not every possible combination of execution paths.
Apply the same count to the protected body of a try block. A try block with complexity 1 has no decision points in its protected body.
Count nested functions separately from their enclosing body.

Count the outermost call at depth 1. Add 1 for each call nested inside an argument.
Receiver chains do not increase call depth.
Split deeper expressions into named intermediate values.

**Why:**

Small named units reduce the amount of behavior readers must hold in memory.
Intermediate values expose evaluation steps and give complex iterables a role.
Selecting only needed fields keeps dependencies visible.
The limits set common review boundaries for file size, branching, protected work, and argument nesting. They are practical conventions, not proof that shorter code is better.

Cohesive extraction meets the limits while giving each new operation a useful responsibility.
Extraction adds navigation, so a simpler design may be preferable when it preserves behavior.

Each decision adds an alternative that readers must consider.
The counting definitions make comparisons consistent without counting every path combination.
Separate nested-function counts describe each executable body without charging its decisions twice.
A branch-free protected body excludes local branching from the region whose failures share a handler.
Named operations can contain branching while keeping that shared failure boundary explicit.
Argument nesting hides intermediate inputs, while receiver chains expose successive operations on the current result.

**Good:**

```ts
// Load, normalize, serialize, and publish the same report in that order.
const report = loadReport();
const normalized = normalize(report);

publish(serialize(normalized));
```

**Bad:**

```text
// Load, normalize, serialize, and publish the same report in that order.
// Four argument-nested calls exceed depth 3 and hide the intermediate inputs.
publish(serialize(normalize(loadReport())));
```

### 1E. Name values for their role

Use consistent spelling.
Use consistent filename conventions.
Boolean names should read as predicates.
Use action names for callable operations.
Give exported functions and classes useful names.
Name caught exceptions consistently.

**Why:**

Consistent spelling and filenames make related code easier to locate.
Predicate names identify which question a Boolean answers.
Action names distinguish operations from stored values.
Useful exported names explain a component before readers open its implementation.
Consistent exception names make failure-handling paths easier to scan.

**Good:**

```ts
const isReady = queue.length > 0;

/**
Read the report currently selected for publication.
@returns The selected report without changing it.
*/
function getReport() {
  return report;
}
```

**Bad:**

```text
const flag = queue.length > 0;

function thing() {
  return report;
}
```

## 2. Maintainability and duplication

### 2A. Name meaningful numbers and strings

Give domain numbers stable names near their owner. The values 0, 1, and 2 may remain inline.
Name meaningful strings when this explains their purpose or supports reuse. Consider names for paths, user-facing messages, and other domain values when appropriate.
Keep clear local strings inline. Do not create constants only to replace clear local literals.

Use the language's convention for named constants, even without immutable bindings.

**Why:**

Named domain values explain otherwise arbitrary numbers and strings. Keeping names near their owner makes the relevant policy easy to change.
Common small counts often explain themselves, so 0, 1, and 2 can remain inline.
Reused paths and messages benefit from one definition when that definition conveys intent.
Clear local strings need no extra lookup.
Native naming conventions communicate constant intent even when the language cannot prevent reassignment.

**Good:**

```ts
const REPORT_PATH = "reports/summary.json";
const RETRY_LIMIT = 5;

writeReport(REPORT_PATH, RETRY_LIMIT);
publishReport(REPORT_PATH);
```

**Bad:**

```text
writeReport("reports/summary.json", 5);
publishReport("reports/summary.json");
```

### 2B. Keep declarations in the right scope

Keep constant and mutable declarations in the declaration prefix of their scope.
Keep runtime declarations of each kind in one group. Either kind may come first, but do not return to that kind after switching.
Ambient declarations do not select a runtime group. Each nested scope has its own groups.
Initializers can execute work during declaration. Preserve their timing when you reorganize declarations.
Apply the separate spacing requirements in 1C. Declaration order does not depend on whitespace.
Imports, types, functions, and other variable declarations may precede these declarations.
Loop-header declarations may remain in the loop header.

Use the smallest scope that owns a value.
Move independent functions to an outer scope.
Preserve evaluation order.
Use a conditional or named helper for work that must wait for a condition.
Do not add standalone blocks to relocate declarations.
Keep a closure nested when it needs surrounding local state.

Use helpers for cohesive business operations.
Extract cohesive work when required to meet declaration placement while preserving execution timing.

**Why:**

A declaration prefix exposes a scope's inputs and local state before its actions.
Separate declaration groups make transitions between constant and mutable bindings easy to find.
Blank lines distinguish initialization from later execution.
Other declarations can establish dependencies without starting that scope's main actions.
Loop-header declarations keep iteration state within its natural lifetime.
Initializers may perform work, so moving them can change failures, logging, or access to resources.

Small owning scopes limit accidental access.
Independent functions need no repeated closure, while dependent closures need their captured state.
Conditions and cohesive helpers preserve delayed execution without adding arbitrary blocks.
Extraction can preserve initializer timing while satisfying the declaration prefix. It adds navigation, an accepted cost of this placement convention.
Preserving evaluation order prevents a layout change from changing behavior.

**Good:**

```ts
/**
Read the current report and send it to publication.
*/
function readAndPublishReport() {
  const report = readReport();

  publish(report);
}

/**
Publish the current report only when its inputs are ready.
Record the publication start before reading the report.
@param isReady - Whether publication may begin.
*/
function publishReportIfReady(isReady: boolean) {
  if (!isReady) {
    return;
  }

  logStart();
  readAndPublishReport();
}
```

**Bad:**

```text
// Log before reading and publishing, and do not read when isReady is false.
function publishReportIfReady(isReady: boolean) {
  if (!isReady) {
    return;
  }

  logStart();
  const report = readReport();
  publish(report);
}
```

### 2C. Use deliberate, unambiguous bindings

Place declarations before their uses when native declaration patterns permit it.
Keep supported forward references and recursive callable declarations when needed.
Initialize values before you read them.

Do not shadow existing names.
Do not create conflicting or unintended redeclarations. Supported overloads and compatible declaration merging may share a name.
Prefer immutable local bindings when their values do not change.

Do not replace these bindings:

- Do not reassign imported bindings.
- Do not reassign constant bindings.
- Do not reassign exception bindings.
- Do not reassign class bindings.
- Do not reassign function bindings.
- Do not replace or remove language-reserved bindings.

Reserved bindings include language-provided values.
Changing a binding differs from changing the object that it refers to. Apply ownership rules before changing object contents.

**Why:**

Prior declarations usually make reading order easier. Native forward references and recursive declarations can require another order.
Runtime values still need initialization before reads.
Shadowing and conflicting declarations give one name competing meanings. Compatible overloads or merged declarations describe one supported binding.

Immutable bindings expose values that cannot be replaced.
Replacing imports, constants, exceptions, classes, or functions breaks the identity their declarations promise.
Changing reserved bindings also changes language behavior.
Object contents have separate owners, so binding stability alone does not authorize mutation.

**Good:**

```ts
const source = loadSource();
const result = normalize(source);

consume(result);
```

**Bad:**

```text
// source is read before initialization, so this order throws a ReferenceError.
const result = normalize(source);
const source = loadSource();
```

### 2D. Remove dead, empty, and ineffective work

Remove these unused elements:

- Remove unused declarations.
- Remove unused private members.
- Remove unused labels.
- Remove unused expressions.
- Remove unused assignments.

Preserve required effects when removing unused bindings or assignments.
Remove empty files only when their existence has no required purpose.
Record intentional empty markers in nearby documentation.
Remove empty binding patterns that bind nothing unless their evaluation performs required behavior.
Remove accidental empty bodies.

Use the results of lazy operations, or consume them deliberately.
Make intentional operations that do nothing explicit. Explain why those operations are necessary.

**Why:**

Unused declarations, private members, labels, expressions, and assignments distract from behavior that matters. Their initializers or assigned expressions may still perform required effects, which must remain.
Unneeded empty files, bindings, and accidental bodies can conceal missing work.
An empty marker can carry meaning through its existence. Nearby documentation distinguishes it from an accidental empty file.

Lazy operations may never run unless callers consume their results.
An explicit explanation distinguishes a necessary operation with no effect from an unfinished implementation.

**Good:**

```ts
/**
Return twice the supplied value.
@param value - The input value before scaling.
@returns Twice the input value.
*/
function double(value: number) {
  return value * 2;
}
```

**Bad:**

```text
function double(value: number) {
  value * 2;
}
```

### 2E. Avoid duplicate declarations and alternatives

Avoid duplicate parameter names, object keys, and class members.
Avoid duplicate enum values unless intentional aliases form part of the API contract.
Avoid duplicate switch cases, redundant branch conditions, repeated logical operands, and duplicate set items.

Combine identical adjacent branches only when the combination preserves behavior.
Combine repeated operations only when the combination preserves results, order, and effects.

**Why:**

Repeated parameter names, keys, and members can hide an earlier definition.
Repeated enum values can imply unintended equivalence. Intentional API aliases retain that equivalence deliberately.

Duplicate branches, logical operands, cases, and set items suggest alternatives that do not actually differ. Removing those duplicates exposes the real choices.
Shared implementations prevent copied behavior from drifting. Preserving results, order, and effects avoids removing meaningful repeated work.

**Good:**

```ts
// The options must mark the report ready without requesting a retry.
const options = { isReady: true, isRetrying: false };
```

**Bad:**

```text
// The options must mark the report ready without requesting a retry.
const options = { isReady: true, isReady: false };
```

### 2F. Factor shared work without unnecessary abstraction

Move code shared by all branches outside those branches.
Preserve the order of condition evaluation and shared effects. Do not move shared effects before a condition when this changes behavior.

Combine compatible consecutive operations.
Remove wrappers that repeat at every call.
Use a meaningful helper for repeated boilerplate.
Remove invariant parameters from owned internal APIs when they serve no contract or extension purpose.
Preserve parameters required by public APIs, callbacks, overrides, and protocols.

**Why:**

One shared operation avoids maintaining the same behavior in several branches. Moving it across a condition can change effects or failures, so execution order remains part of correctness.
Combining compatible work removes repeated setup.
Repeated wrappers and boilerplate hide the operation that callers need.

Meaningful helpers explain shared work.
Unneeded invariant internal parameters suggest variation that does not exist. External contracts or extension points can still require those parameters.

**Good:**

```ts
// isRemote is an immutable routing decision. serialize cannot change it.
const payload = serialize(report);

if (isRemote) {
  upload(payload);
} else {
  save(payload);
}
```

**Bad:**

```text
// isRemote is an immutable routing decision. serialize cannot change it.
if (isRemote) {
  upload(serialize(report));
} else {
  save(serialize(report));
}
```

### 2G. Prefer the simplest operation that states intent

Use supported native operations.
Use meaningful defaults.
Avoid these unnecessary operations:

- Avoid manual wrappers.
- Avoid implicit type conversions.
- Avoid redundant fallback values.
- Avoid recursive boilerplate.
- Avoid obsolete APIs.

Specify important optional behavior explicitly.
Preserve evaluation order when you simplify code.
Preserve side effects when you simplify code.

**Why:**

Native operations state common tasks without requiring readers to reconstruct an algorithm.
Meaningful defaults reduce repeated choices, while explicit important options prevent hidden assumptions.
Manual wrappers, redundant fallbacks, recursive boilerplate, and obsolete APIs add behavior to understand or maintain.
Implicit conversions can change the meaning of values. A simpler expression is useful only when it preserves evaluation order and effects.

**Good:**

```ts
/**
Join display names for a list label.
@param names - Display names in their desired order, without missing array slots.
@param [separator] - Text between names, defaulting to a comma and space.
@returns One list label containing every name.
*/
function formatNames(names: string[], separator = ", ") {
  return names.join(separator);
}
```

**Bad:**

```text
// names contains strings without missing array slots.
function formatNames(names: string[], separator = ", ") {
  return names.reduce(
    (text, name, index) => text + (index ? separator : "") + name,
    ""
  );
}
```

### 2H. Use explicit, supported dependencies

Use the language's supported module conventions.
Use the language's supported import conventions.
Remove duplicate imports.
Consolidate imports from the same module when their kinds and attributes permit it.
Remove unused imported bindings while preserving required module initialization.
Remove redundant reexports.

Keep package usage compatible with the installed version.

Prefer maintained APIs to deprecated APIs.
Import only the parts that you need.
Avoid costly imports of an entire library.

**Why:**

Supported module and import conventions make dependencies recognizable.
Duplicate or unused imports and redundant reexports obscure the actual dependency boundary.
Consolidated compatible imports keep one module's required names together.
An explicit initialization import preserves required effects when no imported binding remains.

Installed versions determine which APIs and combinations are available.
Maintained APIs reduce reliance on behavior scheduled for removal.
Narrow imports can avoid loading code that the application never uses.

**Good:**

```ts
import { loadReport, saveReport } from "./storage.ts";
```

**Bad:**

```text
// The same dependency is split across compatible declarations, making its required names harder to scan.
import { loadReport } from "./storage.ts";
import { saveReport } from "./storage.ts";
```

## 3. Conditions and state

### 3A. Make conditions direct and intentional

Use explicit comparisons when necessary.
Prefer simple positive conditions when equivalent alternatives improve reading.
Keep negative early guards when they make the active path clear.
Return Boolean results directly.
Use the narrowest conditional expression.

Avoid these ambiguous or redundant expressions:

- Avoid nested ternaries.
- Avoid assignments in conditions.
- Avoid ambiguous negation.
- Avoid duplicate comparisons.
- Avoid expressions with a constant result.

Make logical and nullish operators preserve false, zero, and empty values according to the intended contract.

**Why:**

Direct comparisons, simple alternatives, and Boolean returns expose the decision.
A negative early guard can remove an exceptional path without nesting the main work.
Narrow expressions avoid unnecessary branches.
Nested ternaries and ambiguous negation make alternatives hard to follow.

Assignments in conditions mix a decision with a state change.
Duplicate comparisons and constant results can conceal a mistaken condition.
Logical and nullish operators treat empty values differently, so their choice must follow the contract.

**Good:**

```ts
/**
Check whether a nonempty selection may be published.
@param count - The number of items selected for publication.
@param hasPermission - Whether the caller may publish the selection.
@returns Whether the selection is nonempty and publication is allowed.
*/
function canPublish(count: number, hasPermission: boolean) {
  return count > 0 && hasPermission;
}
```

**Bad:**

```text
/**
Check whether a nonempty selection may be published.
@param count - The number of items selected for publication.
@param hasPermission - Whether the caller may publish the selection.
@returns Whether the selection is nonempty and publication is allowed.
*/
function canPublish(count: number, hasPermission: boolean) {
  // The nested choices obscure the same Boolean decision.
  return count > 0 ? (hasPermission ? true : false) : false;
}
```

### 3B. Make control flow explicit and reachable

Make block boundaries clear.
Use early returns or continues where appropriate.
Use an appropriate construct for branches with multiple alternatives.

Avoid these control-flow errors:

- Avoid unintended fallthrough.
- Avoid unreachable code.
- Avoid unreachable loops.
- Avoid confusing nested breaks.
- Avoid an else containing only an if when an equivalent else-if preserves scope and evaluation order.

Put the loop condition in the loop header when this makes the exit clear.

**Why:**

Clear blocks and early exits make active paths visible.
Suitable multi-branch constructs identify which alternatives belong together.
Unintended fallthrough can execute a second alternative.
Unreachable code and loops imply behavior that cannot occur.

Nested breaks make exits harder to trace.
An unnecessary else around an equivalent if adds nesting without adding a distinct operation.
A clear loop-header condition states the continuation rule where readers expect it.

**Good:**

```ts
/**
Publish the supplied report and return it to the caller.
@param report - The report to publish without changing its contents.
@returns The same report after publication.
*/
function publishAndReturnReport(report: Report) {
  publish(report);

  return report;
}
```

**Bad:**

```text
/**
Publish the supplied report and return it to the caller.
@param report - The report to publish without changing its contents.
@returns The same report after publication.
*/
function publishAndReturnReport(report: Report) {
  return report;

  // This publication is unreachable, so the intended effect never occurs.
  publish(report);
}
```

### 3C. Iterate values directly

Iterate values directly.
Use only the indices or entries that you need.
Name complex expressions that produce iterables.
Avoid duplicate passes through a collection.
Change collection membership during iteration only when its traversal contract supports the required visits and ownership.
Use native iteration or comprehension syntax.

**Why:**

Direct value iteration avoids manual indexing when positions have no role.
Requesting only needed entries keeps each loop's dependencies clear.
Naming complex iterable expressions separates collection construction from processing.
Extra passes repeat work and can observe different state.

Changing membership can skip, repeat, or continually add visits. Supported traversal contracts can permit controlled changes.
Changing an element's fields does not necessarily change collection membership.
Native iteration expresses traversal without unnecessary bookkeeping.

**Good:**

```ts
// Produce ["RED", "BLUE"] from the original colors without adding traversal work.
const colors = ["red", "blue"];
const uppercaseColors = colors.map((color) => color.toUpperCase());
```

**Bad:**

```text
// Produce ["RED", "BLUE"] from the original colors without adding traversal work.
const colors = ["red", "blue"];

for (const color of colors) {
  // The array iterator visits appended entries, so this keeps growing instead of finishing.
  colors.push(color.toUpperCase());
}
```

### 3D. Make state changes local and intentional

Prefer collection operations that preserve their input.
Preserve inputs that belong to the caller.
Avoid shared mutable defaults.
Avoid arrays whose elements share the same mutable reference.
Avoid hidden writes to global state.
Avoid mutation during calculations.

Compute a new next state when the ownership contract requires it.

**Why:**

Preserving caller-owned inputs prevents one operation from changing another caller's data.
Shared defaults and repeated mutable references let unrelated uses affect each other.
Hidden global writes make behavior depend on distant operations.
Mutation inside calculations makes repeated evaluation change its own inputs.
A new state preserves earlier snapshots when the ownership contract requires them.

**Good:**

```ts
// items and state belong to the caller and must remain unchanged.
const sortedItems = items.toSorted(compareItems);
const nextState = { ...state, isReady: true };
```

**Bad:**

```text
// items belongs to the caller and must remain unchanged.
function orderItems(items: Item[]) {
  items.sort(compareItems);
  return items;
}
```

### 3E. Keep calculation separate from effects

Keep reusable modules free of top-level effects.
Keep calculations pure.
Keep updates outside render and evaluation paths.
Trigger effects through explicit operations. Make the dependencies and ownership of those operations visible.
Prevent repeated feedback loops between state and effects.

Apply the same separation to imports and computed properties.

**Why:**

Pure calculations can be repeated without publishing, storing, or otherwise changing the outside world.
Top-level effects make importing a reusable module perform unexpected work.
Render paths and computed properties may run repeatedly, so updates there can cause feedback loops.
Explicit effect operations reveal when work happens and which dependencies and resources it uses.
Separating imports from effects keeps loading code distinct from executing application actions.

**Good:**

```ts
/**
Calculate the price total without publishing it.
@param items - Items whose prices contribute to the total.
@returns The sum of the supplied item prices.
*/
export function calculateTotal(items: Item[]) {
  return sumPrices(items);
}

/**
Write a calculated total to its destination.
@param output - The destination that receives the total and remains caller-owned.
@param total - The calculated amount to publish.
*/
export function publishTotal(output: Output, total: number) {
  output.write(total);
}
```

**Bad:**

```text
export function calculateTotal(items: Item[]) {
  output.write(items);
  return sumPrices(items);
}
```

### 3F. Keep state transitions consistent

Use one source of truth.
Derive values from current inputs.
Make updates atomic.
Avoid stale reads.
Avoid feedback loops.

Avoid mutation of shared state in place.
Avoid unnecessary state that mirrors other state.
Use stable identifiers when identity must survive reordering. Do not use positions or identifiers regenerated during evaluation or reordering for stable entity identity.
An identifier generated randomly once may remain stable when retained with its entity.

**Why:**

One source of truth prevents equivalent values from drifting apart.
Derivation from current inputs avoids stale copies.
Atomic updates keep observers from seeing partially changed state.
Feedback loops can repeatedly trigger their own updates.
Replacing shared state preserves earlier snapshots for other observers.

Stable identifiers preserve identity across reordering. Positions change during reordering, while regenerated identifiers assign a new identity.
A random identifier retained with its entity can remain stable.

**Good:**

```ts
// Other observers retain this state snapshot.
/**
Create the next state with its enabled flag inverted.
@param state - The current state, which this operation does not mutate.
@returns A new state with all other fields preserved.
*/
function toggle(state: State): State {
  return { ...state, isEnabled: !state.isEnabled };
}
```

**Bad:**

```text
// Other observers retain this state snapshot, which must remain unchanged.
function toggle(state: State): State {
  state.isEnabled = !state.isEnabled;
  return state;
}
```

### 3G. Make repeated evaluation deterministic

Pass precomputed clock, random, and environment values into repeatable calculations.
Keep identity-sensitive allocation outside repeatable calculations unless you pass the allocated value as an explicit input.
Local allocation may remain when it does not change observable behavior.
Execute external effects outside repeatable calculations. Pass their precomputed results as inputs when the calculation needs them.
Do not invoke effectful callbacks during repeatable calculations.

Make repeated results agree when identity and content must remain stable. Make server and client results agree under the same condition.
Seed deliberate randomness. Compute random values outside the repeatable calculation.

Use stable identifiers.

**Why:**

Clock, random, environment, and external-effect results can change between otherwise identical evaluations.
Precomputed inputs make those dependencies visible.
Effectful callbacks still perform external work, so passing a function does not make a calculation repeatable.
New identity-sensitive objects can change observed identity even when their contents match. Unobservable local allocation does not create that problem.

Stable inputs and identifiers let repeated, server, and client evaluations agree when their contracts require agreement.
Seeded randomness makes a deliberate random sequence reproducible. Computing its values outside repeated evaluation prevents an extra evaluation from advancing the sequence.

**Good:**

```ts
// buildView returns the same view for the same inputs.
/**
Build a repeatable view from supplied time and randomness.
@param timestamp - The time for view rendering in milliseconds since the Unix epoch.
@param randomValue - A precomputed random value that stays unchanged for this rendering.
@returns The view for those exact inputs.
*/
function makeView(timestamp: number, randomValue: number) {
  return buildView(timestamp, randomValue);
}
```

**Bad:**

```text
// buildView returns the same view for the same inputs. Repeated evaluation must be stable.
function makeView() {
  return buildView(Date.now(), Math.random());
}
```

## 4. Correctness and type contracts

### 4A. Respect API contracts and supported combinations

Match these parts of the API contract:

- Match argument counts.
- Match callback signatures.
- Match value kinds.
- Match return contracts.
- Match initialization order.
- Match units.
- Match ranges.
- Match dimensions.
- Match compatible options.
- Supply required inputs.

Use runtime type checks that work across supported execution contexts. Do not assume that constructor identity proves the value's kind.
An iteration API may pass extra arguments to its callback. Use an adapter when those arguments give a forwarded function unintended behavior.

Reject contradictory configuration.
Reject options that the API ignores.
Consult the API documentation for the runtime and library in use.

**Why:**

Argument counts, callback signatures, value kinds, and return contracts define how operations communicate.
Initialization, units, ranges, dimensions, options, and required inputs define valid operation.
Violating these contracts can produce wrong results even when a call succeeds.
Constructor identity can differ across execution contexts, so it is not always a reliable value check.
Callback adapters prevent extra iteration arguments from acquiring an unintended meaning.
Current API documentation distinguishes supported behavior from contradictory or ignored configuration.

**Good:**

```ts
// Number produces [10, 11, 12] from these complete decimal strings.
// Each input is a complete decimal integer string.
const textValues = ["10", "11", "12"];
const numbers = textValues.map(Number);
```

**Bad:**

```text
// map passes (text, index, array). parseInt treats the index as its radix, producing [10, NaN, 1].
// Each input is a complete decimal integer string.
const textValues = ["10", "11", "12"];
const numbers = textValues.map(Number.parseInt);
```

### 4B. Preserve the intended result

Return a value on every path that requires one.
Follow the return contracts for these constructs:

- Follow getter contracts.
- Follow setter contracts.
- Follow constructor contracts.
- Follow callback contracts.
- Follow lazy-operation contracts.

Do not confuse a mutator's result with the intended value.
Do not confuse an uncalled function with the intended value.
Do not confuse a discarded calculation with the intended value.

**Why:**

Required result paths must supply the value that callers expect.
Getters, setters, constructors, callbacks, and lazy operations have distinct return contracts.
A mutator may return metadata or nothing rather than the changed value.
An uncalled function is an operation, not its result.
A discarded calculation cannot supply a result to its caller.

**Good:**

```ts
// Keep only the ready report: readyItems should contain [{ id: "summary", status: "ready" }].
const items = [
  { id: "summary", status: "ready" },
  { id: "detail", status: "pending" },
];
const readyItems = items.filter((item) => item.status === "ready");
```

**Bad:**

```text
// Keep only the ready report: readyItems should contain [{ id: "summary", status: "ready" }].
const items = [
  { id: "summary", status: "ready" },
  { id: "detail", status: "pending" },
];

// Without return, each callback yields undefined, so readyItems is [] instead.
const readyItems = items.filter((item) => {
  item.status === "ready";
});
```

### 4C. Check absence before access

Check that optional results exist before use.
Check collection lookups before access.
Check bounds before access.
Check nullable values before access or arithmetic.

Do not assert that an absent value must exist.
Remove redundant fallbacks.
Avoid unsafe optional access.
Use the language's native absence convention.

**Why:**

Optional values, failed lookups, invalid bounds, and nullable inputs can leave nothing safe to access.
Checking before use keeps the failure near its cause.
An assertion cannot make an absent runtime value exist.
Redundant fallbacks hide which missing cases are actually possible.
Unsafe optional access can defer a failure rather than prevent it.
The native absence convention makes missing values recognizable.

**Good:**

```ts
/**
Publish the first matching item value, or do nothing when no match exists.
@param items - Candidate items in their search order.
*/
function publishMatch(items: Item[]) {
  const item = items.find((candidate) => matchesRequest(candidate));

  if (item === undefined) {
    return;
  }

  consume(item.value);
}
```

**Bad:**

```text
const item = items.find(matchesRequest);

consume(item!.value);
```

### 4D. Check unknown values before use

Keep unknown input unknown until a runtime check proves its shape.
Avoid unchecked assertions that narrow a type.
Avoid chained type assertions.
Avoid unsafe calls.
Avoid unsafe member access.
Avoid unsafe returns.

Avoid misleading broad function types.
Type annotations alone do not check untrusted runtime input.

**Why:**

External input can violate every assumption in a type annotation.
Runtime checks establish the facts needed for safe use.
Unchecked or chained assertions can hide missing evidence without changing the input.
Unsafe calls, member access, and returns spread that uncertainty to other operations.
Broad function types can conceal incompatible arguments or results.

**Good:**

```ts
/**
Accept a name only when the input is text.
@param value - Untrusted input proposed as a name.
@returns The input text without conversion.
@throws {TypeError} If the input is not text.
*/
function readName(value: unknown): string {
  if (typeof value !== "string") {
    throw new TypeError("The name must be a string.");
  }

  return value;
}
```

**Bad:**

```text
function readName(value: unknown): string {
  return value as string;
}
```

### 4E. Keep type contracts precise and economical

Use simple, consistent type declarations.
Use coherent overloads.
Keep getter and setter contracts compatible.
Use generic constraints that express a useful relationship.
Use unions without redundant alternatives.

Avoid these unnecessary or unsafe type constructs:

- Avoid empty object or interface types that accept more values than the intended contract.
- Avoid unsafe types.
- Avoid duplicate alternatives.
- Avoid unnecessary annotations.
- Avoid unnecessary assertions.
- Avoid type parameters that express no relationship.

Keep type-only dependencies separate where the language supports this.

**Why:**

Simple declarations expose the values and relationships that an interface accepts.
Coherent overloads and compatible accessors prevent contradictory views of one operation or property.
Useful generic constraints express relationships that callers can rely on.
Misleading empty object types and unsafe types weaken those guarantees.
Meaningful uninhabited types or native empty tags can still express a precise contract.

Duplicate alternatives, redundant annotations, and unnecessary assertions add detail without useful information.
Separate type-only dependencies avoid implying a runtime dependency where none exists.

**Good:**

```ts
/**
Read the first item without changing the collection.
@param items - Items in their existing order.
@returns The first item, or undefined when the collection is empty.
*/
function first<T>(items: T[]): T | undefined {
  return items.at(0);
}
```

**Bad:**

```text
/**
Read the first item without changing the collection.
@param items - Items in their existing order.
@returns The first item, or undefined when the collection is empty.
*/
// T relates no input to any output here, so callers gain no useful type relationship.
function first<T>(items: string[]): string | undefined {
  return items.at(0);
}
```

### 4F. Give classes and objects a clear purpose

Use classes for meaningful instances.
Prefer module-level functions to static-only containers when the language supports that organization.
Declare class members.
Keep class members in a consistent order.
Preserve parent-class accessor contracts.

Avoid recursive accessors.
Remove useless constructors.
Remove useless overrides.

Preserve the intended receiver when a callback depends on it. Bind the method when the receiving API does not supply that receiver.
Retain the bound callback when registration and removal require the same identity.
Prefer native fields and encapsulation.

**Why:**

Meaningful instances justify a class's state, identity, and lifecycle.
Static-only containers add a class without an instance role when module functions already provide the required organization.
Declared, consistently ordered members make the object boundary easy to inspect.
Parent accessor contracts preserve behavior expected by callers.
Recursive accessors can call themselves indefinitely, while useless constructors and overrides add no behavior.

Receiver-dependent callbacks need their instance, while receiver-independent or automatically bound methods need no extra binding.
Retaining a bound callback preserves its identity for removal.
Native encapsulation keeps internal state behind a clear boundary.

**Good:**

```ts
/**
Store the current reading for one counter instance.
*/
class Counter {
  #value: number;

  /**
  Create a counter with the supplied initial reading.
  @param initialValue - The initial reading stored by this counter.
  */
  constructor(initialValue: number) {
    this.#value = initialValue;
  }

  /**
  Read the current counter value.
  @returns The reading stored by this counter.
  */
  get value() {
    return this.#value;
  }
}
```

**Bad:**

```text
/**
Store the current reading for one counter instance.
*/
class Counter {
  #value: number;

  /**
  Create a counter with the supplied initial reading.
  @param initialValue - The initial reading stored by this counter.
  */
  constructor(initialValue: number) {
    this.#value = initialValue;
  }

  /**
  Read the current counter value.
  @returns The reading stored by this counter.
  */
  get value() {
    // Reading this.value invokes this same getter again until the stack overflows.
    return this.value;
  }
}
```

### 4G. Preserve resource lifecycle order

Use values only after construction or asynchronous initialization.
Run setup for each instance within that instance's lifetime.
Keep declared dependencies complete.
Preserve required parent initialization.
Keep cleanup available until asynchronous work finishes.

**Why:**

Construction and asynchronous initialization establish invariants that later operations need.
Setup within an instance's lifetime prevents accidental resource sharing or retention.
Complete dependencies and parent initialization preserve the prerequisites of that setup.
Cleanup must remain available until outstanding work can no longer use the resource. Otherwise, work can access incomplete or already released state.

**Good:**

```ts
// Construction needs no explicit cleanup. close safely releases partial initialization without throwing.
const client = new Client();

try {
  await client.initialize();
  await client.execute();
} finally {
  await client.close();
}
```

**Bad:**

```text
// Construction needs no explicit cleanup. close safely releases partial initialization without throwing.
const client = new Client();

await client.execute();
await client.initialize();
await client.close();
```

### 4H. Preserve useful exception information

Raise meaningful exception objects.
Give each exception a message.
Use an appropriate exception type.
Preserve the cause when you catch an exception.

Remove catches that only rethrow the same exception.
Do not hide failures.
Combine related errors when useful.
Do not let a return in a finally block replace the original failure.
Do not let a replacement exception hide the original failure.

**Why:**

Meaningful exception objects, messages, and types identify what failed.
Preserved causes retain the original evidence when another operation adds context.
Catches that only rethrow add no recovery or explanation.
Hiding failures prevents callers from responding.
Related errors can describe a failed group more accurately than one arbitrary error.
Returns or replacement exceptions in cleanup can discard the failure that actually caused the exit.

**Good:**

```ts
try {
  await saveReport();
} catch (error) {
  throw new Error("Could not save the report.", { cause: error });
}
```

**Bad:**

```text
try {
  await saveReport();
} catch (error) {
  throw new Error("Could not save the report.");
}
```

## 5. Asynchrony and resource ownership

### 5A. Honor asynchronous contracts

Avoid awaiting known synchronous values.
Await asynchronous results when you need their completion.
Handle every asynchronous result.
Do not pass asynchronous callbacks where an API requires synchronous results.
Own completion and rejection when callbacks start asynchronous work.
Await returned work when exception handling requires it.

Preserve rejection handling.
Remove unnecessary promise wrappers.
Use the language's direct asynchronous syntax.

**Why:**

Waiting matters when completion is a prerequisite for later work.
Awaiting a synchronous value suggests a dependency that does not exist.
Unhandled asynchronous results can fail after the caller starts other work.

A promise cannot supply an immediate synchronous result.
Synchronous dispatch can start asynchronous work if its completion and failures have explicit ownership.
Exception handling must await work whose later rejection it must catch.
Direct asynchronous syntax and fewer wrappers make completion and rejection paths easier to follow.

**Good:**

```ts
/**
Fetch a report while preserving the cause of any request failure.
@returns The fetched report after the request completes.
@throws {Error} If the request fails, with its original cause attached.
*/
async function loadReport() {
  try {
    return await fetchReport();
  } catch (error) {
    throw new Error("Could not load the report.", { cause: error });
  }
}
```

**Bad:**

```text
/**
Fetch a report while preserving the cause of any request failure.
@returns The fetched report after the request completes.
@throws {Error} If the request fails, with its original cause attached.
*/
async function loadReport() {
  try {
    // A later rejection escapes this try block, so this catch cannot add the promised context.
    return fetchReport();
  } catch (error) {
    throw new Error("Could not load the report.", { cause: error });
  }
}
```

### 5B. Schedule work with deliberate concurrency

Run independent operations together when safe.
Avoid sequential waits for independent operations when concurrency is safe.
Do not await work before you need its result.
Preserve asynchronous reduction accumulators.

Prevent reentry races.
Do not complete the same operation repeatedly.
Prevent stale updates after cancellation.
Check success status before you read aggregate results.

**Why:**

Safe independent work can overlap instead of accumulating sequential delays. Waiting only when an operation needs a result preserves that opportunity.
Asynchronous reductions still need the preceding accumulator's completed value.
Reentry races, repeated completion, and stale updates can overwrite newer state.
Cancellation checks prevent abandoned work from publishing later results.
Checking aggregate success prevents callers from using failed results as successful values.

**Good:**

```ts
// The loaders are independent and safe to start together, even if either fails.
// Both loaders report failures through promises.
const [users, projects] = await Promise.all([loadUsers(), loadProjects()]);

renderDashboard(users, projects);
```

**Bad:**

```text
// The loaders are independent and safe to start together, even if either fails.
// Both loaders report failures through promises.
const users = await loadUsers();
const projects = await loadProjects();

renderDashboard(users, projects);
```

### 5C. Pair acquisition with cleanup and ownership

Pair each resource with cleanup:

- Close files.
- Dispose of resources that the current scope owns.
- Remove the exact listener that you registered.
- Revoke temporary handles.
- Cancel timers.
- Cancel debounced work.
- Cancel animation.

Propagate cancellation.
Do not return a resource beyond its lifetime.
Run cleanup after failure.
Run cleanup after an early exit.

**Why:**

Files, owned resources, listeners, handles, timers, deferred calls, and animation can outlive the operation that created them.
Matching cleanup prevents leaks and later callbacks into obsolete state.
Listener removal needs the original registration identity.
Cancellation tells dependent work that its result is no longer needed.
Returning a resource past cleanup exposes an unusable object.
Failure and early exits need cleanup as much as successful completion does.

**Good:**

```ts
const subscription = source.subscribe(onValue);

try {
  await consumeSource();
} finally {
  subscription.unsubscribe();
}
```

**Bad:**

```text
const subscription = source.subscribe(onValue);

await consumeSource();
subscription.unsubscribe();
```

### 5D. Respect event lifetime and scheduling

Specify event options that affect intended behavior explicitly.
Specify timer delays explicitly.
Do not control an event after its control period ends.
Keep handler identity stable.
Use a scheduler that matches the intended timing.

Do not block the event loop.
Do not exit before pending cleanup finishes.

**Why:**

Event options and timer delays affect cancellation, repetition, and when callbacks run.
An event stops accepting control operations when its control period ends.
Stable handler identity permits reliable registration and removal.
A suitable scheduler matches work to its timing needs.
Blocking the event loop delays other handlers.
Exiting before cleanup completes can leave resources or external state unfinished.

**Good:**

```ts
// Forward key events only until waitForCompletion settles.
/**
Forward one session event to its application handler.
@param event - The key event received during the active session.
*/
function handleSessionKeydown(event: Event) {
  onEvent(event);
}

document.addEventListener("keydown", handleSessionKeydown);

try {
  await waitForCompletion();
} finally {
  document.removeEventListener("keydown", handleSessionKeydown);
}
```

**Bad:**

```text
// Forward key events only until waitForCompletion settles.
document.addEventListener("keydown", (event) => onEvent(event));

try {
  await waitForCompletion();
} finally {
  // This new function differs from the registered function, so the listener remains active.
  document.removeEventListener("keydown", (event) => onEvent(event));
}
```

## 6. Collections, text, and data

### 6A. Choose the collection operation matching the question

Use an operation that matches the question:

- Use find for one item.
- Use some or any for existence checks.
- Use a membership container when repeated checks justify its construction and retention cost.
- Use map to transform values.
- Use grouping operations to form groups.
- Use set operations for set relationships.

Do not sort a collection only to find an extreme value.
Avoid redundant collection materialization.
Avoid unnecessary passes through a collection.
Stop iteration when you have the one result that you need.

**Why:**

Find expresses one-item lookup, while some or any expresses an existence question and can stop early.
Membership containers trade construction and retention cost for cheaper repeated membership checks.
Map preserves transformation intent, grouping collects related items, and set operations express membership relationships.
Sorting for one extreme does more work than scanning for that value.
Extra materialization and passes consume resources without improving a result.
Stopping after the required result avoids processing items that cannot change the answer.

**Good:**

```ts
// items is an array. isReady is a pure predicate that depends only on its item. Stop after the first match.
const hasReadyItem = items.some((item) => isReady(item));
```

**Bad:**

```text
// items is an array. isReady is a pure predicate that depends only on its item.
// Filtering visits every item and allocates all matches just to answer whether one exists.
const hasReadyItem = items.filter((item) => isReady(item)).length > 0;
```

### 6B. Preserve collection shape and key meaning

Use the correct map or set interface.
Use consistent keys.
Keep collection elements dense.
Use valid slice and splice bounds.
Use numeric comparators for numeric ordering.
Specify join separators explicitly.

Avoid accidental mutation.
Do not let an operation silently change item identity.
Do not let an operation silently change the collection type.

**Why:**

Map and set interfaces preserve their defined key and membership behavior.
Consistent keys prevent missed lookups.
Dense collections and valid bounds avoid absent elements or unintended slices.
Numeric comparators prevent text ordering from being mistaken for numeric ordering.
Explicit separators make joined output predictable.
Preserving identity and collection type avoids surprising callers that retain references or depend on a particular interface.

Accidental mutation changes data that other callers may still rely on.

**Good:**

```ts
// For sizes [2, 10], numeric ordering keeps 2 before 10.
// sizes contains numbers. entries is a Map, not a plain record.
const sortedSizes = sizes.toSorted((left, right) => left - right);
const value = entries.get(requestedKey);
const summary = names.join(", ");
```

**Bad:**

```text
// For sizes [2, 10], default text ordering incorrectly puts 10 before 2.
// sizes contains numbers. entries is a Map, not a plain record.
const sortedSizes = sizes.toSorted();
const value = entries[requestedKey];
```

### 6C. Use direct, lossless string operations

Use string operations that match the task:

- Use prefix and suffix checks for prefix and suffix questions.
- Replace all matches when the task requires every match.
- Use padding operations to pad strings.
- Use repetition operations to repeat text.
- Use slicing operations to extract substrings.
- Use regular-expression APIs according to their contracts.

Make conversions explicit.
Avoid lossy object interpolation.
Use correct template syntax.
Remove redundant trimming.
Avoid unsafe replacement expansion.
Do not treat one code unit as a complete character.

**Why:**

Prefix, suffix, padding, repetition, slicing, and replacement operations expose the intended text task.
Replacing all matches is necessary only when the task requires every match.
Regular-expression contracts determine which matches and captures an operation uses.

Explicit conversion exposes the choice of representation. Choosing meaningful fields or suitable serialization avoids generic default text.
Correct template syntax preserves the intended embedded values.
Redundant trimming repeats work, while replacement expansion can treat input as instructions rather than literal text.
A code unit may contain only part of a character.

**Good:**

```ts
// The required result is "account-name-updated".
const value = "account_name_updated";
const normalized = value.replaceAll("_", "-");
```

**Bad:**

```text
// The required result is "account-name-updated".
const value = "account_name_updated";
const normalized = value.replace("_", "-");
```

### 6D. Treat text encoding and display width correctly

Use valid regular expressions.
Escape invisible characters explicitly.
Use consistent encoding identifiers.
Use operations that respect code points.

Use a streaming decoder for chunked text. Reuse that decoder until the stream ends. Flush it after the final chunk.

Use grapheme segmentation when the task concerns user-perceived characters.

Keep these text measurements distinct:

- Distinguish text length from other measurements.
- Distinguish terminal columns from other measurements.
- Distinguish bytes from other measurements.
- Distinguish user-perceived characters from other measurements.

**Why:**

Valid patterns and visible escapes make text matching interpretable.
Consistent encoding names identify the same representation throughout a data path.
Code-point operations avoid splitting encoded characters.
A reused streaming decoder retains incomplete sequences across chunk boundaries, and a final flush handles trailing bytes.
Grapheme segmentation follows user-perceived characters that can contain several code points.

Text length, terminal columns, bytes, and perceived characters measure different things. Substitution can produce incorrect text boundaries or widths.

**Good:**

```ts
/**
Decode one complete UTF-8 stream across ordered byte chunks.
@param chunks - Ordered bytes, possibly split within an encoded character.
@returns The decoded text, with malformed bytes replaced.
*/
function decodeChunks(chunks: Iterable<Uint8Array>): string {
  const decoder = new TextDecoder();
  const parts = Array.from(chunks, (chunk) => decoder.decode(chunk, { stream: true }));

  parts.push(decoder.decode());

  return parts.join("");
}
```

**Bad:**

```text
// The chunks form one ordered UTF-8 stream and may split a multibyte sequence.
// Malformed input should produce replacement characters.
function decodeChunks(chunks: Iterable<Uint8Array>): string {
  const parts: string[] = [];

  for (const chunk of chunks) {
    parts.push(new TextDecoder().decode(chunk));
  }

  return parts.join("");
}
```

### 6E. Use mathematically valid and precise operations

Avoid these numeric errors:

- Avoid precision loss beyond the numerical contract's tolerance.
- Avoid invalid numeric operands.
- Avoid accidental bitwise operations.
- Avoid misleading numeric forms.
- Avoid impossible bounds.
- Avoid unsafe assumptions about integers.

Use dedicated checks for NaN when ordinary equality cannot express the intended check. Use dedicated checks for signed zero under the same condition.

Use direct math APIs.
Use standard constants instead of hand-truncated approximations.
Specify rounding precision explicitly.
Use valid ranges.
Document tolerances when exact results are unavailable.
Avoid obscure arithmetic that hides the intended operation.

**Why:**

Precision loss, invalid operands, accidental bitwise conversion, and unsafe integer assumptions can silently change numeric results.
Misleading forms and impossible bounds obscure which values are valid.
NaN and signed zero have equality behavior that may not express the intended distinction. Dedicated checks make that distinction explicit.

Direct math APIs, standard constants, and stated rounding precision expose the intended operation.
Numerical algorithms can require approximation. Documented tolerances distinguish acceptable error from accidental precision loss.
Valid ranges keep results within the representation and domain that callers support.

**Good:**

```ts
// value is a numeric result. Reject NaN rather than treating it as a valid number.
if (Number.isNaN(value)) {
  rejectValue();
}
```

**Bad:**

```text
// value is a numeric result. NaN is unequal to every value, including itself, so this never rejects it.
if (value === NaN) {
  rejectValue();
}
```

### 6F. Preserve data through conversion

Use cloning operations that support the actual value types.
Use serialization operations that support the actual value types.
Do not clone data through lossy JSON conversion.
Do not expose bytes outside a buffer view.
Check that a value has a meaningful string representation before you convert it.

Define an explicit representation or ownership policy for unsupported values, including functions.
Omit, reject, retain a reference, or encode a registered identifier as the contract requires.

**Why:**

Cloning and serialization support particular value types, not arbitrary objects.
A lossy JSON round trip can change types or discard values.
Ignoring buffer-view bounds can expose bytes before or after the intended slice.
Default string conversion can replace meaningful data with a generic label.
Choosing a compatible conversion preserves the information that the destination needs.

No general conversion preserves arbitrary closures and their captured behavior. An explicit policy determines how unsupported values cross the boundary.

**Good:**

```ts
// The clone must preserve the date type. The byte view must contain only the middle byte.
const state = { createdAt: new Date(0) };
const storage = new Uint8Array([0, 1, 2]);
const view = storage.subarray(1, 2);
const snapshot = structuredClone(state);
const bytes = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
```

**Bad:**

```text
// The clone must preserve the date type. The byte view must contain only the middle byte.
const state = { createdAt: new Date(0) };
const storage = new Uint8Array([0, 1, 2]);
const view = storage.subarray(1, 2);
const snapshot = JSON.parse(JSON.stringify(state));
const bytes = new Uint8Array(view.buffer);
```

## 7. Security, protocols, and efficiency

### 7A. Keep executable input separate from data

Do not evaluate input strings as code.
Pass SQL values as parameters.
Escape values for the grammar of their destination.
Use secure transports.
Use safe URL protocols.

Check path containment.
Isolate untrusted embedded content.
Keep secrets out of browser-accessible storage and distributable application code.
Use a platform credential store only with an explicit threat model and suitable access controls.
Keep secrets out of public storage.
Make each check address the actual attack surface.

**Why:**

Executing input as code or SQL lets data change the operation itself. Parameters and destination-specific escaping keep those roles separate.
Secure transports protect data in transit, while safe protocols reject unintended execution or resource access.
Path containment prevents access outside the allowed location.

Isolating embedded content and keeping secrets out of exposed storage or distributed code reduce unauthorized access.
Protected platform credential stores can retain secrets within a defined access boundary.
Each boundary needs its own check because one safeguard does not address every attack surface.

**Good:**

```ts
// The database accepts positional question-mark parameters.
// requestedId may be "x' OR '1'='1". Binding keeps it one value rather than SQL syntax.
/**
Find user rows with a parameterized database query.
@param requestedId - The user identifier to bind as data.
@returns The database rows matching the requested identifier.
*/
function findUsersById(requestedId: string) {
  return database.query("SELECT * FROM users WHERE id = ?", [requestedId]);
}

/**
Parse a destination that must use the HTTPS protocol.
@param input - The absolute destination URL supplied by the caller.
@returns A parsed URL whose protocol is HTTPS.
@throws {TypeError} If the URL is invalid or its protocol is not HTTPS.
*/
function parseHttpsDestination(input: string) {
  const destination = new URL(input);

  if (destination.protocol !== "https:") {
    throw new TypeError("The destination must use HTTPS.");
  }

  return destination;
}
```

**Bad:**

```text
// requestedId may be "x' OR '1'='1", which turns this interpolated query into a condition matching every row.
database.query(`SELECT * FROM users WHERE id = '${requestedId}'`);

/**
Parse a destination that must use the HTTPS protocol.
@param input - The absolute destination URL supplied by the caller.
@returns A parsed URL whose protocol is HTTPS.
@throws {TypeError} If the URL is invalid or its protocol is not HTTPS.
*/
function parseHttpsDestination(input: string) {
  // A URL such as file:///private/report is accepted despite the HTTPS contract.
  return new URL(input);
}
```

### 7B. Use protocol-aware networking APIs

Construct URLs with structured APIs.
Construct query parameters with structured APIs.
Check request and response options.
Check protocols.

Interpret response bodies according to their status.
Do not treat an unsuccessful response body as the requested success data.
Preserve required response and session commits.

Do not parse URLs manually.
Do not combine invalid cache options.
Do not combine invalid credential options.

**Why:**

Structured URL and query APIs encode values without confusing data with URL syntax.
Manual parsing can mishandle delimiters, escaping, or existing parameters.
Valid request, response, protocol, cache, and credential choices preserve the intended transport behavior.
An unsuccessful status can carry diagnostics instead of the requested result. Reading that body is valid when handled as error data.
Required response and session commits make changes available to the recipient.

**Good:**

```ts
// For name "A&B", the query must preserve the ampersand as part of the name. Error bodies are not report data.
/**
Encode untrusted name text in a report request URL.
@param endpoint - A prevalidated HTTPS URL for the trusted report service.
@param name - Untrusted text to encode as a query value.
@returns A URL with its name query parameter replaced.
*/
function createRequestUrl(endpoint: string, name: string) {
  const url = new URL(endpoint);

  url.searchParams.set("name", name);

  return url;
}

/**
Request report data with status checks and caller-controlled cancellation.
@param endpoint - A prevalidated HTTPS URL for the trusted report service.
@param name - Untrusted text to encode as a query value.
@param signal - The caller-owned signal that cancels this request.
@returns The parsed response body, with its shape left unchecked.
@throws {Error} If the request fails, its status is unsuccessful, or its body is not valid JSON.
*/
async function loadData(endpoint: string, name: string, signal: AbortSignal): Promise<unknown> {
  const url = createRequestUrl(endpoint, name);
  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error("The report request failed.");
  }

  return response.json();
}
```

**Bad:**

```text
// endpoint is a prevalidated trusted HTTPS URL. name may be "A&B".
// Raw interpolation makes name equal "A" and adds a separate B parameter. Error bodies are not report data.
const response = await fetch(`${endpoint}?name=${name}`);
const data = await response.json();
```

### 7C. Avoid repeated allocation and needless asymptotic cost

Move stable expensive work outside repeated operations.
Use indexed lookup when lookup volume and access patterns justify construction and retention cost.
Preserve first-match behavior and key semantics when replacing searches with indexed lookup.
Do not copy an accumulator during every iteration.
Keep operations that block execution outside frequently executed paths.
Defer work until after guards.

Use batches when they preserve behavior.
Use lazy iteration when it preserves behavior.
Use native operations when they preserve behavior.

Do not move index construction before guards that must prevent it.

**Why:**

Repeated setup, allocation, and searches multiply costs as input grows.
Copying an accumulator on each iteration can repeatedly copy all earlier work.
Indexed lookup trades construction and retention cost for cheaper repeated searches.
Small batches or consistently early matches may favor scans. Preserved first-match and key behavior keep lookup results unchanged.

Blocking work on frequent paths delays other operations.
Guards can prevent expensive work entirely.
Batches, lazy iteration, and native operations help only when they preserve results, timing, and effects.

**Good:**

```ts
// This large batch repeats enough searches to justify constructing and retaining one index.
// Users, IDs, and input order remain stable throughout this request batch.
// Rebuild or update the index if they change.
/**
Build a lookup index that preserves the first user for each ID.
@param records - Users in lookup order, including any duplicate IDs.
@returns An ID index that keeps the first user for each ID.
*/
function indexUsers(records: User[]) {
  const usersById = new Map<string, User>();

  for (const user of records) {
    if (usersById.has(user.id)) {
      continue;
    }

    usersById.set(user.id, user);
  }

  return usersById;
}

const usersById = indexUsers(users);

for (const request of requests) {
  serve(request, usersById.get(request.userId));
}
```

**Bad:**

```text
// Each request scans users again, repeating work as the batch grows.
// This large batch repeats enough searches to justify constructing and retaining one index.
// Users, IDs, and input order remain stable throughout this request batch.
// Duplicate IDs must select the first user in input order.
for (const request of requests) {
  const user = users.find((item) => item.id === request.userId);
  serve(request, user);
}
```

### 7D. Give caches and identities correct lifetimes

Reuse stable objects only when their inputs and ownership allow it.
Include all relevant inputs in cache keys.
Make cache invalidation reflect actual reads.
Make subscription dependencies reflect actual reads.

Avoid stale snapshots.
Avoid unnecessary recreation of values.
Avoid subscriptions to an entire store when you need only part of it.
Avoid derived state that duplicates its source of truth.

**Why:**

Reuse is correct only while the value's inputs, ownership, and lifetime remain valid.
Missing cache-key inputs can return another request's result.
Invalidation and subscription dependencies must cover actual reads to avoid stale data.
Unnecessary recreation loses useful identity and repeats work.
Broad subscriptions cause updates unrelated to the value that an operation needs.
Mirrored derived state can disagree with its source.

**Good:**

```ts
// The cache belongs to one immutable report-data snapshot. Account and locale are its only varying report inputs.
// getOrInsertComputed reuses a cached value or invokes its loader on a miss.
/**
Encode all report inputs without ambiguous separators.
@param account - The account identifier included in report contents.
@param language - The locale that controls report text.
@returns An unambiguous encoding of the account and locale pair.
*/
function makeCacheKey(account: string, language: string) {
  return JSON.stringify([account, language]);
}

const cacheKey = makeCacheKey(accountId, locale);
const report = await cache.getOrInsertComputed(cacheKey, () => loadReport(accountId, locale));
```

**Bad:**

```text
// For one account, an English request fills this key. A later French request incorrectly receives that English report.
// The cache belongs to one immutable report-data snapshot. Account and locale are its only varying report inputs.
// getOrInsertComputed reuses a cached value or invokes its loader on a miss.
const cacheKey = accountId;
const report = await cache.getOrInsertComputed(cacheKey, () => loadReport(accountId, locale));
```

## 8. Interfaces and graphics

### 8A. Make interfaces perceivable and operable

Give controls, dialogs, links, media, and navigation useful names.
Use valid semantics.
Provide these interface features:

- Provide keyboard access.
- Provide a sensible focus order.
- Provide labels.
- Provide captions.
- Specify the language.
- Preserve paste behavior.
- Preserve input-method behavior.

Avoid hidden focusable controls.
Avoid redundant accessibility attributes.
Avoid invalid accessibility attributes.
Avoid intrusive announcements.
Avoid unexpected motion.

**Why:**

Useful names and valid semantics tell readers and assistive technology what each control or region does.
Keyboard access and sensible focus order allow operation without a pointer.
Labels identify inputs, captions provide speech information visually, and language metadata supports correct pronunciation.
Preserved paste and input-method behavior supports established text-entry workflows.

Hidden focusable controls can trap navigation on content users cannot perceive.
Invalid or redundant accessibility attributes can contradict native meaning.
Intrusive announcements interrupt other information.
Unexpected motion can distract users or cause physical discomfort.

**Good:**

```ts
/**
Mount a named confirmation button after the document body exists.
@param onConfirm - The action invoked by keyboard or pointer activation.
*/
function mountConfirmButton(onConfirm: () => void): void {
  const button = document.createElement("button");

  button.type = "button";
  button.textContent = "Confirm";
  button.addEventListener("click", onConfirm);
  document.body.append(button);
}
```

**Bad:**

```text
// The body exists. The control needs a visible name and keyboard and pointer activation.
function mountConfirmButton(onConfirm: () => void): void {
  const control = document.createElement("div");

  control.textContent = "Confirm";
  // Pointer users can click, but the div has no native focus or keyboard activation.
  control.addEventListener("click", onConfirm);
  document.body.append(control);
}
```

### 8B. Keep presentation constraints consistent and responsive

Use valid content structure.
Use compatible layout constraints.
Keep animation ranges within their bounds.
Use stable item identifiers.
Use appropriate responsive media.
Respect reduced-motion preferences.

Update only the presentation properties that need changes.
Avoid expensive layout work during every frame. Avoid global work during every frame. Apply these checks to graphical interfaces and visualizations.

**Why:**

Valid content structure and compatible layout constraints prevent contradictory presentation behavior.
Bounded animation ranges avoid invalid intermediate states.
Stable identifiers preserve item identity during updates.
Responsive media adapts content to the available screen.
Reduced-motion preferences let users avoid optional movement.

Updating only changed properties avoids unnecessary work.
Repeated layout and global operations can consume the frame budget and delay interaction.
Graphical interfaces and visualizations share these timing and presentation constraints.

**Good:**

```ts
// ANIMATION_DURATION uses milliseconds.
/**
Animate an optional entrance unless the user requests reduced motion.
@param element - A visible element already in its final display state.
@param isReducedMotionRequested - Whether the current user preference disables this optional animation.
*/
function showEntrance(element: HTMLElement, isReducedMotionRequested: boolean) {
  if (isReducedMotionRequested) {
    return;
  }

  element.animate({ opacity: [0, 1] }, { duration: ANIMATION_DURATION });
}
```

**Bad:**

```text
// The element is visible in its final state. The preference reflects the current reduced-motion setting.
// ANIMATION_DURATION uses milliseconds.
function showEntrance(element: HTMLElement, isReducedMotionRequested: boolean) {
  element.animate({ opacity: [0, 1] }, { duration: ANIMATION_DURATION });
}
```

### 8C. Keep graphics state, buffers, and frame work coherent

Check these graphics contracts:

- Check dimensions.
- Check item sizes.
- Check ranges.
- Check shader interfaces.
- Check support for backend features.

Initialize graphics resources before use.
Propagate resize changes.
Propagate changes to dirty state.
Supply required inputs.
Advance animations by elapsed time.

Batch supported, compatible draws only when ordering, blending, resource use, and limits remain correct.
Release graphics resources that the current scope owns.

**Why:**

Dimensions, item sizes, and ranges determine how graphics operations interpret data. Shader interfaces and backend support determine whether that data can be processed.
Initialization and required inputs establish usable graphics state.
Resize and dirty-state propagation keep output consistent with changed inputs.
Elapsed-time animation preserves speed across changing frame rates.

Compatible batches reduce repeated setup without changing draw semantics.
Incompatible batches can change ordering, blending, or resource behavior.
Releasing owned resources prevents retained graphics memory.

**Good:**

```ts
// The mixer expects seconds.
/**
Advance animation and render the updated scene for one frame.
@param deltaSeconds - Elapsed seconds since the preceding variable-rate frame.
*/
function advance(deltaSeconds: number): void {
  mixer.update(deltaSeconds);
  renderer.render(scene, camera);
}
```

**Bad:**

```text
// At 60 frames per real second, this advances 60 animation seconds instead of one.
// Call this once per frame at a variable frame rate. The mixer expects elapsed seconds.
function advance(): void {
  mixer.update(1);
  renderer.render(scene, camera);
}
```

## 9. Documentation and comments

### 9A. Make maintenance notes actionable

Give each TODO comment a specific task.
Give each TODO comment a clear condition for completion or removal.

**Why:**

A specific task tells the next reader what remains unfinished.
A completion or removal condition makes the note actionable instead of permanent uncertainty.

**Good:**

```ts
// TODO: Remove the legacy-ID adapter when all producers emit schema v2 IDs.
const adapter = createCompatibilityAdapter();
```

**Bad:**

```text
// TODO: Fix this someday.
const adapter = createCompatibilityAdapter();
```

### 9B. Document classes and callable contracts

Document every top-level function.
Document every class.
Document every class method, including constructors and accessors.
Document callable class fields.
Start with a short purpose summary.

Describe each parameter's meaning. Include units, bounds, defaults, and constraints when relevant.
Describe destructured parameters at their root. Add property details when readers need them.

Describe the meaning of returned values. Explain absence when a result may be missing.
Describe resolved values for asynchronous returns.
Do not add return descriptions for constructors or procedures without results.

Document known exceptions when relevant.
Describe side effects and ownership when relevant.
State restrictions on when callers may invoke the operation.
Describe what each class instance represents.

Attach documentation comments to their declarations.
Describe the caller's contract rather than internal steps.
Do not repeat signatures or type information already present in code.
Do not replace useful descriptions with paraphrases of identifiers.

**Why:**

Consistent documentation makes top-level functions, classes, methods, constructors, accessors, and callable fields discoverable without guessing which declarations need explanation.
A short purpose summary establishes what an operation or instance represents.
Parameter meaning, units, bounds, defaults, and constraints describe valid use.
Destructured roots identify the overall input, while useful property details explain its relevant parts.

Return meaning, absence, and asynchronous resolution explain what callers receive.
Procedures and constructors need no invented return contract.
Exceptions, side effects, ownership, and call restrictions describe obligations that signatures alone cannot express.
Attached comments stay connected to the declaration they describe.
Caller contracts remain useful when internal steps change.
Repeated types, signatures, and identifier paraphrases add reading without explaining behavior.

**Good:**

```ts
/**
Remove surrounding whitespace from a report title.
@param title - User-entered heading text, including any surrounding whitespace.
@returns The heading text with surrounding whitespace removed.
*/
function normalizeTitle(title: string) {
  return title.trim();
}

/**
Store the normalized title used in a report heading.
*/
class ReportHeading {
  #title: string;

  /**
  Create a heading from the proposed title.
  @param title - The proposed heading title from user input.
  */
  constructor(title: string) {
    this.#title = normalizeTitle(title);
  }

  /**
  Read the heading text displayed above the report.
  @returns The normalized heading text.
  */
  read() {
    return this.#title;
  }
}
```

**Bad:**

```text
/** Normalize the title. */
function normalizeTitle(title: string) {
  return title.trim();
}

/** Represents a report heading. */
class ReportHeading {
  #title: string;

  /** Create an instance. */
  constructor(title: string) {
    this.#title = normalizeTitle(title);
  }

  /** Read the title. */
  read() {
    return this.#title;
  }
}
```

### 9C. Explain non-obvious decisions

Use inline comments for reasons, invariants, and non-obvious algorithms.
Do not narrate obvious operations.
Prefer clear names and simple code to comments that explain confusing code.
Remove stale comments.
Remove commented-out code.
Keep change history outside code comments.

Keep comments consistent with code changes.
Omit optional inline comments when they add no useful information.
Keep required declaration documentation even when inline commentary is unnecessary.

**Why:**

Reasons, invariants, and non-obvious algorithms explain decisions that code alone may not reveal.
Narrating obvious steps adds reading without answering why the code exists.
Clear names and simpler code reduce the need for explanations of confusing code.
Stale comments and commented-out code can mislead readers about current behavior.
Inline change histories accumulate outdated explanations, while recorded changes already preserve the sequence.
Optional commentary can be omitted, while required declaration documentation still provides the caller's contract.

**Good:**

```ts
/**
Get the calendar date used in reports across regions.
@param timestamp - Milliseconds since the Unix epoch for this report.
@returns The complete UTC calendar date, including any extended year.
@throws {RangeError} If the timestamp cannot form a valid date.
*/
function reportDate(timestamp: number) {
  const date = new Date(timestamp);
  const isoTimestamp = date.toISOString();

  // UTC keeps report dates independent of the deployment region.
  return isoTimestamp.slice(0, isoTimestamp.indexOf("T"));
}
```

**Bad:**

```text
/**
Get the calendar date used in reports across regions.
@param timestamp - Milliseconds since the Unix epoch for this report.
@returns The complete UTC calendar date, including any extended year.
@throws {RangeError} If the timestamp cannot form a valid date.
*/
function reportDate(timestamp: number) {
  const date = new Date(timestamp);
  const isoTimestamp = date.toISOString();

  // Take the part before T.
  return isoTimestamp.slice(0, isoTimestamp.indexOf("T"));
}
```
