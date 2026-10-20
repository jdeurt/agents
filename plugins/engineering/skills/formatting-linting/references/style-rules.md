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

The following layouts mix sibling items across lines and should be avoided.

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
Separate control-flow units with blank lines.
Put a blank line before a final return that follows another statement.

Keep overload signatures adjacent to their implementation. Do not put blank lines within an overload group.
Adapt declaration spacing to the language.

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
class Counter {
  read() { return this.value; }
  reset() { this.value = 0; }
}
class Gauge {}
```

### 1D. Keep units small and expressions readable

Split long modules into units with named responsibilities.
Split complex functions into units with named responsibilities.
Split complex protected exception regions into units with named responsibilities.
Split deeply nested calls into named intermediate values.
Name complex expressions that produce iterables.
Unpack only the fields that you need.

Preserve useful behavior when you split code.
Do not split code only to satisfy a count.
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

Count the outermost call at depth 1. Add 1 for each call nested inside an argument. The expression `publish(normalize(read()))` has depth 3.
Receiver chains do not increase call depth. The expression `load().normalize().publish()` has depth 1.
Split deeper expressions into named intermediate values.

**Good:**

```ts
const available = loadAvailableItems();
const ordered = orderItems(available);

for (const item of ordered) {
  publish(item);
}
```

**Bad:**

```text
publish(serialize(normalize(loadReport())));
```

### 1E. Name values for their role

Use consistent spelling.
Use consistent filename conventions.
Boolean names should read as predicates.
Use action names for callable operations.
Give exported functions and classes useful names.
Name caught exceptions consistently.

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
Initializers can execute work during declaration. Preserve their timing when you reorganize declarations.
Put a blank line between the final declaration in a group and the next executable statement.
Imports, types, functions, and other variable declarations may precede these declarations.
Loop-header declarations may remain in the loop header.

Use the smallest scope that owns a value.
Move independent functions to an outer scope.
Preserve evaluation order.
Use a conditional or named helper for work that must wait for a condition.
Do not add standalone blocks to relocate declarations.
Keep a closure nested when it needs surrounding local state.

Use helpers for cohesive business operations.
Do not create helpers only to relocate declarations.
Keep logging, reading, and publication in their original order.

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
function loadReport(isReady: boolean) {
  if (!isReady) {
    return;
  }

  logStart();
  readAndPublishReport();
}
```

**Bad:**

```text
function loadReport(isReady: boolean) {
  if (!isReady) {
    return;
  }

  logStart();
  const report = readReport();
  publish(report);
}
```

### 2C. Use deliberate, unambiguous bindings

Declare names before use.
Define names before use.
Initialize values before you read them.
Do not shadow existing names.
Do not redeclare existing names.
Prefer immutable local bindings when their values do not change.

Do not replace these bindings:

- Do not reassign imported bindings.
- Do not reassign constant bindings.
- Do not reassign exception bindings.
- Do not reassign class bindings.
- Do not reassign function bindings.
- Do not replace or remove language-reserved bindings.

Reserved bindings include language-provided values such as `undefined`.
Changing a binding differs from changing the object that it refers to. Apply ownership rules before changing object contents.

**Good:**

```ts
const source = loadSource();
const result = normalize(source);

consume(result);
```

**Bad:**

```text
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

Remove empty files.
Remove empty patterns.
Remove accidental empty bodies.
Use the results of lazy operations, or consume them deliberately.
Make intentional operations that do nothing explicit. Explain why those operations are necessary.

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

Give each parameter one unambiguous meaning.
Give each object key one unambiguous meaning.
Give each enum value one unambiguous meaning.
Give each class member one unambiguous meaning.

Give each branch one unambiguous meaning.
Give each logical operand one unambiguous meaning.
Give each switch case one unambiguous meaning.
Give each set item one unambiguous meaning.

Combine identical adjacent branches.
Combine repeated operations when possible.

**Good:**

```ts
const options = { isReady: true, isRetrying: false };
```

**Bad:**

```text
const options = { isReady: true, isReady: false };
```

### 2F. Factor shared work without unnecessary abstraction

Move code shared by all branches outside those branches.
Preserve the order of condition evaluation and shared effects. Do not move shared effects before a condition when this changes behavior.

Combine compatible consecutive operations.
Remove wrappers that repeat at every call.
Use a meaningful helper for repeated boilerplate.
Remove parameters whose values never vary.

Here, `isRemote` is a Boolean value without side effects.

**Good:**

```ts
const payload = serialize(report);

if (isRemote) {
  upload(payload);
} else {
  save(payload);
}
```

**Bad:**

```text
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

These functions receive dense arrays of strings.

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
Remove unused imports.
Remove redundant reexports.
Keep package usage compatible with the installed version.

Prefer maintained APIs to deprecated APIs.
Import only the parts that you need.
Avoid costly imports of an entire library.

**Good:**

```ts
import { loadReport, saveReport } from "./storage.ts";
```

**Bad:**

```text
import { loadReport } from "./storage.ts";
import { saveReport } from "./storage.ts";
```

## 3. Conditions and state

