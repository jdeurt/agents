# Rules of style

Apply these concepts to JavaScript, Python, and other languages with the same concerns. Use each language’s native syntax, standard library, and formatter. TypeScript snippets illustrate the idea; they are independent fragments with application-specific types and named values supplied by their surrounding project, not standalone lint fixtures. A rule’s JavaScript spelling does not require that exact API in another language.

This reference comes from the union of enabled warning and error rules in the bundled configuration, after all presets and overrides. Equivalent checks share one concept and example. The source-rule lists preserve every enabled rule ID; the exclusions at the end explain syntax-specific rules that do not become a language-neutral requirement. The linter remains authoritative for exact defaults, exceptions, severities, and file matching. A generalized concept can be broader than a checker; this guide does not claim automatic enforcement in Python.

## Legibility

### Lay out lists consistently at each depth

For arguments, parameters, object properties, collection items, and similar lists, choose either one line for the whole list or one item per line at that nesting depth. Do not pack several siblings onto one line and continue other siblings on another line. Each nested list chooses independently. This is an explicit style convention; the current ESLint/Prettier combination does not enforce every instance of it. When a formatter retains a mixed list, restructure or wrap the surrounding expression without weakening the formatter rules.

<!-- prettier-ignore -->
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
  source: Source,
  destination: Destination,
  options: Options
) {
  return publish(source, destination, options);
}

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

Use the language formatter consistently: ordinary spaces, aligned nesting, visible operator boundaries, one statement per line, clean comments, a final newline, and no trailing or irregular whitespace. JavaScript uses the bundled Prettier options; its 120-column print width is a formatting target, not a hard maximum for every line. Python uses its own formatter rather than copying JavaScript punctuation.

```ts
const total = subtotal + tax;
// Explain why a decision is necessary.
return total;
```

Source rules: `@stylistic/array-bracket-spacing`, `@stylistic/arrow-spacing`, `@stylistic/block-spacing`, `@stylistic/comma-spacing`, `@stylistic/comma-style`, `@stylistic/computed-property-spacing`, `@stylistic/dot-location`, `@stylistic/eol-last`, `@stylistic/indent`, `@stylistic/key-spacing`, `@stylistic/keyword-spacing`, `@stylistic/max-statements-per-line`, `@stylistic/no-extra-parens`, `@stylistic/no-floating-decimal`, `@stylistic/no-mixed-operators`, `@stylistic/no-mixed-spaces-and-tabs`, `@stylistic/no-multi-spaces`, `@stylistic/no-multiple-empty-lines`, `@stylistic/no-tabs`, `@stylistic/no-trailing-spaces`, `@stylistic/no-whitespace-before-property`, `@stylistic/object-curly-spacing`, `@stylistic/padded-blocks`, `@stylistic/rest-spread-spacing`, `@stylistic/semi-spacing`, `@stylistic/space-before-blocks`, `@stylistic/space-before-function-paren`, `@stylistic/space-in-parens`, `@stylistic/space-infix-ops`, `@stylistic/space-unary-ops`, `@stylistic/spaced-comment`, `@stylistic/template-curly-spacing`, `@stylistic/type-annotation-spacing`, `@stylistic/type-generic-spacing`, `@stylistic/type-named-tuple-spacing`, `prettier/prettier`, `unicorn/no-asterisk-prefix-in-documentation-comments`, `unicorn/no-leading-empty-lines`, `unicorn/single-line-block-comment-style`.

### Separate structural units

Put blank lines between class methods and around class declarations; separate control-flow units and final returns so structure is visible. Keep overload signatures adjacent to their implementation, without blank lines within that group. Adapt declaration spacing to the language.

```ts
class Counter {
  value = 0;

  read(): number;
  read(fallback: number): number;
  read(fallback = 0): number {
    return fallback;
  }

  reset() {
    this.value = 0;
  }
}

class Gauge {}
```

Source rules: `@stylistic/lines-between-class-members`, `@stylistic/padding-line-between-statements`, `@typescript-eslint/adjacent-overload-signatures`.

### Keep units small and expressions readable

Split long modules, deeply nested calls, complex functions, and complex protected exception regions into named responsibilities. Name complicated iterable expressions and unpack only the fields you need. Preserve useful behavior rather than splitting solely to satisfy a counter. The JavaScript limits are 350 lines per file, inherited complexity 20, inherited try complexity 1, and inherited nested-call depth 3.

```ts
const available = loadAvailableItems();
const ordered = orderItems(available);

for (const item of ordered) {
  publish(item);
}
```

Source rules: `complexity`, `max-lines`, `react-doctor/no-giant-component`, `react-doctor/no-high-complexity-react-function`, `unicorn/max-nested-calls`, `unicorn/no-unreadable-array-destructuring`, `unicorn/no-unreadable-for-of-expression`, `unicorn/no-unreadable-iife`, `unicorn/no-unreadable-object-destructuring`, `unicorn/try-complexity`.

### Name values for their role

Use consistent spelling and filename conventions. Boolean names should read as predicates; action names should identify callable operations. Give exported functions and classes useful names. Name caught exceptions consistently.

```ts
const isReady = queue.length > 0;

function publishReport() {
  return report;
}
```

Source rules: `unicorn/catch-error-name`, `unicorn/consistent-boolean-name`, `unicorn/consistent-compound-words`, `unicorn/filename-case`, `unicorn/no-anonymous-default-export`, `unicorn/no-non-function-verb-prefix`.

## Maintainability and duplication

### Name meaningful numbers and strings

Give domain numbers, paths, messages, and other meaningful string values stable names near their owner. The JavaScript numeric rule exempts 0, 1, and 2; the local string rule defaults to a minimum length of 3 and allows named static literal data. Grammar positions such as property keys, module sources, literal types, and directives are exempt. Python should use meaningful constant names even though its binding model differs.

```ts
const REPORT_PATH = "reports/summary.json";
const SAVED_MESSAGE = "Report saved";
const RETRY_LIMIT = 5;
writeReport(REPORT_PATH);
notify(SAVED_MESSAGE);
```

Source rules: `@typescript-eslint/no-magic-numbers`, `jdeurt/no-magic-strings`, `no-magic-numbers`, `unicorn/no-magic-array-flat-depth`.

### Keep declarations in the right scope

Keep constant declarations in the declaration prefix of their block, before executable statements. Imports, types, functions, and other variable declarations may precede them; loop-header declarations are allowed. Use the smallest owning scope and move independent functions outward. Preserve evaluation order; introduce a smaller block after an early exit when needed. Closures remain valid: consistent-function-scoping does not ban every nested function or callback.

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

Source rules: `jdeurt/const-on-top`, `no-inner-declarations`, `unicorn/consistent-function-scoping`, `unicorn/isolated-functions`, `unicorn/no-declarations-before-early-exit`, `unicorn/prefer-block-statement-over-iife`, `unicorn/prefer-smaller-scope`.

### Use deliberate, unambiguous bindings

Declare and define names before use, avoid shadowing and redeclarations, initialize before reading, and preserve imported, constant, exception, class, function, and reserved bindings. Prefer immutable local bindings where values do not change. JavaScript uses the TypeScript equivalents of shadow, magic-number, and use-before-definition rules on TypeScript files.

```ts
const source = loadSource();
const result = normalize(source);
consume(result);
```

Source rules: `@typescript-eslint/no-shadow`, `@typescript-eslint/no-use-before-define`, `no-class-assign`, `no-const-assign`, `no-delete-var`, `no-ex-assign`, `no-func-assign`, `no-global-assign`, `no-import-assign`, `no-redeclare`, `no-shadow`, `no-shadow-restricted-names`, `no-unassigned-vars`, `no-undef`, `no-use-before-define`, `prefer-const`, `react-doctor/jsx-no-undef`, `unicorn/no-global-object-property-assignment`, `unicorn/no-optional-chaining-on-undeclared-variable`, `unicorn/no-top-level-assignment-in-function`.

### Remove dead, empty, and ineffective work

Remove unused declarations, private members, labels, expressions, assignments, empty files, empty patterns, and accidental empty bodies. Use all lazy results or consume them deliberately. Keep intentional no-op behavior explicit and justified.

```ts
function double(value: number) {
  return value * 2;
}
```

Source rules: `@typescript-eslint/no-empty-function`, `@typescript-eslint/no-unused-expressions`, `@typescript-eslint/no-unused-vars`, `no-debugger`, `no-empty`, `no-empty-pattern`, `no-empty-static-block`, `no-self-assign`, `no-unused-labels`, `no-unused-private-class-members`, `no-unused-vars`, `no-useless-assignment`, `react-doctor/react-router-no-empty-leaf-route`, `unicorn/no-empty-file`, `unicorn/no-unused-builtin-method-return`, `unicorn/no-unused-iterator-helper`, `unicorn/prefer-optional-catch-binding`.

### Avoid duplicate declarations and alternatives

Each parameter, object key, enum value, class member, branch, logical operand, switch case, and set item should have one unambiguous meaning. Consolidate identical adjacent branches and repeated operations.

```ts
if (isQueued || isRetrying) {
  schedule(job);
}
```

Source rules: `no-dupe-args`, `no-dupe-class-members`, `no-dupe-else-if`, `no-dupe-keys`, `no-duplicate-case`, `no-duplicate-imports`, `react-doctor/jsx-no-duplicate-props`, `react-doctor/react-router-no-duplicate-route-id`, `unicorn/no-duplicate-if-branches`, `unicorn/no-duplicate-logical-operands`, `unicorn/no-duplicate-set-values`.

### Factor shared work without unnecessary abstraction

Move code shared by branches outside the branch, combine compatible consecutive operations, and remove wrapper functions that repeat at every call. Prefer a meaningful helper over repeated boilerplate; remove parameters whose values never vary.

```ts
const payload = serialize(report);

if (isRemote) {
  upload(payload);
} else {
  save(payload);
}
```

Source rules: `unicorn/no-repeated-call-wrappers`, `unicorn/no-unnecessary-parameters`, `unicorn/prefer-hoisting-branch-code`, `unicorn/prefer-single-call`, `unicorn/prefer-single-object-destructuring`.

### Prefer the simplest operation that states intent

Use supported native operations and meaningful defaults rather than manual wrappers, coercions, redundant fallback values, recursive boilerplate, or obsolete APIs. Specify important optional behavior explicitly. Preserve evaluation order and side effects when simplifying.

```ts
function formatNames(names: string[], separator = DEFAULT_SEPARATOR) {
  return names.join(separator);
}
```

