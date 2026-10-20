# Rules of style

Use each language’s native syntax and standard library. Examples use TypeScript.

## Legibility

### Lay out lists consistently at each depth

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

### Use a predictable visual grammar

Use ordinary spaces.
Align nested code.
Make operator boundaries visible.
Put one statement on each line.
Write clear comments.

End each file with a newline.
Do not leave trailing whitespace.
Do not use irregular whitespace.
Aim for lines within 120 columns.
Allow longer lines when a line break reduces clarity.

**Good:**

```ts
function calculateTotal(subtotal: number, tax: number) {
  const total = subtotal + tax;

  // Explain why a decision is necessary.
  return total;
}
```

**Bad:**

```text
const total=subtotal+tax;return total;
```

### Separate structural units

Consecutive imports may remain together.
Put a blank line after the final import before any other statement.

Keep consecutive declarations of the same kind together.
Put a blank line between constant and mutable declaration groups.
Put a blank line after the final declaration before executable code.

Put blank lines between class methods.
Put blank lines around class declarations.
Separate control-flow units with blank lines.
Separate final returns with blank lines.

Keep overload signatures adjacent to their implementation.
Do not put blank lines within an overload group.
Adapt declaration spacing to the language.

**Good:**

```ts
import { SOURCE } from "./source.ts";
import { TARGET } from "./target.ts";

const route = [SOURCE, TARGET];

class Counter {
  #value: number | undefined;

  read(): number | undefined;
  read(fallback: number): number;
  read(fallback?: number): number | undefined {
    return this.#value ?? fallback;
  }

  reset() {
    this.#value = 0;
  }
}

class Gauge {
  #value = 0;

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

### Keep units small and expressions readable

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

Complexity measures branching.
A straight-line body has complexity 1.
Add 1 for each decision point.
Count these constructs as decision points:

- Count each conditional branch.
- Count each loop.
- Count each non-default case.
- Count each catch.
- Count each default-value choice.
- Count each short-circuit condition check.

Count independent paths, not every possible combination of execution paths.
Apply the same count to the protected body of a try block.
A try block with complexity 1 has no decision points in its protected body.
Count nested functions separately from their enclosing body.

Count the outermost call at depth 1.
Add 1 for each call nested inside an argument.
The expression `publish(normalize(read()))` has depth 3.
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

### Name values for their role

Use consistent spelling.
Use consistent filename conventions.
Boolean names should read as predicates.
Use action names for callable operations.
Give exported functions and classes useful names.
Name caught exceptions consistently.

**Good:**

```ts
const isReady = queue.length > 0;

function publishReport() {
  return report;
}
```

**Bad:**

```text
const ready = queue.length > 0;

function thing() {
  return report;
}
```

## Maintainability and duplication

### Name meaningful numbers and strings

Give meaningful numbers and strings stable names near their owner.
Use names for domain numbers, paths, messages, and similar values.
The values 0, 1, and 2 may remain inline.
Strings of up to 10 characters may remain inline.
Give longer strings meaningful names.
Named static literal data may contain inline values.

Use literal text for property keys, module sources, literal types, and language directives.
Use the language's convention for named constants, even without immutable bindings.

**Good:**

```ts
const REPORT_PATH = "reports/summary.json";
const SAVED_MESSAGE = "Report saved";
const RETRY_LIMIT = 5;

writeReport(REPORT_PATH, RETRY_LIMIT);
notify(SAVED_MESSAGE);
```

**Bad:**

```text
writeReport("reports/summary.json", 5);
notify("Report saved");
```

### Keep declarations in the right scope

Keep constant and mutable declarations before executable statements in their scope.
Put a blank line between the final declaration in a group and the next executable statement.
Imports, types, functions, and other variable declarations may precede these declarations.
Loop-header declarations may remain in the loop header.

Use the smallest scope that owns a value.
Move independent functions to an outer scope.
Preserve evaluation order.
Introduce a smaller block after an early exit when necessary.
Keep a closure nested when it needs surrounding local state.

**Good:**

```ts
function loadReport(isReady: boolean) {
  if (!isReady) {
    return;
  }

  {
    const report = readReport();

    publish(report);
  }
}
```

**Bad:**

```text
function publishReport() {
  logStart();
  const report = readReport();
  publish(report);
}
```

### Use deliberate, unambiguous bindings

Declare names before use.
Define names before use.
Initialize values before you read them.
Do not shadow existing names.
Do not redeclare existing names.
Prefer immutable local bindings when their values do not change.

Preserve these bindings:

- Preserve imported bindings.
- Preserve constant bindings.
- Preserve exception bindings.
- Preserve class bindings.
- Preserve function bindings.
- Preserve reserved bindings.

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

### Remove dead, empty, and ineffective work

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
Make intentional operations that do nothing explicit.
Explain why those operations are necessary.

**Good:**

```ts
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

