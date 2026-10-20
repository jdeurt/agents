# Rules of style

Use each language’s native syntax and standard library. Examples use TypeScript.

## Legibility

### Lay out lists consistently at each depth

For arguments, parameters, object properties, collection items, and similar lists, choose either one line for the whole list or one item per line at that nesting depth. Do not pack several siblings onto one line and continue other siblings on another line. Each nested list chooses independently.

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

Use ordinary spaces, aligned nesting, visible operator boundaries, one statement per line, clear comments, a final newline, and no trailing or irregular whitespace. Aim for lines within 120 columns; allow longer lines where breaking them would reduce clarity.

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

Put a blank line after the final import before any non-import statement; consecutive imports may stay together. Keep consecutive declarations of the same kind together. Separate constant and mutable declaration groups with a blank line, and put a blank line after the final declaration before executable code. Put blank lines between class methods and around class declarations; separate control-flow units and final returns so structure is visible. Keep overload signatures adjacent to their implementation, without blank lines within that group. Adapt declaration spacing to the language.

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

Split long modules, deeply nested calls, complex functions, and complex protected exception regions into named responsibilities. Name complicated iterable expressions and unpack only the fields you need. Preserve useful behavior rather than splitting solely to satisfy a counter. Keep files within 350 lines, including comments and blank lines. Keep function complexity at or below 20, try-block complexity at or below 1, and nested-call depth at or below 3.

Complexity measures branching: start at 1 for a straight-line body, then add 1 for each decision point, such as a conditional branch, loop, non-default case, catch, default-value choice, or short-circuit condition check. This counts independent paths, not every possible combination of execution paths. Apply the same count to the protected body of a try block; complexity 1 keeps that body free of branching. Count nested functions separately from the body that contains them.

For nested-call depth, count the outermost call as 1 and add 1 for each call nested inside an argument: `publish(normalize(read()))` has depth 3. Split deeper expressions into named intermediate values.

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

Use consistent spelling and filename conventions. Boolean names should read as predicates; action names should identify callable operations. Give exported functions and classes useful names. Name caught exceptions consistently.

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

Give domain numbers, paths, messages, and other meaningful string values stable names near their owner. The values 0, 1, and 2 may remain inline. Strings of up to 10 characters may remain inline; give longer strings meaningful names. Named static literal data is allowed. Use literal text for property keys, module sources, literal types, and language directives. Use the language’s convention for named constants even when it does not provide immutable bindings.

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

Keep constant and mutable variable declarations in the declaration prefix of their scope, before executable statements. Separate the final declaration in a group from the following executable statement with a blank line. Imports, types, functions, and other variable declarations may precede them; loop-header declarations are allowed. Use the smallest owning scope and move independent functions outward. Preserve evaluation order; introduce a smaller block after an early exit when needed. Keep a closure nested when it needs surrounding local state; move helpers outward when they are independent.

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

Declare and define names before use, avoid shadowing and redeclarations, initialize before reading, and preserve imported, constant, exception, class, function, and reserved bindings. Prefer immutable local bindings where values do not change.

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

Remove unused declarations, private members, labels, expressions, assignments, empty files, empty patterns, and accidental empty bodies. Use all lazy results or consume them deliberately. Keep intentional no-op behavior explicit and justified.

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

Each parameter, object key, enum value, class member, branch, logical operand, switch case, and set item should have one unambiguous meaning. Consolidate identical adjacent branches and repeated operations.

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

Move code shared by branches outside the branch, combine compatible consecutive operations, and remove wrapper functions that repeat at every call. Prefer a meaningful helper over repeated boilerplate; remove parameters whose values never vary.

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

Use supported native operations and meaningful defaults rather than manual wrappers, coercions, redundant fallback values, recursive boilerplate, or obsolete APIs. Specify important optional behavior explicitly. Preserve evaluation order and side effects when simplifying.

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

Use the host language’s supported module/import conventions, avoid duplicate or unused imports and redundant reexports, and keep package usage compatible with installed versions. Prefer maintained APIs and the smallest useful imports over deprecated methods or costly entire-library imports.

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