Source rules: `@typescript-eslint/dot-notation`, `@typescript-eslint/no-unnecessary-type-conversion`, `@typescript-eslint/no-useless-default-assignment`, `unicorn/better-dom-traversing`, `unicorn/consistent-date-clone`, `unicorn/dom-node-dataset`, `unicorn/no-blob-to-file`, `unicorn/no-immediate-mutation`, `unicorn/no-misrefactored-assignment`, `unicorn/no-useless-coercion`, `unicorn/no-useless-compound-assignment`, `unicorn/operator-assignment`, `unicorn/prefer-blob-reading-methods`, `unicorn/prefer-classlist-toggle`, `unicorn/prefer-default-parameters`, `unicorn/prefer-dom-node-append`, `unicorn/prefer-dom-node-remove`, `unicorn/prefer-dom-node-replace-children`, `unicorn/prefer-dom-node-text-content`, `unicorn/prefer-location-assign`, `unicorn/prefer-native-coercion-functions`, `unicorn/prefer-object-define-properties`, `unicorn/prefer-object-destructuring-defaults`, `unicorn/prefer-observer-apis`, `unicorn/prefer-toggle-attribute`.

### Use explicit, supported dependencies

Use the host language’s supported module/import conventions, avoid duplicate or unused imports and redundant reexports, and keep package usage compatible with installed versions. Prefer maintained APIs and the smallest useful imports over deprecated methods or costly entire-library imports.

```ts
import type { Report } from "./report.ts";
import { saveReport } from "./storage.ts";
```

Source rules: `@typescript-eslint/no-deprecated`, `@typescript-eslint/no-require-imports`, `react-doctor/no-dynamic-import-path`, `react-doctor/no-legacy-class-lifecycles`, `react-doctor/no-legacy-context-api`, `react-doctor/no-react-dom-deprecated-apis`, `react-doctor/no-react19-deprecated-apis`, `react-doctor/no-unsafe`, `react-doctor/only-export-components`, `react-doctor/prefer-dynamic-import`, `react-doctor/react-router-v8-no-meta-data-field`, `react-doctor/react-router-v8-no-react-router-dom-import`, `react-doctor/react-router-v8-no-removed-future-flags`, `react-doctor/zod-v4-no-deprecated-error-apis`, `react-doctor/zod-v4-no-deprecated-error-customization`, `react-doctor/zod-v4-no-deprecated-schema-apis`, `react-hooks/incompatible-library`, `sort-imports`, `unicorn/import-style`, `unicorn/no-nonstandard-builtin-properties`, `unicorn/no-unnecessary-polyfills`, `unicorn/no-useless-re-export`, `unicorn/prefer-export-from`, `unicorn/prefer-modern-dom-apis`, `unicorn/prefer-module`, `unicorn/prefer-query-selector`.

### Keep enforcement actionable

Use precise, justified suppressions only when authorized, remove obsolete lint directives, and make TODO expiry conditions actionable. Do not bypass lint by renaming recognized APIs or wrapping unsupported constructs. Validate tool and compiler settings against supported configuration.

```ts
// TODO: Remove the adapter when the upstream migration is complete.
const adapter = createCompatibilityAdapter();
```

Source rules: `@typescript-eslint/ban-ts-comment`, `@typescript-eslint/ban-tslint-comment`, `unicorn/expiring-todo-comments`, `unicorn/no-abusive-eslint-disable`.

## Conditions and state

### Make conditions direct and intentional

Use explicit comparisons when required, simple positive conditions first, direct Boolean returns, and the narrowest conditional expression. Avoid nested ternaries, assignment-as-condition, negation ambiguities, duplicate comparisons, and expressions whose result is constant. Logical/nullish operators must preserve false, zero, and empty values according to the intended contract.

```ts
const isAvailable = count > 0 && hasPermission;
const limit = requestedLimit ?? defaultLimit;

return isAvailable;
```

Source rules: `@typescript-eslint/no-unnecessary-boolean-literal-compare`, `@typescript-eslint/no-unnecessary-condition`, `eqeqeq`, `no-cond-assign`, `no-constant-binary-expression`, `no-constant-condition`, `no-extra-boolean-cast`, `no-self-compare`, `no-unsafe-negation`, `react-doctor/jsx-numeric-and-leaked-render`, `react-doctor/no-collapsed-literal-or-chain-as-value`, `react-doctor/no-nullish-coalescing-arithmetic-precedence`, `react-doctor/no-predicate-function-reference-in-boolean-position`, `react-doctor/rendering-conditional-render`, `unicorn/consistent-conditional-object-spread`, `unicorn/consistent-existence-index-check`, `unicorn/explicit-length-check`, `unicorn/logical-assignment-operators`, `unicorn/no-chained-comparison`, `unicorn/no-conflicting-constraints`, `unicorn/no-double-comparison`, `unicorn/no-impossible-length-comparison`, `unicorn/no-invalid-character-comparison`, `unicorn/no-negated-array-predicate`, `unicorn/no-negated-comparison`, `unicorn/no-negated-condition`, `unicorn/no-negation-in-equality-check`, `unicorn/no-nested-ternary`, `unicorn/no-redundant-comparison`, `unicorn/no-unnecessary-boolean-comparison`, `unicorn/no-unnecessary-nested-ternary`, `unicorn/no-useless-boolean-cast`, `unicorn/no-useless-length-check`, `unicorn/no-useless-logical-operand`, `unicorn/prefer-boolean-return`, `unicorn/prefer-combined-guards`, `unicorn/prefer-logical-operator-over-ternary`, `unicorn/prefer-minimal-ternary`, `unicorn/prefer-simple-condition-first`, `unicorn/prefer-simplified-conditions`, `unicorn/prefer-ternary`.

### Make control flow explicit and reachable

Use clear block boundaries, early returns or continues, and an appropriate multiway branch. Avoid unintended fallthrough, unreachable code and loops, confusing nested breaks, and a lone nested conditional. Keep the loop condition in the loop header when that makes its exit evident.

```ts
if (!isReady) {
  return;
}

for (const item of items) {
  if (!item.isValid) {
    continue;
  }

  processItem(item);
}
```

Source rules: `curly`, `for-direction`, `no-case-declarations`, `no-fallthrough`, `no-lonely-if`, `no-unreachable`, `no-unreachable-loop`, `unicorn/no-break-in-nested-loop`, `unicorn/no-lonely-if`, `unicorn/no-useless-continue`, `unicorn/no-useless-else`, `unicorn/no-useless-recursion`, `unicorn/no-useless-switch-case`, `unicorn/prefer-continue`, `unicorn/prefer-early-return`, `unicorn/prefer-else-if`, `unicorn/prefer-switch`, `unicorn/prefer-while-loop-condition`, `unicorn/switch-case-braces`, `unicorn/switch-case-break-position`.

### Iterate values directly

Use direct iteration over values or the exact indices/entries needed. Name complicated iterable inputs, avoid duplicate passes, and never mutate the collection being traversed. Adapt to Python iteration and comprehensions rather than reproducing JavaScript loop syntax.

```ts
for (const item of items) {
  processItem(item);
}
```

Source rules: `@typescript-eslint/no-for-in-array`, `@typescript-eslint/prefer-for-of`, `unicorn/no-duplicate-loops`, `unicorn/no-for-each`, `unicorn/no-for-loop`, `unicorn/no-loop-iterable-mutation`, `unicorn/prefer-array-iterable-methods`, `unicorn/prefer-direct-iteration`.

### Make state changes local and intentional

Prefer nonmutating collection operations and preserve caller-owned inputs. Avoid shared mutable defaults, reference-filled arrays, hidden global writes, and mutation during calculation. Compute a fresh next state when the ownership contract requires it.

```ts
const sortedItems = items.toSorted(compareItems);
const nextState = { ...state, isReady: true };
```

Source rules: `@typescript-eslint/no-array-delete`, `@typescript-eslint/no-dynamic-delete`, `react-doctor/no-direct-mutation-state`, `react-doctor/no-direct-state-mutation`, `react-doctor/no-mutate-queried-dom-node-in-component`, `react-doctor/no-mutate-then-set-or-return-same-reference`, `react-doctor/no-mutating-array-method-on-prop-or-hook-result`, `react-doctor/no-mutating-reducer-state`, `react-doctor/no-unthrottled-scroll-mutation`, `react-hooks/immutability`, `unicorn/no-array-fill-with-reference-type`, `unicorn/no-array-reverse`, `unicorn/no-array-sort`, `unicorn/no-array-splice`, `unicorn/no-object-as-default-parameter`.

### Keep calculation separate from effects

Keep reusable modules free of top-level effects, calculations pure, and updates out of render/evaluation paths. Trigger effects through explicit operations with dependencies and ownership made visible; prevent repeated state/effect feedback loops. Python imports and property calculations should have the same separation.

```ts
export function calculateTotal(items: Item[]) {
  return sumPrices(items);
}

export function publishTotal(total: number) {
  output.write(total);
}
```

Source rules: `react-doctor/advanced-event-handler-refs`, `react-doctor/exhaustive-deps`, `react-doctor/ink-no-focus-in-render`, `react-doctor/ink-no-live-hooks-in-render-to-string`, `react-doctor/ink-no-measure-element-in-render`, `react-doctor/motion-create-in-render`, `react-doctor/motion-imperative-animation-in-render`, `react-doctor/motion-value-constructor-in-render`, `react-doctor/motion-value-subscription-in-render`, `react-doctor/no-create-context-in-render`, `react-doctor/no-create-object-url-in-render`, `react-doctor/no-create-store-in-render`, `react-doctor/no-effect-chain`, `react-doctor/no-effect-event-handler`, `react-doctor/no-effect-event-in-deps`, `react-doctor/no-effect-with-fresh-deps`, `react-doctor/no-event-handler`, `react-doctor/no-fetch-in-effect`, `react-doctor/no-inline-hoc-on-component`, `react-doctor/no-nested-component-definition`, `react-doctor/no-prop-callback-in-render`, `react-doctor/no-ref-current-in-render`, `react-doctor/no-render-in-render`, `react-doctor/no-unguarded-browser-global-at-module-scope`, `react-doctor/no-unguarded-browser-global-in-render-or-hook-init`, `react-doctor/no-unstable-nested-components`, `react-doctor/prefer-use-effect-event`, `react-doctor/prefer-use-sync-external-store`, `react-doctor/react-router-no-navigate-in-render`, `react-doctor/react-router-no-router-in-render`, `react-doctor/valtio-no-proxy-read-in-render`, `react-doctor/waapi-animation-in-render`, `react-hooks/exhaustive-deps`, `react-hooks/globals`, `react-hooks/purity`, `react-hooks/refs`, `react-hooks/static-components`, `unicorn/no-top-level-side-effects`.

### Keep state transitions consistent

Use one source of truth, derive values from current inputs, make updates atomic, and prevent stale reads, feedback loops, in-place shared mutation, and unnecessary mirrored state. Use stable identifiers instead of position or randomness when identity must survive reordering.

```ts
function toggle(state: State): State {
  return { ...state, isEnabled: !state.isEnabled };
}
```