### 3A. Make conditions direct and intentional

Use explicit comparisons when necessary.
Put simple positive conditions first.
Return Boolean results directly.
Use the narrowest conditional expression.

Avoid these ambiguous or redundant expressions:

- Avoid nested ternaries.
- Avoid assignments in conditions.
- Avoid ambiguous negation.
- Avoid duplicate comparisons.
- Avoid expressions with a constant result.

Make logical and nullish operators preserve false, zero, and empty values according to the intended contract.

**Good:**

```ts
/**
Check whether a nonempty selection may be published.
@param count - The number of items selected for publication.
@param hasPermission - Whether the caller may publish the selection.
@returns Whether the selection is nonempty and publication is allowed.
*/
function canPublish(count: number, hasPermission: boolean) {
  const isAvailable = count > 0 && hasPermission;

  return isAvailable;
}
```

**Bad:**

```text
const isAvailable = count > 0 ? (hasPermission ? true : false) : false;
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
- Avoid a lone nested conditional.

Put the loop condition in the loop header when this makes the exit clear.

**Good:**

```ts
/**
Process valid items only after the caller marks input ready.
@param isReady - Whether processing may begin.
@param items - The batch to process in its existing order.
*/
function publishValidItems(isReady: boolean, items: Item[]) {
  if (!isReady) {
    return;
  }

  for (const item of items) {
    if (!item.isValid) {
      continue;
    }

    processItem(item);
  }
}
```

**Bad:**

```text
function publishReport() {
  return report;
  publish(report);
}
```

### 3C. Iterate values directly

Iterate values directly.
Use only the indices or entries that you need.
Name complex expressions that produce iterables.
Avoid duplicate passes through a collection.
Do not mutate a collection during iteration.
Use native iteration or comprehension syntax.

**Good:**

```ts
for (const item of items) {
  processItem(item);
}
```

**Bad:**

```text
for (const item of items) {
  items.push(transform(item));
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

Here, the inputs are caller-owned and must remain unchanged.

**Good:**

```ts
const sortedItems = items.toSorted(compareItems);
const nextState = { ...state, isReady: true };
```

**Bad:**

```text
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
Use stable identifiers when identity must survive reordering. Do not use positions or random values for those identifiers.

Here, other observers share the input state, which must remain unchanged.

**Good:**

```ts
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
Here, the same inputs make `buildView` return the same view.
Use stable identifiers.

**Good:**

```ts
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

These inputs are complete decimal integer strings.

**Good:**

```ts
const textValues = ["10", "11", "12"];
const numbers = textValues.map(Number);
```

**Bad:**

```text
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

**Good:**

```ts
/**
Check whether an item has reached the ready state.
@param item - The workflow item to inspect.
@returns Whether the item status is ready.
*/
function isReady(item: Item) {
  return item.status === "ready";
}

const readyItems = items.filter((item) => isReady(item));
```

**Bad:**

```text
const readyItems = items.filter((item) => {
  isReady(item);
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

**Good:**

```ts
/**
Publish the value of the first item matching the request.
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

- Avoid empty types.
- Avoid unsafe types.
- Avoid duplicate alternatives.
- Avoid unnecessary annotations.
- Avoid unnecessary assertions.
- Avoid type parameters that express no relationship.

Keep type-only dependencies separate where the language supports this.

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
type Status = "ready" | "ready";

function identity<T>(value: string): string {
  return value;
}
```

### 4F. Give classes and objects a clear purpose

Use classes for meaningful instances.
Do not use classes as containers for static functions only.
Declare class members.
Keep class members in a consistent order.
Preserve parent-class accessor contracts.

Avoid recursive accessors.
Remove useless constructors.
Remove useless overrides.
Bind instance methods when you pass them as callbacks.
Prefer native fields and encapsulation.

**Good:**

```ts
/**
Store the current value for one counter instance.
*/
class Counter {
  #value = 0;

  /**
  Read the current counter value.
  @returns The value stored by this counter.
  */
  read() {
    return this.#value;
  }
}
```

**Bad:**

```text
class Counter {
  get value() {
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

Here, construction acquires no resources that need explicit cleanup.
The client supports cleanup after partial initialization. Its close operation releases partial resources without throwing.

**Good:**

```ts
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
Do not use asynchronous callbacks in synchronous APIs.
Await returned work when exception handling requires it.

Preserve rejection handling.
Remove unnecessary promise wrappers.
Use the language's direct asynchronous syntax.

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
items.forEach(async (item) => {
  await saveItem(item);
});
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

These loaders have no dependency on each other. They can run together safely. Both may start even if either operation fails. Both loaders report failures through their promises.

**Good:**

```ts
const [users, projects] = await Promise.all([loadUsers(), loadProjects()]);

renderDashboard(users, projects);
```

**Bad:**

```text
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

**Good:**

```ts
const controller = new AbortController();

target.addEventListener("message", onEvent, { signal: controller.signal });

try {
  await waitForCompletion();
} finally {
  controller.abort();
}
```

**Bad:**

```text
target.addEventListener("message", () => onEvent());
target.removeEventListener("message", () => onEvent());
```

## 6. Collections, text, and data

### 6A. Choose the collection operation matching the question

Use an operation that matches the question:

- Use find for one item.
- Use some or any for existence checks.
- Use a membership container for repeated membership checks.
- Use map to transform values.
- Use grouping operations to form groups.
- Use set operations for set relationships.

Do not sort a collection only to find an extreme value.
Avoid redundant collection materialization.
Avoid unnecessary passes through a collection.
Stop iteration when you have the one result that you need.

**Good:**

```ts
const hasReadyItem = items.some((item) => isReady(item));
```

**Bad:**

```text
const hasReadyItem = items.filter(isReady).length > 0;
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

Here, sizes contains numbers.
The entries value is a Map, not a plain record.

**Good:**

```ts
const sortedSizes = sizes.toSorted((left, right) => left - right);
const value = entries.get(requestedKey);
const summary = names.join(", ");
```

**Bad:**

```text
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

Normalize every underscore to a hyphen.

**Good:**

```ts
const value = "account_name_updated";
const normalized = value.replaceAll("_", "-");
const isReport = filename.endsWith(".json");
```

**Bad:**

```text
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

These chunks form one ordered UTF-8 stream. A chunk may split a multibyte sequence.
The example replaces malformed input with replacement characters.

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

- Avoid precision loss.
- Avoid invalid numeric operands.
- Avoid accidental bitwise operations.
- Avoid misleading numeric forms.
- Avoid impossible bounds.
- Avoid unsafe assumptions about integers.

Use dedicated checks for NaN when ordinary equality cannot express the intended check. Use dedicated checks for signed zero under the same condition.

Use direct math APIs.
Use exact constants.
Specify rounding precision explicitly.
Use valid ranges.
Avoid approximate or obscure arithmetic.

**Good:**

```ts
if (Number.isNaN(value)) {
  rejectValue();
}
```

**Bad:**

```text
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

Here, the clone must preserve the date type.
The byte view must include only the middle byte.
Choose another conversion for values that structured cloning cannot copy, such as functions.

**Good:**

```ts
const state = { createdAt: new Date(0) };
const storage = new Uint8Array([0, 1, 2]);
const view = storage.subarray(1, 2);
const snapshot = structuredClone(state);
const bytes = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
```

**Bad:**

```text
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
Keep secrets out of client storage.
Keep secrets out of public storage.
Make each check address the actual attack surface.

The database example uses positional question-mark parameters.
The independent URL example checks only the protocol.

**Good:**

```ts
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
database.query(`SELECT * FROM users WHERE id = ${requestedId}`);
eval(input);
```

### 7B. Use protocol-aware networking APIs

Construct URLs with structured APIs.
Construct query parameters with structured APIs.
Check request and response options.
Check protocols.
Check response status before you consume the body.
Preserve required response and session commits.

Do not parse URLs manually.
Do not combine invalid cache options.
Do not combine invalid credential options.

Here, the endpoint is an absolute URL.
The name argument contains untrusted text.

**Good:**

```ts
/**
Encode untrusted name text in a report request URL.
@param endpoint - An absolute URL for the report service.
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
@param endpoint - An absolute URL for the report service.
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
const response = await fetch(`${endpoint}?name=${name}`);
const data = await response.json();
```

### 7C. Avoid repeated allocation and needless asymptotic cost

Move stable expensive work outside repeated operations.
Use indexed lookup for repeated searches.
Do not copy an accumulator during every iteration.
Keep operations that block execution outside frequently executed paths.
Defer work until after guards.

Use batches when they preserve behavior.
Use lazy iteration when it preserves behavior.
Use native operations when they preserve behavior.

Here, duplicate IDs select the first user in input order. The index preserves that behavior for repeated lookups.
Do not move index construction before guards that must prevent it.

Users, their IDs, and their ordering remain stable across this request batch. Update or rebuild the index when those inputs change.

**Good:**

```ts
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

Here, report contents depend on both the account and locale. The key encodes both strings without ambiguous separators. The loader receives those same inputs.

**Good:**

```ts
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

Call this function after the document body exists.
The native button supports focus, keyboard activation, and pointer activation. Its visible text supplies the accessible name.

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
function mountConfirmButton(onConfirm: () => void): void {
  const control = document.createElement("div");

  control.addEventListener("pointerdown", onConfirm);
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

Here, the element already has its visible final state.
The preference reflects the current reduced-motion setting.
The duration uses milliseconds.

**Good:**

```ts
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

Batch repeated draws.
Release graphics resources that the current scope owns.

Call advance once per frame at a variable frame rate. The caller supplies elapsed seconds since the preceding frame. The mixer expects seconds.

**Good:**

```ts
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
function advance(): void {
  mixer.update(1);
  renderer.render(scene, camera);
}
```

## 9. Documentation and comments

### 9A. Make maintenance notes actionable

Give each TODO comment a specific task.
Give each TODO comment a clear condition for completion or removal.

**Good:**

```ts
// TODO: Remove the adapter when the upstream migration is complete.
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