Give TODO comments a specific task and a clear condition for completing or removing them.

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

Use explicit comparisons when required, simple positive conditions first, direct Boolean returns, and the narrowest conditional expression. Avoid nested ternaries, assignment-as-condition, negation ambiguities, duplicate comparisons, and expressions whose result is constant. Logical/nullish operators must preserve false, zero, and empty values according to the intended contract.

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

Use clear block boundaries, early returns or continues, and an appropriate multiway branch. Avoid unintended fallthrough, unreachable code and loops, confusing nested breaks, and a lone nested conditional. Keep the loop condition in the loop header when that makes its exit evident.

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

Use direct iteration over values or the exact indices/entries needed. Name complicated iterable inputs, avoid duplicate passes, and never mutate the collection being traversed. Use native iteration or comprehension syntax.

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

Prefer nonmutating collection operations and preserve caller-owned inputs. Avoid shared mutable defaults, reference-filled arrays, hidden global writes, and mutation during calculation. Compute a fresh next state when the ownership contract requires it.

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

Keep reusable modules free of top-level effects, calculations pure, and updates out of render/evaluation paths. Trigger effects through explicit operations with dependencies and ownership made visible; prevent repeated state/effect feedback loops. Apply the same separation to imports and computed properties.

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

Use one source of truth, derive values from current inputs, make updates atomic, and prevent stale reads, feedback loops, in-place shared mutation, and unnecessary mirrored state. Use stable identifiers instead of position or randomness when identity must survive reordering.

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

Keep clocks, randomness, environment reads, allocation, and external effects outside repeatable calculations unless passed as explicit inputs. Make server/client or repeated render results agree where identity and content must remain stable. Seed deliberate randomness and use stable identifiers.

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

Match argument counts, callback signatures, value kinds, return contracts, initialization order, units, ranges, dimensions, compatible options, and required inputs. Use runtime type checks that work across supported execution contexts rather than assuming constructor identity proves the value’s kind. An iteration API may pass extra callback arguments: use an adapter when forwarding a function would give those arguments unintended meanings. Reject contradictory or ignored configuration. Consult the API documentation for the runtime and library in use.

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

### Use and return the intended value

Return a value on every required path; use getters, setters, constructors, callbacks, and lazy operations according to their return contracts. Do not mistake a mutator result, an uncalled function, or a discarded computation for the intended value.

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

Guard optional results, collection lookups, bounds, and nullable values before dereferencing or arithmetic. Avoid assertions that pretend absence cannot occur, redundant fallbacks, and unsafe optional access. Use the language’s native absence convention.

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

### Validate unknown values instead of bypassing types

Keep unknown input unknown until a runtime check proves its shape. Avoid unchecked narrowing, chained assertions, unsafe calls/member access/returns, and misleading broad function types. Type annotations alone do not validate untrusted runtime input.

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

Use simple consistent type declarations, coherent overloads, compatible getter/setter contracts, useful generic constraints, and nonredundant unions. Avoid empty or unsafe types, duplicate alternatives, needless annotations or assertions, and type parameters that express no relationship. Keep type-only dependencies separate where the language supports it.

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

Use classes for meaningful instances, not bags of static functions. Declare members, keep member order consistent, preserve parent-class accessor contracts, and avoid recursive accessors or useless constructors/overrides. Bind instance methods when passing them as callbacks. Prefer language-native fields and encapsulation.

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

### Initialize and tear down in lifecycle order

Use values only after construction or asynchronous initialization; run per-instance setup in its owning lifetime. Keep declared dependencies complete, preserve required parent initialization, and ensure cleanup outlives asynchronous work.

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

Raise meaningful exception objects with messages and appropriate types. Preserve the caught cause, avoid empty rethrows and swallowed failures, and aggregate related errors when useful. Never let a finally return or replacement exception silently erase the original failure.

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