Source rules: `react-doctor/ink-static-is-append-only`, `react-doctor/ink-static-requires-key`, `react-doctor/jsx-key`, `react-doctor/motion-animate-presence-requires-key`, `react-doctor/motion-unstable-layout-id-in-iteration`, `react-doctor/no-adjust-state-on-prop-change`, `react-doctor/no-array-index-as-key`, `react-doctor/no-boolean-toggle-without-functional-update`, `react-doctor/no-chain-state-updates`, `react-doctor/no-controlled-input-value-without-state-update`, `react-doctor/no-did-mount-set-state`, `react-doctor/no-did-update-set-state`, `react-doctor/no-eager-new-in-use-state-initializer`, `react-doctor/no-event-trigger-state`, `react-doctor/no-impure-state-updater`, `react-doctor/no-initialize-state`, `react-doctor/no-is-mounted`, `react-doctor/no-match-media-in-state-initializer`, `react-doctor/no-pass-data-to-parent`, `react-doctor/no-prop-callback-in-effect`, `react-doctor/no-random-key`, `react-doctor/no-reset-all-state-on-prop-change`, `react-doctor/no-self-updating-effect`, `react-doctor/no-set-state-in-render`, `react-doctor/no-side-effect-in-state-updater-function`, `react-doctor/no-will-update-set-state`, `react-doctor/rerender-functional-setstate`, `react-doctor/rerender-lazy-state-init`, `react-doctor/rerender-state-only-in-handlers`, `react-doctor/server-no-mutable-module-state`, `react-doctor/three-no-state-in-animation-loop`, `react-doctor/three-no-state-in-pointer-move`, `react-doctor/zustand-no-mutating-state`, `react-hooks/set-state-in-effect`, `react-hooks/set-state-in-render`.

### Make repeated evaluation deterministic

Keep clocks, randomness, environment reads, allocation, and external effects outside repeatable calculations unless passed as explicit inputs. Make server/client or repeated render results agree where identity and content must remain stable. Seed deliberate randomness and use stable identifiers.

```ts
function makeView(timestamp: number, seed: number) {
  return buildView(timestamp, createRandom(seed));
}
```

Source rules: `react-doctor/no-hydration-branch-on-browser-global`, `react-doctor/no-locale-format-in-render`, `react-doctor/no-nondeterministic-id-value-in-render-body`, `react-doctor/remotion-deterministic-randomness`, `react-doctor/rendering-hydration-mismatch-time`, `react-doctor/rendering-hydration-no-flicker`.

## Correctness and type contracts

### Respect API contracts and supported combinations

Match argument counts, callback signatures, value kinds, return contracts, initialization order, units, ranges, dimensions, compatible options, and required inputs. Use runtime type checks that work across supported execution contexts rather than assuming constructor identity proves the value’s kind. An iteration API may pass extra callback arguments: use an adapter when forwarding a function would give those arguments unintended meanings. Reject contradictory or ignored configuration. Apply the same discipline to Python libraries; consult actual API documentation before substituting a JavaScript-specific operation.

```ts
function resize(width: number, height: number) {
  if (width <= 0 || height <= 0) {
    throw new RangeError(INVALID_SIZE);
  }

  surface.resize(width, height);
}
```

Source rules: `react-doctor/button-has-type`, `react-doctor/checked-requires-onchange-or-readonly`, `react-doctor/forbid-dom-props`, `react-doctor/forbid-elements`, `react-doctor/ink-no-multiple-static`, `react-doctor/mobx-no-make-auto-observable-in-inheritance`, `react-doctor/no-find-dom-node`, `react-doctor/no-flush-sync`, `react-doctor/no-indeterminate-attribute`, `react-doctor/no-uncontrolled-input`, `react-doctor/no-unknown-property`, `react-doctor/no-whole-object-default-losing-per-key-defaults`, `react-doctor/react-router-no-client-module-in-server-render`, `react-doctor/react-router-no-invalid-lazy-route-properties`, `react-doctor/react-router-no-multiple-blockers`, `react-doctor/react-router-no-nested-router`, `react-doctor/react-router-no-route-module-environment-suffix`, `react-doctor/react-router-valid-route-object`, `react-doctor/styled-components-non-transient-custom-prop-on-intrinsic-element`, `react-doctor/tanstack-virtual-measure-element-requires-data-index`, `unicorn/consistent-assert`, `unicorn/no-array-callback-reference`, `unicorn/no-incorrect-query-selector`, `unicorn/no-instanceof-builtins`, `unicorn/no-invalid-argument-count`, `unicorn/no-invalid-boolean-attribute-value`, `unicorn/no-invalid-dom-token`, `unicorn/no-invalid-intl-options`, `unicorn/no-invalid-property-descriptor`, `unicorn/no-invalid-style-set-property`, `unicorn/no-invalid-well-known-symbol-methods`, `unicorn/no-selector-as-dom-name`, `unicorn/no-shorthand-property-overrides`, `unicorn/prefer-scoped-selector`.

### Use and return the intended value

Return a value on every required path; use getters, setters, constructors, callbacks, and lazy operations according to their return contracts. Do not mistake a mutator result, an uncalled function, or a discarded computation for the intended value.

```ts
function isReady(item: Item) {
  return item.status === READY_STATUS;
}

const readyItems = items.filter((item) => isReady(item));
```

Source rules: `@typescript-eslint/no-confusing-void-expression`, `@typescript-eslint/no-meaningless-void-operator`, `getter-return`, `no-setter-return`, `react-doctor/require-render-return`, `require-yield`, `unicorn/no-return-array-push`, `unicorn/no-uncalled-method`, `unicorn/require-proxy-trap-boolean-return`.

### Check absence before access

Guard optional results, collection lookups, bounds, and nullable values before dereferencing or arithmetic. Avoid assertions that pretend absence cannot occur, redundant fallbacks, and unsafe optional access. Use the host language’s absence convention; Python continues to use None where appropriate.

```ts
const item = items.find(matchesRequest);

if (item === undefined) {
  return;
}

consume(item.value);
```

Source rules: `@typescript-eslint/no-confusing-non-null-assertion`, `@typescript-eslint/no-extra-non-null-assertion`, `@typescript-eslint/no-non-null-asserted-nullish-coalescing`, `@typescript-eslint/no-non-null-asserted-optional-chain`, `@typescript-eslint/no-non-null-assertion`, `@typescript-eslint/non-nullable-type-assertion-style`, `@typescript-eslint/prefer-nullish-coalescing`, `@typescript-eslint/prefer-optional-chain`, `no-unsafe-optional-chaining`, `react-doctor/no-arithmetic-on-optional-chained-operand`, `react-doctor/no-array-find-result-member-access-without-guard`, `react-doctor/no-array-index-deref-without-bounds-or-empty-guard`, `react-doctor/no-non-null-assertion-on-maybe-undefined-result`, `react-doctor/no-object-keys-values-entries-on-maybe-undefined`, `react-doctor/no-spread-props-over-defaults-clobbers-with-undefined`, `unicorn/consistent-optional-chaining`, `unicorn/no-useless-undefined`.

### Validate unknown values instead of bypassing types

Keep unknown input unknown until a runtime check proves its shape. Avoid unchecked narrowing, chained assertions, unsafe calls/member access/returns, misleading broad function types, and suppression directives that conceal missing validation. Python annotations likewise do not validate untrusted runtime input.

```ts
function readName(value: unknown): string {
  if (typeof value !== "string") {
    throw new TypeError(INVALID_NAME);
  }

  return value;
}
```

Source rules: `@typescript-eslint/consistent-type-assertions`, `@typescript-eslint/no-explicit-any`, `@typescript-eslint/no-unsafe-argument`, `@typescript-eslint/no-unsafe-assignment`, `@typescript-eslint/no-unsafe-call`, `@typescript-eslint/no-unsafe-declaration-merging`, `@typescript-eslint/no-unsafe-function-type`, `@typescript-eslint/no-unsafe-member-access`, `@typescript-eslint/no-unsafe-return`, `@typescript-eslint/no-unsafe-type-assertion`, `@typescript-eslint/use-unknown-in-catch-callback-variable`, `no-restricted-syntax`, `react-doctor/no-unsafe-json-parse`.

### Keep type contracts precise and economical

Use simple consistent type declarations, coherent overloads, compatible getter/setter contracts, useful generic constraints, and nonredundant unions. Avoid empty or unsafe types, duplicate alternatives, needless annotations or assertions, and type parameters that express no relationship. Keep type-only dependencies separate where the language supports it.

```ts
type Identifier = string;

function first<T>(items: T[]): T | undefined {
  return items.at(0);
}
```

Source rules: `@typescript-eslint/array-type`, `@typescript-eslint/class-literal-property-style`, `@typescript-eslint/consistent-generic-constructors`, `@typescript-eslint/consistent-indexed-object-style`, `@typescript-eslint/consistent-type-definitions`, `@typescript-eslint/consistent-type-imports`, `@typescript-eslint/no-duplicate-enum-values`, `@typescript-eslint/no-duplicate-type-constituents`, `@typescript-eslint/no-empty-object-type`, `@typescript-eslint/no-generated-empty-object-type`, `@typescript-eslint/no-inferrable-types`, `@typescript-eslint/no-invalid-void-type`, `@typescript-eslint/no-mixed-enums`, `@typescript-eslint/no-redundant-type-constituents`, `@typescript-eslint/no-unnecessary-type-arguments`, `@typescript-eslint/no-unnecessary-type-assertion`, `@typescript-eslint/no-unnecessary-type-constraint`, `@typescript-eslint/no-unnecessary-type-parameters`, `@typescript-eslint/no-unsafe-enum-assignment`, `@typescript-eslint/no-unsafe-enum-comparison`, `@typescript-eslint/no-wrapper-object-types`, `@typescript-eslint/prefer-as-const`, `@typescript-eslint/prefer-function-type`, `@typescript-eslint/prefer-literal-enum-member`, `@typescript-eslint/prefer-reduce-type-parameter`, `@typescript-eslint/prefer-return-this-type`, `@typescript-eslint/related-getter-setter-pairs`, `@typescript-eslint/unified-signatures`, `unicorn/consistent-tuple-labels`, `unicorn/prefer-type-literal-last`.

### Give classes and objects a clear purpose

Use classes for meaningful instances, not bags of static functions. Declare members, keep member order consistent, preserve inherited accessor contracts, and avoid recursive accessors or useless constructors/overrides. Bind instance methods when passing them as callbacks. Prefer language-native fields and encapsulation.

```ts
class Counter {
  #value = 0;

  read() {
    return this.#value;
  }
}
```

Source rules: `@typescript-eslint/no-extraneous-class`, `@typescript-eslint/no-misused-new`, `@typescript-eslint/no-useless-constructor`, `@typescript-eslint/unbound-method`, `unicorn/consistent-class-member-order`, `unicorn/no-accessor-recursion`, `unicorn/no-incomplete-accessor-override`, `unicorn/no-static-only-class`, `unicorn/no-undeclared-class-members`, `unicorn/no-useless-override`, `unicorn/prefer-class-fields`, `unicorn/prefer-private-class-fields`.