### Avoid duplicate declarations and alternatives

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
if (isQueued || isRetrying) {
  schedule(job);
}
```

**Bad:**

```text
const options = { isReady: true, isReady: false };
```

### Factor shared work without unnecessary abstraction

Move code shared by all branches outside those branches.
Combine compatible consecutive operations.
Remove wrappers that repeat at every call.
Use a meaningful helper for repeated boilerplate.
Remove parameters whose values never vary.

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

### Prefer the simplest operation that states intent

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

**Good:**

```ts
function formatNames(names: string[], separator = DEFAULT_SEPARATOR) {
  return names.join(separator);
}
```

**Bad:**

```text
const joined = names.reduce(
  (text, name, index) => text + (index ? SEPARATOR : "") + name,
  ""
);
```

### Use explicit, supported dependencies

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
import type { Report } from "./report.ts";
import { saveReport } from "./storage.ts";
```

**Bad:**

```text
import { saveReport } from "./storage.ts";
import { saveReport as saveAgain } from "./storage.ts";
```

### Make maintenance notes actionable

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

## Conditions and state

### Make conditions direct and intentional

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
function canPublish(count: number, hasPermission: boolean) {
  const isAvailable = count > 0 && hasPermission;

  return isAvailable;
}
```

**Bad:**

```text
const isAvailable = count > 0 ? (hasPermission ? true : false) : false;
```

### Make control flow explicit and reachable

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

### Iterate values directly

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

### Make state changes local and intentional

Prefer collection operations that preserve their input.
Preserve inputs that belong to the caller.
Avoid shared mutable defaults.
Avoid arrays whose elements share the same mutable reference.
Avoid hidden writes to global state.
Avoid mutation during calculations.

Compute a new next state when the ownership contract requires it.

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

### Keep calculation separate from effects

Keep reusable modules free of top-level effects.
Keep calculations pure.
Keep updates outside render and evaluation paths.
Trigger effects through explicit operations.
Make the dependencies and ownership of those operations visible.
Prevent repeated feedback loops between state and effects.

Apply the same separation to imports and computed properties.

**Good:**

```ts
export function calculateTotal(items: Item[]) {
  return sumPrices(items);
}