Await only awaitable work, handle every asynchronous result, avoid asynchronous callbacks in synchronous APIs, and await returned work where exception handling requires it. Preserve rejection handling and avoid unnecessary promise wrappers. Use the language’s direct asynchronous syntax.

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

Run independent operations together when safe; avoid sequential waterfalls, premature waits, asynchronous reduction mistakes, reentry races, repeated completion calls, and stale updates after cancellation. Check success status before reading aggregate results.

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

Close files, dispose owned resources, remove the exact listener registered, revoke temporary handles, cancel timers/debounces/animation, and propagate cancellation. Do not return a resource beyond its lifetime. Ensure cleanup also runs on failure and early exit.

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

Use explicit event options and timer delays, avoid ineffective late event control, retain stable handler identity, and use a scheduler matching the intended timing. Do not block the event loop or exit before pending cleanup finishes.

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

Use find for one item, some/any for existence, membership containers for repeated membership, map for transformation, and grouping/set operations for their stated purpose. Avoid sorting to get an extremum, redundant materialization, unnecessary passes, and full iteration when only one result is needed.

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

Use the correct map/set interface, consistent keys, dense elements, valid slice/splice bounds, numeric comparators, and explicit join separators. Avoid accidental mutation and operations that silently change item identity or collection type.

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

Use prefix/suffix, replacement-all, padding, repetition, slicing, and regex APIs according to the actual task. Make conversions explicit; avoid lossy object interpolation, incorrect template syntax, redundant trimming, unsafe replacement expansion, and pretending a code unit is a full character.

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

Use valid regular expressions, explicit escapes for invisible characters, coherent encoding identifiers, code-point-aware operations, and streaming decoders for chunked text. Text length, terminal columns, bytes, and user-perceived characters are different units.

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

Avoid precision loss, invalid numeric operands, accidental bitwise operations, misleading numeric forms, impossible bounds, and unsafe integer assumptions. Use the language’s dedicated NaN and signed-zero checks when ordinary equality cannot distinguish the intended numeric values. Use direct math APIs, exact constants, explicit rounding precision, and valid ranges rather than approximate or obscure arithmetic.

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

Choose cloning and serialization operations that support the actual value types. Do not deep-clone through lossy JSON, leak bytes outside a buffer view, or stringify values without checking whether their representation is meaningful.

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

Avoid evaluation of input strings, parameterize SQL, escape values for their destination grammar, use secure transports and safe URL protocols, validate path containment, isolate untrusted embedded content, and keep secrets out of client or public storage. Validation must address the actual attack surface.

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

Build URLs and query parameters with their structured APIs, validate protocols and request/response options, check response status before consuming a body, and preserve required response/session commits. Avoid hand-parsing URLs and invalid cache or credential combinations.

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

Hoist stable expensive work, use indexed lookup for repeated searches, avoid copying an accumulator at every iteration, and keep blocking work out of hot paths. Defer work until after guards and use batches, lazy iteration, or native operations when they preserve behavior.

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

Reuse stable objects only when their inputs and ownership allow it. Cache keys must represent all relevant inputs; invalidation and subscription dependencies must reflect actual reads. Avoid stale snapshots, needless recreation, whole-store subscriptions, and derived state that duplicates its source of truth.

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

Give controls, dialogs, links, media, and navigation useful names and valid semantics. Provide keyboard access, sensible focus order, labels, captions, and language; preserve paste and input-method behavior. Avoid hidden focusable controls, redundant or invalid accessibility attributes, intrusive announcements, and unexpected motion.

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

Use valid content structure, compatible layout constraints, correctly bounded animation ranges, stable item identifiers, appropriate responsive media, and reduced-motion behavior. Update only necessary presentation properties; avoid expensive layout or global work for every frame. Apply these checks to graphical interfaces and visualizations.

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

Validate dimensions, item sizes, ranges, shader interfaces, and supported backend features. Initialize before use, propagate resize and dirty-state updates, provide required inputs, advance animations by elapsed time, batch repeated draws, and release owned GPU resources.

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