### Initialize and tear down in lifecycle order

Use values only after construction or asynchronous initialization; run per-instance setup in its owning lifetime. Keep declared dependencies complete, preserve required parent initialization, and ensure cleanup outlives asynchronous work.

```ts
const client = new Client();
await client.initialize();

try {
  await client.execute();
} finally {
  await client.close();
}
```

Source rules: `constructor-super`, `no-this-before-super`, `react-doctor/zustand-no-get-during-initialization`.

### Preserve useful exception information

Raise meaningful exception objects with messages and appropriate types. Preserve the caught cause, avoid empty rethrows and swallowed failures, and aggregate related errors when useful. Never let a finally return or replacement exception silently erase the original failure.

```ts
try {
  await saveReport();
} catch (error) {
  throw new Error(SAVE_FAILED, { cause: error });
}
```

Source rules: `@typescript-eslint/only-throw-error`, `@typescript-eslint/prefer-promise-reject-errors`, `no-unsafe-finally`, `no-useless-catch`, `preserve-caught-error`, `react-doctor/no-unguarded-throwing-parse-call`, `react-doctor/react-router-no-catch-middleware-next`, `react-doctor/react-router-no-redirect-in-try-catch`, `react-doctor/react-router-no-use-loader-data-in-error-ui`, `react-doctor/react-router-require-root-error-boundary`, `react-hooks/error-boundaries`, `unicorn/error-message`, `unicorn/no-error-property-assignment`, `unicorn/no-useless-error-capture-stack-trace`, `unicorn/prefer-aggregate-error`, `unicorn/prefer-type-error`.

## Asynchrony and resource ownership

### Honor asynchronous contracts

Await only awaitable work, handle every asynchronous result, avoid asynchronous callbacks in synchronous APIs, and await returned work where exception handling requires it. Preserve rejection handling and avoid unnecessary promise wrappers. Use the language’s direct asynchronous syntax.

```ts
async function loadReport() {
  try {
    return await fetchReport();
  } catch (error) {
    throw new Error(LOAD_FAILED, { cause: error });
  }
}
```

Source rules: `@typescript-eslint/await-thenable`, `@typescript-eslint/no-floating-promises`, `@typescript-eslint/no-misused-promises`, `@typescript-eslint/require-await`, `@typescript-eslint/return-await`, `no-async-promise-executor`, `react-doctor/no-async-effect-callback`, `react-doctor/no-floating-then-in-jsx-handler`, `react-doctor/no-promise-then-side-effect-in-effect-without-catch`, `react-doctor/react-router-return-navigation-promise-in-transition`, `react-doctor/three-no-async-animation-loop`, `unicorn/no-async-iterator-callback`, `unicorn/no-async-promise-finally`, `unicorn/no-await-expression-member`, `unicorn/no-single-promise-in-promise-methods`, `unicorn/no-unnecessary-await`, `unicorn/no-useless-promise-resolve-reject`, `unicorn/prefer-await`, `unicorn/prefer-promise-static-methods`, `unicorn/prefer-promise-try`, `unicorn/prefer-promise-with-resolvers`, `unicorn/prefer-then-catch`, `unicorn/prefer-top-level-await`.

### Schedule work with deliberate concurrency

Run independent operations together when safe; avoid sequential waterfalls, premature waits, asynchronous reduction mistakes, reentry races, repeated completion calls, and stale updates after cancellation. Check success status before reading aggregate results.

```ts
const [users, projects] = await Promise.all([loadUsers(), loadProjects()]);
renderDashboard(users, projects);
```

Source rules: `react-doctor/async-await-in-loop`, `react-doctor/async-defer-await`, `react-doctor/async-parallel`, `react-doctor/js-async-reduce-without-awaited-acc`, `react-doctor/no-async-event-handler-without-reentry-guard`, `react-doctor/no-set-state-after-await-in-effect`, `react-doctor/no-unowned-async-error-clear`, `react-doctor/react-router-loader-parallel-fetch`, `react-doctor/react-router-no-multiple-middleware-next`, `react-doctor/server-sequential-independent-await`, `unicorn/no-await-in-promise-methods`, `unicorn/no-multiple-promise-resolver-calls`, `unicorn/no-unsafe-promise-all-settled-values`.

### Pair acquisition with cleanup and ownership

Close files, dispose owned resources, remove the exact listener registered, revoke temporary handles, cancel timers/debounces/animation, and propagate cancellation. Do not return a resource beyond its lifetime. Ensure cleanup also runs on failure and early exit.

```ts
const subscription = source.subscribe(onValue);

try {
  await consumeSource();
} finally {
  subscription.unsubscribe();
}
```

Source rules: `react-doctor/class-component-missing-component-will-unmount-teardown`, `react-doctor/debounce-no-cleanup`, `react-doctor/effect-listener-cleanup-mismatch`, `react-doctor/effect-listener-cleanup-reference-mismatch`, `react-doctor/effect-needs-cleanup`, `react-doctor/effect-observer-needs-disconnect`, `react-doctor/effect-raf-loop-needs-cancel`, `react-doctor/effect-remove-listener-inline-handler`, `react-doctor/mobx-reaction-disposer-discarded`, `react-doctor/no-create-object-url-without-revoke`, `react-doctor/no-effect-wrapper-discards-callback-cleanup-return`, `react-doctor/no-loading-flag-reset-outside-finally`, `react-doctor/no-ref-callback-cleanup-before-react-19`, `react-doctor/pointer-capture-needs-cancel-handler`, `react-doctor/react-router-guard-aborted-handle-error`, `react-doctor/react-router-loader-fetch-forwards-signal`, `react-doctor/three-require-animation-mixer-cleanup`, `react-doctor/three-require-controls-cleanup`, `react-doctor/three-require-gpu-computation-cleanup`, `react-doctor/three-require-owned-geometry-cleanup`, `react-doctor/three-require-owned-material-cleanup`, `react-doctor/three-require-owned-texture-cleanup`, `react-doctor/three-require-postprocessing-cleanup`, `react-doctor/three-require-render-target-cleanup`, `react-doctor/three-require-renderer-cleanup`, `react-doctor/three-require-worker-loader-cleanup`, `unicorn/no-using-resource-escape`, `unicorn/prefer-abort-signal-any`, `unicorn/prefer-abort-signal-timeout`.

### Respect event lifetime and scheduling

Use explicit event options and timer delays, avoid ineffective late event control, retain stable handler identity, and use a scheduler matching the intended timing. Do not block the event loop or exit before pending cleanup finishes.

```ts
target.addEventListener(EVENT_TYPE, onEvent, { signal: controller.signal });

try {
  await waitForCompletion();
} finally {
  controller.abort();
}
```

Source rules: `react-doctor/client-passive-event-listeners`, `react-doctor/ink-ctrl-c-handler-requires-exit-option`, `react-doctor/ink-no-bare-process-exit`, `react-doctor/ink-no-direct-raw-mode`, `react-doctor/ink-no-repeated-render`, `react-doctor/ink-use-reactive-window-size`, `react-doctor/ink-use-suspend-terminal`, `react-doctor/no-prevent-default`, `react-doctor/no-stale-timer-ref`, `react-doctor/no-sync-xhr`, `react-doctor/tanstack-form-on-submit-requires-prevent-default`, `unicorn/explicit-timer-delay`, `unicorn/no-invalid-remove-event-listener`, `unicorn/no-late-current-target-access`, `unicorn/no-late-event-control`, `unicorn/no-prevent-default-in-passive-listener`, `unicorn/no-process-exit`, `unicorn/prefer-add-event-listener`, `unicorn/prefer-add-event-listener-options`, `unicorn/prefer-event-target`, `unicorn/prefer-queue-microtask`, `unicorn/require-passive-events`.

## Collections, text, and data

### Choose the collection operation matching the question

Use find for one item, some/any for existence, membership containers for repeated membership, map for transformation, and grouping/set operations for their stated purpose. Avoid sorting to get an extremum, redundant materialization, unnecessary passes, and full iteration when only one result is needed.

```ts
const hasReadyItem = items.some(isReady);
const readyItem = items.find(isReady);
const largest = Math.max(...sizes);
```

Source rules: `@typescript-eslint/prefer-find`, `@typescript-eslint/prefer-includes`, `unicorn/no-array-from-fill`, `unicorn/no-array-sort-for-min-max`, `unicorn/no-computed-property-existence-check`, `unicorn/no-unnecessary-array-flat-depth`, `unicorn/no-unnecessary-array-flat-map`, `unicorn/no-unnecessary-splice`, `unicorn/no-useless-delete-check`, `unicorn/no-useless-iterator-to-array`, `unicorn/prefer-array-find`, `unicorn/prefer-array-flat`, `unicorn/prefer-array-flat-map`, `unicorn/prefer-array-from-async`, `unicorn/prefer-array-from-map`, `unicorn/prefer-array-from-range`, `unicorn/prefer-array-index-of`, `unicorn/prefer-array-last-methods`, `unicorn/prefer-array-some`, `unicorn/prefer-group-by`, `unicorn/prefer-includes`, `unicorn/prefer-includes-over-repeated-comparisons`, `unicorn/prefer-iterable-in-constructor`, `unicorn/prefer-iterator-helpers`, `unicorn/prefer-iterator-to-array`, `unicorn/prefer-iterator-to-array-at-end`, `unicorn/prefer-iterator-zip`, `unicorn/prefer-map-from-entries`, `unicorn/prefer-object-from-entries`, `unicorn/prefer-object-iterable-methods`, `unicorn/prefer-set-has`, `unicorn/prefer-set-methods`, `unicorn/prefer-set-size`, `unicorn/prefer-single-array-predicate`.

### Preserve collection shape and key meaning

Use the correct map/set interface, consistent keys, dense elements, valid slice/splice bounds, numeric comparators, and explicit join separators. Avoid accidental mutation and operations that silently change item identity or collection type.

```ts
const sortedSizes = sizes.toSorted((left, right) => left - right);
const value = entries.get(requestedKey);
const summary = names.join(SEPARATOR);
```

Source rules: `@typescript-eslint/no-array-constructor`, `@typescript-eslint/no-misused-spread`, `no-sparse-arrays`, `react-doctor/jsx-props-no-spread-multi`, `react-doctor/no-fill-map-element-as-key`, `unicorn/consistent-empty-array-spread`, `unicorn/no-boolean-sort-comparator`, `unicorn/no-collection-bracket-access`, `unicorn/no-confusing-array-splice`, `unicorn/no-confusing-array-with`, `unicorn/no-mismatched-map-key`, `unicorn/no-new-array`, `unicorn/no-object-methods-with-collections`, `unicorn/no-unnecessary-array-splice-count`, `unicorn/no-unnecessary-slice-end`, `unicorn/no-useless-collection-argument`, `unicorn/no-useless-fallback-in-spread`, `unicorn/no-useless-set-construction`, `unicorn/no-useless-spread`, `unicorn/prefer-array-slice`, `unicorn/prefer-at`, `unicorn/prefer-has-check`, `unicorn/prefer-negative-index`, `unicorn/prefer-simple-sort-comparator`, `unicorn/prefer-spread`, `unicorn/require-array-join-separator`, `unicorn/require-array-sort-compare`.