export function publishTotal(total: number) {
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

### Keep state transitions consistent

Use one source of truth.
Derive values from current inputs.
Make updates atomic.
Avoid stale reads.
Avoid feedback loops.

Avoid mutation of shared state in place.
Avoid unnecessary state that mirrors other state.
Use stable identifiers when identity must survive reordering.
Do not use positions or random values for those identifiers.

**Good:**

```ts
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

### Make repeated evaluation deterministic

Keep clocks, randomness, and environment reads outside repeatable calculations unless you pass them as explicit inputs.
Keep allocation and external effects outside repeatable calculations unless you pass them as explicit inputs.

Make repeated results agree when identity and content must remain stable.
Make server and client results agree under the same condition.
Seed deliberate randomness.
Use stable identifiers.

**Good:**

```ts
function makeView(timestamp: number, seed: number) {
  return buildView(timestamp, createRandom(seed));
}
```

**Bad:**

```text
function makeView() {
  return buildView(Date.now(), Math.random());
}
```

## Correctness and type contracts

### Respect API contracts and supported combinations

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

Use runtime type checks that work across supported execution contexts.
Do not assume that constructor identity proves the value's kind.
An iteration API may pass extra arguments to its callback.
Use an adapter when those arguments give a forwarded function unintended behavior.

Reject contradictory configuration.
Reject options that the API ignores.
Consult the API documentation for the runtime and library in use.

**Good:**

```ts
function resize(width: number, height: number) {
  if (width <= 0 || height <= 0) {
    throw new RangeError(INVALID_SIZE);
  }

  surface.resize(width, height);
}
```

**Bad:**

```text
const numbers = textValues.map(parseInt);
```

### Preserve the intended result

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
function isReady(item: Item) {
  return item.status === READY_STATUS;
}

const readyItems = items.filter((item) => isReady(item));
```

**Bad:**

```text
const readyItems = items.filter((item) => {
  isReady(item);
});
```

### Check absence before access

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

### Check unknown values before use

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
function readName(value: unknown): string {
  if (typeof value !== "string") {
    throw new TypeError(INVALID_NAME);
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

### Keep type contracts precise and economical

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

### Give classes and objects a clear purpose

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
class Counter {
  #value = 0;

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

### Preserve resource lifecycle order

Use values only after construction or asynchronous initialization.
Run setup for each instance within that instance's lifetime.
Keep declared dependencies complete.
Preserve required parent initialization.
Keep cleanup available until asynchronous work finishes.

**Good:**

```ts
const client = new Client();

await client.initialize();

try {
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
```

### Preserve useful exception information

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
  throw new Error(SAVE_FAILED, { cause: error });
}
```

**Bad:**

```text
try {
  await saveReport();
} catch (error) {
  throw new Error(SAVE_FAILED);
}
```

## Asynchrony and resource ownership

### Honor asynchronous contracts

Await only values that support await.
Handle every asynchronous result.
Do not use asynchronous callbacks in synchronous APIs.
Await returned work when exception handling requires it.

Preserve rejection handling.
Remove unnecessary promise wrappers.
Use the language's direct asynchronous syntax.

**Good:**

```ts
async function loadReport() {
  try {
    return await fetchReport();
  } catch (error) {
    throw new Error(LOAD_FAILED, { cause: error });
  }
}
```

**Bad:**

```text
items.forEach(async (item) => {
  await saveItem(item);
});
```

### Schedule work with deliberate concurrency

Run independent operations together when safe.
Avoid sequential waits for independent operations when concurrency is safe.
Do not await work before you need its result.
Preserve asynchronous reduction accumulators.

Prevent reentry races.
Do not complete the same operation repeatedly.
Prevent stale updates after cancellation.
Check success status before you read aggregate results.

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

### Pair acquisition with cleanup and ownership

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

### Respect event lifetime and scheduling

Specify event options explicitly.
Specify timer delays explicitly.
Do not control an event after its control period ends.
Keep handler identity stable.
Use a scheduler that matches the intended timing.

Do not block the event loop.
Do not exit before pending cleanup finishes.

**Good:**

```ts
target.addEventListener(EVENT_TYPE, onEvent, { signal: controller.signal });

try {
  await waitForCompletion();
} finally {
  controller.abort();
}
```

**Bad:**

```text
target.addEventListener(EVENT_TYPE, () => onEvent());
target.removeEventListener(EVENT_TYPE, () => onEvent());
```

## Collections, text, and data

### Choose the collection operation matching the question

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
const readyItem = items.find((item) => isReady(item));
const largest = Math.max(...sizes);
```

**Bad:**

```text
const hasReadyItem = items.filter(isReady).length > 0;
```

### Preserve collection shape and key meaning

Use the correct map or set interface.
Use consistent keys.
Keep collection elements dense.
Use valid slice and splice bounds.
Use numeric comparators for numeric ordering.
Specify join separators explicitly.

Avoid accidental mutation.
Do not let an operation silently change item identity.
Do not let an operation silently change the collection type.

**Good:**

```ts
const sortedSizes = sizes.toSorted((left, right) => left - right);
const value = entries.get(requestedKey);
const summary = names.join(SEPARATOR);
```

**Bad:**

```text
const sortedSizes = sizes.toSorted();
const value = entries[requestedKey];
```

### Use direct, lossless string operations

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

**Good:**

```ts
const normalized = value.replaceAll(OLD_SEPARATOR, () => NEW_SEPARATOR);
const isReport = filename.endsWith(REPORT_SUFFIX);
```

**Bad:**

```text
const normalized = value.replace(OLD_SEPARATOR, NEW_SEPARATOR);
const message = `${record}`;
```

### Treat text encoding and display width correctly

Use valid regular expressions.
Escape invisible characters explicitly.
Use consistent encoding identifiers.
Use operations that respect code points.
Use a streaming decoder for chunked text.

Keep these text measurements distinct:

- Distinguish text length from other measurements.
- Distinguish terminal columns from other measurements.
- Distinguish bytes from other measurements.
- Distinguish user-perceived characters from other measurements.

**Good:**

```ts
const decoder = new TextDecoder();
const text = decoder.decode(chunk, { stream: true });
```

**Bad:**

```text
const firstCharacter = text[0];
const chunkText = new TextDecoder().decode(chunk);
```

### Use mathematically valid and precise operations

Avoid these numeric errors:

- Avoid precision loss.
- Avoid invalid numeric operands.
- Avoid accidental bitwise operations.
- Avoid misleading numeric forms.
- Avoid impossible bounds.
- Avoid unsafe assumptions about integers.

Use dedicated checks for NaN when ordinary equality cannot express the intended check.
Use dedicated checks for signed zero under the same condition.

Use direct math APIs.
Use exact constants.
Specify rounding precision explicitly.
Use valid ranges.
Avoid approximate or obscure arithmetic.

**Good:**

```ts
const magnitude = Math.abs(delta);
const count = Math.trunc(rawCount);

if (!Number.isSafeInteger(count)) {
  throw new RangeError(INVALID_COUNT);
}
```

**Bad:**

```text
if (value === NaN) {
  rejectValue();
}
```

### Preserve data through conversion

Use cloning operations that support the actual value types.
Use serialization operations that support the actual value types.
Do not clone data through lossy JSON conversion.
Do not expose bytes outside a buffer view.
Check that a value has a meaningful string representation before you convert it.

**Good:**

```ts
const snapshot = structuredClone(state);
const bytes = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
```

**Bad:**

```text
const snapshot = JSON.parse(JSON.stringify(state));
const bytes = new Uint8Array(view.buffer);
```

## Security, protocols, and efficiency

### Keep executable input separate from data

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

**Good:**

```ts
const destination = new URL(input);

database.query(QUERY_BY_ID, [requestedId]);

if (destination.protocol !== HTTPS_PROTOCOL) {
  throw new TypeError(INVALID_DESTINATION);
}
```

**Bad:**

```text
database.query(`${QUERY_PREFIX}${requestedId}`);
eval(input);
```

### Use protocol-aware networking APIs

Construct URLs with structured APIs.
Construct query parameters with structured APIs.
Check request and response options.
Check protocols.
Check response status before you consume the body.
Preserve required response and session commits.

Do not parse URLs manually.
Do not combine invalid cache options.
Do not combine invalid credential options.

**Good:**

```ts
async function loadData(endpoint: string, signal: AbortSignal) {
  const response = await fetch(endpoint, { signal });

  if (!response.ok) {
    throw new Error(REQUEST_FAILED);
  }

  {
    const data: unknown = await response.json();

    return data;
  }
}
```

**Bad:**

```text
const response = await fetch(`${endpoint}?name=${name}`);
const data = await response.json();
```

### Avoid repeated allocation and needless asymptotic cost

Move stable expensive work outside repeated operations.
Use indexed lookup for repeated searches.
Do not copy an accumulator during every iteration.
Keep operations that block execution outside frequently executed paths.
Defer work until after guards.

Use batches when they preserve behavior.
Use lazy iteration when it preserves behavior.
Use native operations when they preserve behavior.

**Good:**

```ts
const usersById = new Map(users.map((user) => toUserEntry(user)));

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

### Give caches and identities correct lifetimes

Reuse stable objects only when their inputs and ownership allow it.
Include all relevant inputs in cache keys.
Make cache invalidation reflect actual reads.
Make subscription dependencies reflect actual reads.

Avoid stale snapshots.
Avoid unnecessary recreation of values.
Avoid subscriptions to an entire store when you need only part of it.
Avoid derived state that duplicates its source of truth.

**Good:**

```ts
const cacheKey = makeCacheKey(accountId, locale);
const report = await cache.getOrInsertComputed(cacheKey, loadReport);
```

**Bad:**

```text
const cacheKey = accountId;
const report = await cache.getOrInsertComputed(cacheKey, () => loadReport(accountId, locale));
```

## Interfaces and graphics

### Make interfaces perceivable and operable

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

**Good:**

```ts
const confirmAction = {
  label: CONFIRM_LABEL,
  accessibleName: CONFIRM_LABEL,
  onActivate: confirm,
};
```

**Bad:**

```text
const confirmAction = {
  label: "",
  accessibleName: "",
  onPointerDown: confirm,
};
```

### Keep presentation constraints consistent and responsive

Use valid content structure.
Use compatible layout constraints.
Keep animation ranges within their bounds.
Use stable item identifiers.
Use appropriate responsive media.
Respect reduced-motion preferences.

Update only the presentation properties that need changes.
Avoid expensive layout work during every frame.
Avoid global work during every frame.
Apply these checks to graphical interfaces and visualizations.

**Good:**

```ts
const animation = {
  from: 0,
  to: 1,
  duration: ANIMATION_DURATION,
  isEnabled: !prefersReducedMotion,
};
```

**Bad:**

```text
const animation = {
  from: 0,
  to: 1,
  duration: ANIMATION_DURATION,
  isEnabled: true,
};
```

### Keep graphics state, buffers, and frame work coherent

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

**Good:**

```ts
function advance(deltaSeconds: number) {
  mixer.update(deltaSeconds);
  renderer.render(scene, camera);
}
```

**Bad:**

```text
function advance() {
  mixer.update(1);
  renderer.render(scene, camera);
}
```