### Use direct, lossless string operations

Use prefix/suffix, replacement-all, padding, repetition, slicing, and regex APIs according to the actual task. Make conversions explicit; avoid lossy object interpolation, incorrect template syntax, redundant trimming, unsafe replacement expansion, and pretending a code unit is a full character.

```ts
const normalized = value.replaceAll(OLD_SEPARATOR, NEW_SEPARATOR);
const isReport = filename.endsWith(REPORT_SUFFIX);
```

Source rules: `@typescript-eslint/no-unnecessary-template-expression`, `@typescript-eslint/prefer-regexp-exec`, `@typescript-eslint/prefer-string-starts-ends-with`, `@typescript-eslint/restrict-template-expressions`, `no-useless-escape`, `react-doctor/no-string-false-on-boolean-attribute`, `unicorn/no-console-spaces`, `unicorn/no-incorrect-template-string-interpolation`, `unicorn/no-unnecessary-string-trim`, `unicorn/no-useless-concat`, `unicorn/no-useless-template-literals`, `unicorn/prefer-regexp-test`, `unicorn/prefer-single-replace`, `unicorn/prefer-split-limit`, `unicorn/prefer-string-match-all`, `unicorn/prefer-string-pad-start-end`, `unicorn/prefer-string-raw`, `unicorn/prefer-string-repeat`, `unicorn/prefer-string-replace-all`, `unicorn/prefer-string-slice`, `unicorn/prefer-string-starts-ends-with`, `unicorn/prefer-string-trim-start-end`.

### Treat text encoding and display width correctly

Use valid regular expressions, explicit escapes for invisible characters, coherent encoding identifiers, code-point-aware operations, and streaming decoders for chunked text. Text length, terminal columns, bytes, and user-perceived characters are different units.

```ts
const decoder = new TextDecoder();
const text = decoder.decode(chunk, { stream: true });
```

Source rules: `no-control-regex`, `no-empty-character-class`, `no-invalid-regexp`, `no-irregular-whitespace`, `no-misleading-character-class`, `no-regex-spaces`, `no-useless-backreference`, `react-doctor/ink-use-string-width-for-cursor`, `unicorn/consistent-template-literal-escape`, `unicorn/escape-case`, `unicorn/prefer-code-point`, `unicorn/prefer-escaped-irregular-whitespace`, `unicorn/prefer-literal-ascii`, `unicorn/prefer-short-escape-sequences`, `unicorn/prefer-unicode-code-point-escapes`, `unicorn/require-text-decoder-streaming`, `unicorn/text-encoding-identifier-case`.

### Use mathematically valid and precise operations

Avoid precision loss, invalid numeric operands, accidental bitwise operations, misleading numeric forms, impossible bounds, and unsafe integer assumptions. Use the language’s dedicated NaN and signed-zero checks when ordinary equality cannot distinguish the intended numeric values. Use direct math APIs, exact constants, explicit rounding precision, and valid ranges rather than approximate or obscure arithmetic.

```ts
const magnitude = Math.abs(delta);
const count = Math.trunc(rawCount);

if (!Number.isSafeInteger(count)) {
  throw new RangeError(INVALID_COUNT);
}
```

Source rules: `@typescript-eslint/no-unsafe-unary-minus`, `@typescript-eslint/restrict-plus-operands`, `no-compare-neg-zero`, `no-loss-of-precision`, `react-doctor/no-unguarded-numeric-input-parse`, `unicorn/no-accidental-bitwise-operator`, `unicorn/no-constant-zero-expression`, `unicorn/no-invalid-temporal-arithmetic`, `unicorn/no-subtraction-comparison`, `unicorn/no-xor-as-exponentiation`, `unicorn/no-zero-fractions`, `unicorn/numeric-separators-style`, `unicorn/prefer-date-now`, `unicorn/prefer-flat-math-min-max`, `unicorn/prefer-math-abs`, `unicorn/prefer-math-constants`, `unicorn/prefer-math-min-max`, `unicorn/prefer-math-trunc`, `unicorn/prefer-modern-math-apis`, `unicorn/prefer-number-coercion`, `unicorn/prefer-number-is-safe-integer`, `unicorn/prefer-temporal-conversion`, `unicorn/prefer-unary-minus`, `unicorn/require-number-to-fixed-digits-argument`, `use-isnan`.

### Preserve data through conversion

Choose cloning and serialization operations that support the actual value types. Do not deep-clone through lossy JSON, leak bytes outside a buffer view, or stringify values without checking whether their representation is meaningful.

```ts
const snapshot = structuredClone(state);
const bytes = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
```

Source rules: `@typescript-eslint/no-base-to-string`, `react-doctor/no-json-parse-stringify-clone`, `react-doctor/no-object-or-array-coerced-to-string-in-template-literal`, `unicorn/consistent-json-file-read`, `unicorn/no-unsafe-buffer-conversion`, `unicorn/no-unsafe-json-serialization`, `unicorn/prefer-structured-clone`.

## Security, protocols, and efficiency

### Keep executable input separate from data

Avoid evaluation of input strings, parameterize SQL, escape values for their destination grammar, use secure transports and safe URL protocols, validate path containment, isolate untrusted embedded content, and keep secrets out of client or public storage. Validation must address the actual attack surface.

```ts
const destination = new URL(input);
database.query(QUERY_BY_ID, [requestedId]);

if (destination.protocol !== HTTPS_PROTOCOL) {
  throw new TypeError(INVALID_DESTINATION);
}
```

Source rules: `@typescript-eslint/no-implied-eval`, `react-doctor/auth-token-in-web-storage`, `react-doctor/iframe-missing-sandbox`, `react-doctor/jsx-no-script-url`, `react-doctor/jsx-no-target-blank`, `react-doctor/no-danger-with-children`, `react-doctor/no-document-write`, `react-doctor/no-eval`, `react-doctor/no-non-literal-selector-query-without-try-catch`, `react-doctor/no-path-prefix-containment`, `react-doctor/no-secrets-in-client-code`, `react-doctor/no-unescaped-dynamic-string-in-regexp`, `react-doctor/react-markdown-unsanitized-raw-html`, `react-doctor/react-router-csp-nonce-consistency`, `react-doctor/server-auth-actions`, `react-doctor/window-open-without-noopener`, `unicorn/no-document-cookie`, `unicorn/no-ineffective-csp-directives`, `unicorn/no-invalid-integrity`, `unicorn/no-unsafe-property-key`, `unicorn/no-unsafe-sqlite-interpolation`, `unicorn/no-unsafe-string-replacement`, `unicorn/prefer-dom-node-html-methods`, `unicorn/prefer-https`, `unicorn/require-css-escape`.

### Use protocol-aware networking APIs

Build URLs and query parameters with their structured APIs, validate protocols and request/response options, check response status before consuming a body, and preserve required response/session commits. Avoid hand-parsing URLs and invalid cache or credential combinations.

```ts
const response = await fetch(endpoint, { signal });

if (!response.ok) {
  throw new Error(REQUEST_FAILED);
}

return response.json();
```

Source rules: `react-doctor/no-fetch-response-used-without-status-check`, `react-doctor/react-router-descendant-routes-require-splat`, `react-doctor/react-router-internal-route-anchor`, `react-doctor/react-router-nested-route-requires-outlet`, `react-doctor/react-router-no-invalid-absolute-child-path`, `react-doctor/react-router-no-invalid-splat-path`, `react-doctor/react-router-no-loader-request-body`, `react-doctor/react-router-no-middleware-response-body-consumption`, `react-doctor/react-router-no-multiple-set-search-params-in-tick`, `react-doctor/react-router-no-session-mutation-in-loader`, `react-doctor/react-router-no-static-cookie-expires`, `react-doctor/react-router-no-unsynchronized-search-params-mutation`, `react-doctor/react-router-resource-link-requires-reload`, `react-doctor/react-router-server-middleware-return-response`, `react-doctor/react-router-session-mutation-requires-commit`, `react-doctor/server-after-nonblocking`, `react-doctor/server-fetch-without-revalidate`, `unicorn/no-invalid-fetch-options`, `unicorn/no-invalid-response-options`, `unicorn/no-invalid-url-protocol-comparison`, `unicorn/no-unnecessary-fetch-options`, `unicorn/no-url-in-search-params`, `unicorn/prefer-response-static-json`, `unicorn/prefer-url-can-parse`, `unicorn/prefer-url-href`, `unicorn/prefer-url-search-parameters`, `unicorn/relative-url-style`.

### Avoid repeated allocation and needless asymptotic cost

Hoist stable expensive work, use indexed lookup for repeated searches, avoid copying an accumulator at every iteration, and keep blocking work out of hot paths. Defer work until after guards and use batches, lazy iteration, or native operations when they preserve behavior.

```ts
const usersById = new Map(users.map((user) => toUserEntry(user)));

for (const request of requests) {
  serve(request, usersById.get(request.userId));
}
```

Source rules: `react-doctor/js-hoist-intl`, `react-doctor/js-hoist-regexp`, `react-doctor/js-index-maps`, `react-doctor/js-min-max-loop`, `react-doctor/js-set-map-lookups`, `react-doctor/no-full-lodash-import`, `react-doctor/no-large-animated-blur`, `react-doctor/no-moment`, `react-doctor/no-permanent-will-change`, `react-doctor/no-spread-accumulator-in-reduce`, `react-doctor/no-undeferred-third-party`, `react-doctor/react-router-prefer-route-lazy`, `react-doctor/rendering-script-defer-async`, `react-doctor/rerender-defer-reads-hook`, `react-doctor/rerender-lazy-ref-init`, `react-doctor/server-hoist-static-io`, `react-doctor/use-lazy-motion`, `unicorn/no-array-concat-in-loop`.

### Give caches and identities correct lifetimes

Reuse stable objects only when their inputs and ownership allow it. Cache keys must represent all relevant inputs; invalidation and subscription dependencies must reflect actual reads. Avoid stale snapshots, needless recreation, whole-store subscriptions, and derived state that duplicates its source of truth.

```ts
const cacheKey = makeCacheKey(accountId, locale);
const report = await cache.getOrInsertComputed(cacheKey, loadReport);
```

Source rules: `react-doctor/context-provider-value-from-unmemoized-local-literal`, `react-doctor/jotai-derived-atom-returns-fresh-object`, `react-doctor/jotai-select-atom-in-render-body`, `react-doctor/jotai-tq-use-raw-query-atom`, `react-doctor/js-cache-storage`, `react-doctor/jsx-no-constructed-context-values`, `react-doctor/jsx-no-new-array-as-prop`, `react-doctor/jsx-no-new-function-as-prop`, `react-doctor/jsx-no-new-object-as-prop`, `react-doctor/mobx-no-observer-wrapped-memo`, `react-doctor/no-create-ref-in-function-component`, `react-doctor/no-derived-state`, `react-doctor/no-derived-state-effect`, `react-doctor/no-derived-useState`, `react-doctor/no-inline-prop-on-memo-component`, `react-doctor/no-mirror-prop-effect`, `react-doctor/no-mutable-in-deps`, `react-doctor/no-pass-live-state-to-parent`, `react-doctor/no-redundant-should-component-update`, `react-doctor/no-whole-object-dep-with-member-reads`, `react-doctor/prefer-stable-empty-fallback`, `react-doctor/redux-useselector-inline-derivation`, `react-doctor/redux-useselector-returns-new-collection`, `react-doctor/rerender-dependencies`, `react-doctor/rerender-derived-state-from-hook`, `react-doctor/rerender-memo-before-early-return`, `react-doctor/rerender-memo-with-default-value`, `react-doctor/server-cache-with-object-literal`, `react-doctor/tanstack-table-no-unstable-data-or-columns`, `react-doctor/three-on-before-compile-require-program-cache-key`, `react-doctor/valtio-no-snapshot-in-callback`, `react-doctor/zustand-no-fresh-selector-result`, `react-doctor/zustand-no-whole-store-destructure`, `react-hooks/preserve-manual-memoization`, `react-hooks/use-memo`, `react-hooks/void-use-memo`, `unicorn/prefer-get-or-insert-computed`.

## Interfaces and graphics

### Make interfaces perceivable and operable

Give controls, dialogs, links, media, and navigation useful names and valid semantics. Provide keyboard access, sensible focus order, labels, captions, and language; preserve paste and input-method behavior. Avoid hidden focusable controls, redundant or invalid accessibility attributes, intrusive announcements, and unexpected motion. This applies to interfaces built in JavaScript or Python.

```ts
const confirmAction = {
  label: CONFIRM_LABEL,
  accessibleName: CONFIRM_LABEL,
  onActivate: confirm,
};
```

Source rules: `react-doctor/alt-text`, `react-doctor/anchor-ambiguous-text`, `react-doctor/anchor-has-content`, `react-doctor/anchor-is-valid`, `react-doctor/anchor-target-exists`, `react-doctor/aria-activedescendant-has-tabindex`, `react-doctor/aria-props`, `react-doctor/aria-proptypes`, `react-doctor/aria-role`, `react-doctor/aria-unsupported-elements`, `react-doctor/autocomplete-valid`, `react-doctor/base-ui-dialog-popup-requires-title`, `react-doctor/base-ui-field-requires-label`, `react-doctor/click-events-have-key-events`, `react-doctor/control-has-associated-label`, `react-doctor/dialog-has-accessible-name`, `react-doctor/heading-has-content`, `react-doctor/html-has-lang`, `react-doctor/html-label-has-single-control`, `react-doctor/html-no-nested-interactive`, `react-doctor/iframe-has-title`, `react-doctor/img-redundant-alt`, `react-doctor/ink-valid-aria-semantics`, `react-doctor/interactive-supports-focus`, `react-doctor/label-has-associated-control`, `react-doctor/lang`, `react-doctor/media-has-caption`, `react-doctor/mouse-events-have-key-events`, `react-doctor/no-access-key`, `react-doctor/no-aria-hidden-on-focusable`, `react-doctor/no-assertive-status`, `react-doctor/no-autofocus`, `react-doctor/no-autoplay-without-muted`, `react-doctor/no-blocked-paste`, `react-doctor/no-deprecated-keyboard-event-keycode-which`, `react-doctor/no-distracting-elements`, `react-doctor/no-enter-submit-without-ime-composition-guard`, `react-doctor/no-focusable-content-in-aria-hidden`, `react-doctor/no-interactive-element-to-noninteractive-role`, `react-doctor/no-multiple-main-landmarks`, `react-doctor/no-multiple-unlabeled-navigation-landmarks`, `react-doctor/no-noninteractive-element-interactions`, `react-doctor/no-noninteractive-element-to-interactive-role`, `react-doctor/no-noninteractive-tabindex`, `react-doctor/no-placeholder-only-field`, `react-doctor/no-redundant-roles`, `react-doctor/no-responsive-hidden-accessible-name`, `react-doctor/no-static-element-interactions`, `react-doctor/no-static-motion-config-never`, `react-doctor/no-uninformative-aria-label`, `react-doctor/prefer-html-dialog`, `react-doctor/prefer-tag-over-role`, `react-doctor/radio-input-missing-name`, `react-doctor/radix-dialog-content-requires-title`, `react-doctor/react-aria-dialog-requires-heading`, `react-doctor/role-button-requires-complete-keyboard-activation`, `react-doctor/role-has-required-aria-props`, `react-doctor/role-supports-aria-props`, `react-doctor/scope`, `react-doctor/shadcn-dialog-content-requires-title`, `react-doctor/shadcn-form-item-requires-label`, `react-doctor/shadcn-icon-button-requires-label`, `react-doctor/tabindex-no-positive`, `unicorn/prefer-keyboard-event-key`.

### Keep presentation constraints consistent and responsive

Use valid content structure, compatible layout constraints, correctly bounded animation ranges, stable item identifiers, appropriate responsive media, and reduced-motion behavior. Update only necessary presentation properties; avoid expensive layout or global work for every frame. Python GUI and visualization code needs the same contract checks.

```ts
const animation = {
  from: 0,
  to: 1,
  duration: ANIMATION_DURATION,
  isEnabled: !prefersReducedMotion,
};
```

Source rules: `react-doctor/base-ui-tabs-tab-requires-list`, `react-doctor/html-no-invalid-paragraph-child`, `react-doctor/html-no-invalid-table-nesting`, `react-doctor/html-no-nested-form`, `react-doctor/ink-prefer-use-animation`, `react-doctor/js-batch-dom-css`, `react-doctor/motion-animate-presence-must-outlive-child`, `react-doctor/motion-animate-presence-wait-single-child`, `react-doctor/motion-drag-axis-constraint-mismatch`, `react-doctor/motion-keyframe-times-mismatch`, `react-doctor/motion-layout-on-inline-element`, `react-doctor/motion-use-transform-range-length`, `react-doctor/no-broken-image-source`, `react-doctor/no-conflicting-spring-options`, `react-doctor/no-document-start-view-transition`, `react-doctor/no-global-css-variable-animation`, `react-doctor/no-img-lazy-with-high-fetchpriority`, `react-doctor/no-invalid-progress-range`, `react-doctor/no-layout-property-animation`, `react-doctor/no-mixed-srcset-descriptors`, `react-doctor/no-srcset-without-sizes`, `react-doctor/no-transition-all`, `react-doctor/radix-tabs-trigger-requires-list`, `react-doctor/rerender-transitions-scroll`, `react-doctor/shadcn-command-item-state-variant-requires-value`, `react-doctor/shadcn-input-group-no-raw-controls`, `react-doctor/shadcn-tabs-trigger-requires-list`, `unicorn/no-canvas-to-image`, `unicorn/no-transition-all`, `unicorn/prefer-path2d`.

### Keep graphics state, buffers, and frame work coherent

Validate dimensions, item sizes, ranges, shader interfaces, and supported backend features. Initialize before use, propagate resize and dirty-state updates, provide required inputs, advance animations by elapsed time, batch repeated draws, and release owned GPU resources. These principles also apply to Python graphics libraries.

```ts
function advance(deltaSeconds: number) {
  mixer.update(deltaSeconds);
  renderer.render(scene, camera);
}
```

Source rules: `react-doctor/r3f-cap-device-pixel-ratio`, `react-doctor/r3f-limit-shadowed-point-lights`, `react-doctor/r3f-no-advancing-clock-in-use-frame`, `react-doctor/r3f-no-allocation-in-pointer-move`, `react-doctor/r3f-no-async-use-frame`, `react-doctor/r3f-no-clone-in-use-frame`, `react-doctor/r3f-no-compile-in-use-frame`, `react-doctor/r3f-no-deep-use-three-selector`, `react-doctor/r3f-no-dispose-loader-cache`, `react-doctor/r3f-no-duplicate-primitive-object`, `react-doctor/r3f-no-extend-in-render`, `react-doctor/r3f-no-extend-three-namespace`, `react-doctor/r3f-no-fresh-portal-container`, `react-doctor/r3f-no-fresh-use-three-selector`, `react-doctor/r3f-no-ignored-basic-material-properties`, `react-doctor/r3f-no-ignored-linewidth`, `react-doctor/r3f-no-imperative-attach-of-managed-ref`, `react-doctor/r3f-no-inline-primitive-object`, `react-doctor/r3f-no-inline-resource-prop`, `react-doctor/r3f-no-internal-imports`, `react-doctor/r3f-no-manual-canvas-resize`, `react-doctor/r3f-no-mutate-loader-cache`, `react-doctor/r3f-no-mutate-uniform-prop-source-in-use-frame`, `react-doctor/r3f-no-mutating-pointer-event-data`, `react-doctor/r3f-no-new-in-use-frame`, `react-doctor/r3f-no-normalized-float-buffer-attribute`, `react-doctor/r3f-no-null-loader-input`, `react-doctor/r3f-no-object-pointer-capture`, `react-doctor/r3f-no-recursive-raf-with-use-frame`, `react-doctor/r3f-no-shader-configuration-mutation-in-use-frame`, `react-doctor/r3f-no-shadows-on-unsupported-light`, `react-doctor/r3f-no-state-in-pointer-move`, `react-doctor/r3f-no-state-in-use-frame`, `react-doctor/r3f-no-sync-readback-in-use-frame`, `react-doctor/r3f-no-unstable-args`, `react-doctor/r3f-no-use-frame-dependency-array`, `react-doctor/r3f-prefer-gpu-instanced-animation`, `react-doctor/r3f-prefer-gpu-position-animation`, `react-doctor/r3f-prefer-instanced-mesh`, `react-doctor/r3f-prefer-use-loader`, `react-doctor/r3f-require-animation-mixer-update`, `react-doctor/r3f-require-data-texture-update`, `react-doctor/r3f-require-dynamic-buffer-usage`, `react-doctor/r3f-require-environment-for-metal`, `react-doctor/r3f-require-frame-delta`, `react-doctor/r3f-require-global-effect-cleanup`, `react-doctor/r3f-require-instanced-buffer-update`, `react-doctor/r3f-require-lighting-for-pbr`, `react-doctor/r3f-require-lit-material-normals`, `react-doctor/r3f-require-owned-texture-cleanup`, `react-doctor/r3f-require-position-buffer-update`, `react-doctor/r3f-require-projection-matrix-update`, `react-doctor/r3f-require-render-target-reset`, `react-doctor/r3f-require-render-with-positive-priority`, `react-doctor/r3f-require-root-unmount`, `react-doctor/r3f-require-shadows-enabled`, `react-doctor/r3f-require-transparent-for-opacity`, `react-doctor/r3f-require-uv-for-texture-map`, `react-doctor/r3f-texture-repeat-requires-wrapping`, `react-doctor/r3f-valid-buffer-attribute-array-length`, `react-doctor/r3f-valid-buffer-attribute-item-size`, `react-doctor/r3f-valid-fog-parameters`, `react-doctor/r3f-valid-material-opacity`, `react-doctor/r3f-valid-orthographic-camera`, `react-doctor/r3f-valid-pbr-material-properties`, `react-doctor/r3f-valid-perspective-camera`, `react-doctor/r3f-valid-physical-material-properties`, `react-doctor/r3f-valid-raycaster-range`, `react-doctor/r3f-valid-shadow-map-size`, `react-doctor/r3f-valid-spot-light-properties`, `react-doctor/r3f-valid-texture-color-space`, `react-doctor/r3f-webgpu-canvas-prop-compatibility`, `react-doctor/r3f-webgpu-no-gl-state`, `react-doctor/r3f-webgpu-no-high-precision-instancing`, `react-doctor/r3f-webgpu-no-js-uniform-branch`, `react-doctor/r3f-webgpu-no-legacy-effect-composer`, `react-doctor/r3f-webgpu-no-legacy-material-api`, `react-doctor/r3f-webgpu-no-unregistered-pipeline-pass`, `react-doctor/r3f-webgpu-require-async-init`, `react-doctor/remotion-calculate-metadata-fetch-signal`, `react-doctor/remotion-no-css-animation`, `react-doctor/remotion-no-css-transition`, `react-doctor/remotion-no-css-url-assets`, `react-doctor/remotion-no-module-scope-delay-render`, `react-doctor/remotion-no-native-media-elements`, `react-doctor/remotion-no-next-image`, `react-doctor/remotion-stable-delay-render-handle`, `react-doctor/three-cap-device-pixel-ratio`, `react-doctor/three-effect-composer-output-pass-last`, `react-doctor/three-effect-composer-require-size-on-resize`, `react-doctor/three-gpu-computation-handle-init-error`, `react-doctor/three-gpu-computation-require-init-before-compute`, `react-doctor/three-gpu-computation-valid-variable-name`, `react-doctor/three-limit-shadowed-point-lights`, `react-doctor/three-no-allocation-in-pointer-move`, `react-doctor/three-no-clone-in-animation-loop`, `react-doctor/three-no-compile-in-animation-loop`, `react-doctor/three-no-ignored-basic-material-properties`, `react-doctor/three-no-ignored-linewidth`, `react-doctor/three-no-material-recompile-in-animation-loop`, `react-doctor/three-no-new-in-animation-loop`, `react-doctor/three-no-normalized-float-buffer-attribute`, `react-doctor/three-no-object-construction-in-render`, `react-doctor/three-no-redundant-uniforms-need-update`, `react-doctor/three-no-shader-configuration-mutation-in-animation-loop`, `react-doctor/three-no-shadows-on-unsupported-light`, `react-doctor/three-no-sync-readback-in-animation-loop`, `react-doctor/three-no-unconditional-renderer-resize-in-animation-loop`, `react-doctor/three-prefer-gpu-instanced-animation`, `react-doctor/three-prefer-gpu-position-animation`, `react-doctor/three-prefer-instanced-mesh`, `react-doctor/three-prefer-set-animation-loop`, `react-doctor/three-raw-shader-require-fragment-float-precision`, `react-doctor/three-raw-shader-require-glsl3-version`, `react-doctor/three-require-animation-mixer-update`, `react-doctor/three-require-camera-aspect-on-resize`, `react-doctor/three-require-controls-update`, `react-doctor/three-require-data-texture-update`, `react-doctor/three-require-dynamic-buffer-usage`, `react-doctor/three-require-environment-for-metal`, `react-doctor/three-require-frame-delta`, `react-doctor/three-require-instanced-buffer-update`, `react-doctor/three-require-ktx2-detect-support`, `react-doctor/three-require-lighting-for-pbr`, `react-doctor/three-require-lit-material-normals`, `react-doctor/three-require-loader-error-handling`, `react-doctor/three-require-position-buffer-update`, `react-doctor/three-require-projection-matrix-update`, `react-doctor/three-require-render-in-animation-loop`, `react-doctor/three-require-render-target-reset`, `react-doctor/three-require-renderer-dom-attachment`, `react-doctor/three-require-renderer-size`, `react-doctor/three-require-shadows-enabled`, `react-doctor/three-require-texture-update-after-wrapping-change`, `react-doctor/three-require-transparent-for-opacity`, `react-doctor/three-require-uv-for-texture-map`, `react-doctor/three-shader-no-constant-out-of-bounds-index`, `react-doctor/three-shader-no-derivatives-in-nonuniform-flow`, `react-doctor/three-shader-no-glsl1-syntax-with-glsl3`, `react-doctor/three-shader-no-invalid-clamp-bounds`, `react-doctor/three-shader-no-invalid-constant-bit-operations`, `react-doctor/three-shader-no-invalid-constant-math`, `react-doctor/three-shader-no-invalid-smoothstep-edges`, `react-doctor/three-shader-no-inverse-of-uniform`, `react-doctor/three-shader-no-redeclared-builtins`, `react-doctor/three-shader-no-redundant-frag-depth`, `react-doctor/three-shader-no-reserved-identifiers`, `react-doctor/three-shader-no-version-directive`, `react-doctor/three-shader-prefer-small-integer-pow`, `react-doctor/three-shader-prefer-squared-distance-comparison`, `react-doctor/three-shader-require-compatible-uniform-values`, `react-doctor/three-shader-require-fragment-output-on-all-paths`, `react-doctor/three-shader-require-matching-uniforms`, `react-doctor/three-shader-require-matching-varyings`, `react-doctor/three-shader-require-position-on-all-paths`, `react-doctor/three-shader-require-uniform-bindings`, `react-doctor/three-shader-valid-global-initializers`, `react-doctor/three-shader-valid-uniform-definitions`, `react-doctor/three-texture-repeat-requires-wrapping`, `react-doctor/three-tsl-no-js-uniform-branch`, `react-doctor/three-valid-buffer-attribute-array-length`, `react-doctor/three-valid-buffer-attribute-item-size`, `react-doctor/three-valid-data-texture-data-length`, `react-doctor/three-valid-data-texture-dimensions`, `react-doctor/three-valid-fog-parameters`, `react-doctor/three-valid-gpu-computation-dimensions`, `react-doctor/three-valid-material-opacity`, `react-doctor/three-valid-orthographic-camera`, `react-doctor/three-valid-pbr-material-properties`, `react-doctor/three-valid-perspective-camera`, `react-doctor/three-valid-physical-material-properties`, `react-doctor/three-valid-raycaster-range`, `react-doctor/three-valid-shadow-map-size`, `react-doctor/three-valid-spot-light-properties`, `react-doctor/three-valid-texture-color-space`, `react-doctor/three-webgpu-no-high-precision-instancing`, `react-doctor/three-webgpu-no-legacy-effect-composer`, `react-doctor/three-webgpu-no-legacy-material-api`, `react-doctor/three-webgpu-require-init-before-sync-operation`, `react-doctor/web-animation-offsets-valid`, `react-doctor/webgl-no-sync-readback-in-animation-loop`.

## Coverage and syntax-specific exclusions

Inventory basis: ESLint 10.13.0; @eslint/js 10.0.1; typescript-eslint 8.71.2; Unicorn 78.0.0; ESLint Stylistic 5.10.0; React Hooks 7.1.1; React Doctor 0.9.18; Prettier 3.9.9. Inspect `createConfig({ typed: true })` and `createConfig({ typed: false })` through `ESLint.calculateConfigForFile` for `.js`, `.ts`, `.jsx`, `.tsx`, `.mjs`, `.cjs`, `.mts`, and `.cts` files. Typed mode is the repository default; untyped mode contributes applicable syntax-only variants. React rules are included from JSX/TSX effective configuration, even when the repository itself has no React code. Generated distribution, vendor content, and non-code formats are outside JavaScript rule coverage.

The effective union contains **1153 enabled rule IDs**: **1075** mapped to the **45 concepts** above and **78** excluded below with explicit reasons. Warning-level rules count as enabled. Rules disabled by an override or Prettier conflict do not count; for example, the three TypeScript core-rule replacements preserve their enabled TypeScript equivalents. Off-only entries are not style requirements.

Excluded from language-neutral guidance does not mean disabled in ESLint. Retain each listed rule wherever the JavaScript configuration enables it.

| Enabled rule                                         | Reason no additional language-neutral requirement is extracted                                                                           |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `@stylistic/generator-star-spacing`                  | JavaScript-specific punctuation; ordinary readability is covered by the formatting concept.                                              |
| `@stylistic/jsx-closing-bracket-location`            | JSX-only punctuation and attribute layout; apply the general layout convention to native constructs in other languages.                  |
| `@stylistic/jsx-closing-tag-location`                | JSX-only punctuation and attribute layout; apply the general layout convention to native constructs in other languages.                  |
| `@stylistic/jsx-curly-brace-presence`                | JSX-only punctuation and attribute layout; apply the general layout convention to native constructs in other languages.                  |
| `@stylistic/jsx-curly-newline`                       | JSX-only punctuation and attribute layout; apply the general layout convention to native constructs in other languages.                  |
| `@stylistic/jsx-curly-spacing`                       | JSX-only punctuation and attribute layout; apply the general layout convention to native constructs in other languages.                  |
| `@stylistic/jsx-equals-spacing`                      | JSX-only punctuation and attribute layout; apply the general layout convention to native constructs in other languages.                  |
| `@stylistic/jsx-first-prop-new-line`                 | JSX-only punctuation and attribute layout; apply the general layout convention to native constructs in other languages.                  |
| `@stylistic/jsx-function-call-newline`               | JSX-only punctuation and attribute layout; apply the general layout convention to native constructs in other languages.                  |
| `@stylistic/jsx-indent-props`                        | JSX-only punctuation and attribute layout; apply the general layout convention to native constructs in other languages.                  |
| `@stylistic/jsx-max-props-per-line`                  | JSX-only punctuation and attribute layout; apply the general layout convention to native constructs in other languages.                  |
| `@stylistic/jsx-quotes`                              | JSX-only punctuation and attribute layout; apply the general layout convention to native constructs in other languages.                  |
| `@stylistic/jsx-tag-spacing`                         | JSX-only punctuation and attribute layout; apply the general layout convention to native constructs in other languages.                  |
| `@stylistic/jsx-wrap-multilines`                     | JSX-only punctuation and attribute layout; apply the general layout convention to native constructs in other languages.                  |
| `@stylistic/new-parens`                              | JavaScript-specific punctuation; ordinary readability is covered by the formatting concept.                                              |
| `@stylistic/template-tag-spacing`                    | JavaScript-specific punctuation; ordinary readability is covered by the formatting concept.                                              |
| `@stylistic/wrap-iife`                               | JavaScript-specific punctuation; ordinary readability is covered by the formatting concept.                                              |
| `@stylistic/yield-star-spacing`                      | JavaScript-specific punctuation; ordinary readability is covered by the formatting concept.                                              |
| `@typescript-eslint/no-namespace`                    | TypeScript-only legacy namespace or reference syntax; use native modules in other languages.                                             |
| `@typescript-eslint/no-this-alias`                   | JavaScript-specific module, receiver, primitive, constructor, or interoperability spelling; do not prescribe that mechanism for Python.  |
| `@typescript-eslint/prefer-namespace-keyword`        | TypeScript-only legacy namespace or reference syntax; use native modules in other languages.                                             |
| `@typescript-eslint/triple-slash-reference`          | TypeScript-only legacy namespace or reference syntax; use native modules in other languages.                                             |
| `no-new-native-nonconstructor`                       | JavaScript grammar or object-runtime mechanism; use the target language’s valid syntax and runtime model.                                |
| `no-nonoctal-decimal-escape`                         | JavaScript grammar or object-runtime mechanism; use the target language’s valid syntax and runtime model.                                |
| `no-obj-calls`                                       | JavaScript grammar or object-runtime mechanism; use the target language’s valid syntax and runtime model.                                |
| `no-octal`                                           | JavaScript grammar or object-runtime mechanism; use the target language’s valid syntax and runtime model.                                |
| `no-prototype-builtins`                              | JavaScript grammar or object-runtime mechanism; use the target language’s valid syntax and runtime model.                                |
| `no-var`                                             | JavaScript grammar or object-runtime mechanism; use the target language’s valid syntax and runtime model.                                |
| `no-with`                                            | JavaScript grammar or object-runtime mechanism; use the target language’s valid syntax and runtime model.                                |
| `prefer-rest-params`                                 | JavaScript grammar or object-runtime mechanism; use the target language’s valid syntax and runtime model.                                |
| `prefer-spread`                                      | JavaScript grammar or object-runtime mechanism; use the target language’s valid syntax and runtime model.                                |
| `react-doctor/forward-ref-uses-ref`                  | React/JSX or a specific renderer/compiler API contract; keep its enabled implementation rule, without prescribing that syntax in Python. |
| `react-doctor/hook-import-rename-loses-use-prefix`   | React/JSX or a specific renderer/compiler API contract; keep its enabled implementation rule, without prescribing that syntax in Python. |
| `react-doctor/ink-no-dom-host-elements`              | React/JSX or a specific renderer/compiler API contract; keep its enabled implementation rule, without prescribing that syntax in Python. |
| `react-doctor/ink-no-dom-router`                     | React/JSX or a specific renderer/compiler API contract; keep its enabled implementation rule, without prescribing that syntax in Python. |
| `react-doctor/ink-no-layout-inside-text`             | React/JSX or a specific renderer/compiler API contract; keep its enabled implementation rule, without prescribing that syntax in Python. |
| `react-doctor/ink-no-raw-text`                       | React/JSX or a specific renderer/compiler API contract; keep its enabled implementation rule, without prescribing that syntax in Python. |
| `react-doctor/jsx-no-comment-textnodes`              | React/JSX or a specific renderer/compiler API contract; keep its enabled implementation rule, without prescribing that syntax in Python. |
| `react-doctor/jsx-no-jsx-as-prop`                    | React/JSX or a specific renderer/compiler API contract; keep its enabled implementation rule, without prescribing that syntax in Python. |
| `react-doctor/no-call-component-as-function`         | React/JSX or a specific renderer/compiler API contract; keep its enabled implementation rule, without prescribing that syntax in Python. |
| `react-doctor/no-default-props`                      | React/JSX or a specific renderer/compiler API contract; keep its enabled implementation rule, without prescribing that syntax in Python. |
| `react-doctor/no-namespace`                          | React/JSX or a specific renderer/compiler API contract; keep its enabled implementation rule, without prescribing that syntax in Python. |
| `react-doctor/no-render-return-value`                | React/JSX or a specific renderer/compiler API contract; keep its enabled implementation rule, without prescribing that syntax in Python. |
| `react-doctor/no-string-refs`                        | React/JSX or a specific renderer/compiler API contract; keep its enabled implementation rule, without prescribing that syntax in Python. |
| `react-doctor/no-this-in-sfc`                        | React/JSX or a specific renderer/compiler API contract; keep its enabled implementation rule, without prescribing that syntax in Python. |
| `react-doctor/rules-of-hooks`                        | React/JSX or a specific renderer/compiler API contract; keep its enabled implementation rule, without prescribing that syntax in Python. |
| `react-doctor/style-prop-object`                     | React/JSX or a specific renderer/compiler API contract; keep its enabled implementation rule, without prescribing that syntax in Python. |
| `react-doctor/void-dom-elements-no-children`         | React/JSX or a specific renderer/compiler API contract; keep its enabled implementation rule, without prescribing that syntax in Python. |
| `react-hooks/config`                                 | React/JSX or a specific renderer/compiler API contract; keep its enabled implementation rule, without prescribing that syntax in Python. |
| `react-hooks/gating`                                 | React/JSX or a specific renderer/compiler API contract; keep its enabled implementation rule, without prescribing that syntax in Python. |
| `react-hooks/rules-of-hooks`                         | React/JSX or a specific renderer/compiler API contract; keep its enabled implementation rule, without prescribing that syntax in Python. |
| `react-hooks/unsupported-syntax`                     | React/JSX or a specific renderer/compiler API contract; keep its enabled implementation rule, without prescribing that syntax in Python. |
| `unicorn/class-reference-in-static-methods`          | JavaScript-specific module, receiver, primitive, constructor, or interoperability spelling; do not prescribe that mechanism for Python.  |
| `unicorn/consistent-export-decorator-position`       | JavaScript-specific module, receiver, primitive, constructor, or interoperability spelling; do not prescribe that mechanism for Python.  |
| `unicorn/default-export-style`                       | JavaScript-specific module, receiver, primitive, constructor, or interoperability spelling; do not prescribe that mechanism for Python.  |
| `unicorn/new-for-builtins`                           | JavaScript-specific module, receiver, primitive, constructor, or interoperability spelling; do not prescribe that mechanism for Python.  |
| `unicorn/no-array-method-this-argument`              | JavaScript-specific module, receiver, primitive, constructor, or interoperability spelling; do not prescribe that mechanism for Python.  |
| `unicorn/no-exports-in-scripts`                      | JavaScript-specific module, receiver, primitive, constructor, or interoperability spelling; do not prescribe that mechanism for Python.  |
| `unicorn/no-named-default`                           | JavaScript-specific module, receiver, primitive, constructor, or interoperability spelling; do not prescribe that mechanism for Python.  |
| `unicorn/no-new-buffer`                              | JavaScript-specific module, receiver, primitive, constructor, or interoperability spelling; do not prescribe that mechanism for Python.  |
| `unicorn/no-null`                                    | JavaScript-specific module, receiver, primitive, constructor, or interoperability spelling; do not prescribe that mechanism for Python.  |
| `unicorn/no-thenable`                                | JavaScript-specific module, receiver, primitive, constructor, or interoperability spelling; do not prescribe that mechanism for Python.  |
| `unicorn/no-this-assignment`                         | JavaScript-specific module, receiver, primitive, constructor, or interoperability spelling; do not prescribe that mechanism for Python.  |
| `unicorn/no-this-outside-of-class`                   | JavaScript-specific module, receiver, primitive, constructor, or interoperability spelling; do not prescribe that mechanism for Python.  |
| `unicorn/no-typeof-undefined`                        | JavaScript-specific module, receiver, primitive, constructor, or interoperability spelling; do not prescribe that mechanism for Python.  |
| `unicorn/no-unnecessary-global-this`                 | JavaScript-specific module, receiver, primitive, constructor, or interoperability spelling; do not prescribe that mechanism for Python.  |
| `unicorn/prefer-bigint-literals`                     | JavaScript-specific module, receiver, primitive, constructor, or interoperability spelling; do not prescribe that mechanism for Python.  |
| `unicorn/prefer-global-number-constants`             | JavaScript-specific module, receiver, primitive, constructor, or interoperability spelling; do not prescribe that mechanism for Python.  |
| `unicorn/prefer-global-this`                         | JavaScript-specific module, receiver, primitive, constructor, or interoperability spelling; do not prescribe that mechanism for Python.  |
| `unicorn/prefer-identifier-import-export-specifiers` | JavaScript-specific module, receiver, primitive, constructor, or interoperability spelling; do not prescribe that mechanism for Python.  |
| `unicorn/prefer-node-protocol`                       | JavaScript-specific module, receiver, primitive, constructor, or interoperability spelling; do not prescribe that mechanism for Python.  |
| `unicorn/prefer-number-properties`                   | JavaScript-specific module, receiver, primitive, constructor, or interoperability spelling; do not prescribe that mechanism for Python.  |
| `unicorn/prefer-prototype-methods`                   | JavaScript-specific module, receiver, primitive, constructor, or interoperability spelling; do not prescribe that mechanism for Python.  |
| `unicorn/prefer-reflect-apply`                       | JavaScript-specific module, receiver, primitive, constructor, or interoperability spelling; do not prescribe that mechanism for Python.  |
| `unicorn/require-module-attributes`                  | JavaScript-specific module, receiver, primitive, constructor, or interoperability spelling; do not prescribe that mechanism for Python.  |
| `unicorn/require-module-specifiers`                  | JavaScript-specific module, receiver, primitive, constructor, or interoperability spelling; do not prescribe that mechanism for Python.  |
| `unicorn/throw-new-error`                            | JavaScript-specific module, receiver, primitive, constructor, or interoperability spelling; do not prescribe that mechanism for Python.  |
| `valid-typeof`                                       | JavaScript grammar or object-runtime mechanism; use the target language’s valid syntax and runtime model.                                |

### Maintain the inventory when the configuration changes

Recalculate the effective union after an authorized preset, dependency, file-pattern, or override change. Read the installed rule metadata and implementation when its semantics or defaults are unclear. Map every newly enabled warning/error ID to a concept and a TypeScript example, or give a specific language/framework-only exclusion. Review changed options as well as rule presence: a source ID alone does not prove a concept is enforced in every file or context. Keep the mixed-list convention explicit even when the formatter cannot enforce it.
