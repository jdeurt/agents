# Proposal: explicit effect boundaries

This is an opt-in policy for review. The shared ESLint configuration does not enable these rules.
Prioritize low false positives. Missed effects are acceptable. A clean result does not establish purity.

An effect reads or changes externally observable state. Examples include network requests, filesystem access, logging, and input mutation.
A pure computation produces a result from its inputs without these operations.
An orchestration function coordinates effects and computations. It can contain control flow, validation, retries, and resource cleanup.
The proposal does not require an effectful function to be a trivial wrapper.

## Enable a scoped trial

Copy the complete JavaScript policy bundle, including the `eslint-effects/` directory.
Append this entry to a project's flat configuration after explicit approval to adopt the proposal:

```ts
{
  files: ["src/**/*.{js,jsx,ts,tsx}"],
  rules: {
    "jdeurt/name-effects": "warn",
    "jdeurt/separate-effects": "warn",
  },
}
```

The shared configuration already registers the `jdeurt` plugin.
For standalone use, import `eslint-rules.ts` and register it as `plugins: { jdeurt: policy }`.
Use a JavaScript or TypeScript parser appropriate to the target files.
Neither rule needs type information. Neither rule provides an automatic fix.
With `--max-warnings 0`, warnings still fail the lint command. Choose the trial scope deliberately.

## Recognized effects

Both rules use the same detector. Each function owns its direct evidence.
Nested function bodies do not contribute effects to the enclosing function.
Class bodies form a boundary too, because instance field initializers need not execute when the class is defined.

| Signal          | Scope                                                                                                                                                                             |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ambient calls   | Explicit paths such as `fetch`, `console.log`, `localStorage.getItem`, `navigator.sendBeacon`, `process.exit`, and `Bun.write`.                                                   |
| Node imports    | Explicit filesystem and child-process exports from `fs`, `fs/promises`, and `child_process`, with or without `node:`. Named aliases, namespace imports, and default imports work. |
| Input writes    | Assignment, increment, decrement, or `delete` through a direct parameter's property chain. Reassigning the parameter itself does not qualify.                                     |
| Module writes   | Assignment, increment, decrement, or `delete` to a resolved module/global binding or its property chain.                                                                          |
| Instance writes | Assignment, increment, decrement, or `delete` through `this`.                                                                                                                     |

See [the detector vocabulary](javascript/eslint-effects/vocabulary.ts) for the complete ambient and Node operation lists.
Lexically shadowed ambient names do not match. A method named `write`, `send`, or `save` on an arbitrary object is insufficient evidence.

Local bindings and aliases remain unknown, including local objects allocated in the enclosing function.
This avoids reporting local construction, sorting, accumulator updates, and parser cursors as proven external effects.
It also misses escaped closures and local aliases of external objects. This is an intentional precision tradeoff.

## `jdeurt/name-effects`

A function with recognized effects must contain an accepted effect word in its name.
The matcher splits camelCase, PascalCase, acronyms, and snake_case into lowercase words.
It matches complete words. For example, `dispatch` does not match `patch`, and `storefront` does not match `store`.

The default vocabulary contains operation verbs and lifecycle verbs such as `fetch`, `write`, `update`, `start`, `close`, and `publish`.
A matching word from any vocabulary category is sufficient. A name need not enumerate every secondary effect.
This is a convention check. It does not prove that a name describes the exact operation, direction, or resource.
For example, a storage-writing function named `fetchRows` passes the vocabulary check and still needs human review.
The category lists group suggestions, rather than restrict which words can match.

The rule checks declarations, directly bound function expressions/arrows, class methods, and function-valued class fields.
It skips anonymous callbacks, inferred object-literal property names, constructors, getters, setters, and computed property names.
An explicitly named function expression retains its own name, including when used as a callback.
Framework and interface contracts can constrain other names too. Review these diagnostics before changing an API.

```ts
// Report: the direct network request is hidden by a vague name.
async function resolveRows() {
  return fetch("/rows");
}

// Accept: an effect word communicates the operation.
async function fetchRows() {
  return fetch("/rows");
}

// Accept: lifecycle naming permits orchestration and secondary logging.
async function refreshRows() {
  const response = await fetch("/rows");
  console.log(response.status);
  return response;
}
```

React follows the same rules. `handleSend` with a direct `fetch` passes. `handleClick` with that call reports.
`handle`, `on`, and `use` alone do not describe a concrete effect.
An anonymous `useEffect` callback does not make the enclosing component or custom hook effectful under this analysis.
React setter calls, effect hooks, and `useCallback` return values are not inferred.
A ref captured from an enclosing hook is also unknown. These omissions prevent framework-specific guesses from becoming errors.

## `jdeurt/separate-effects`

A named function with recognized effects reports when either condition applies:

- Its first name word is `calculate`, `compute`, or `derive`.
- It directly returns arithmetic with at least two operators and a reference to one of its plain parameters.

The arithmetic grammar accepts number/string literals, resolved plain parameters, and `+`, `-`, `*`, `/`, `%`, and `**`.
It excludes calls, member access, local aliases, destructuring/default parameters, comparisons, and conditional expressions.
A return such as `attempt + 1` is too small to qualify. A return using only constants does not qualify.
Shadowed parameters do not qualify. This grammar identifies extraction candidates, not proven pure expressions.
JavaScript coercion and mutated parameter values still require review.

`parse`, `validate`, `normalize`, and `serialize` are not default computation contracts.
Real parsers can own mutable cursors. Validation can read files or contact a server.
Serializing work can mean scheduling it. These words produced ambiguous suggestions during repository evaluation.

```ts
// Report both rules: a computation-oriented name contains input mutation.
function calculateTotal(order) {
  order.total = order.price * order.quantity;
}

// A possible refactor, when preserving this boundary serves the caller:
function calculateTotal(price, quantity) {
  return price * quantity;
}

function updateTotal(order) {
  order.total = calculateTotal(order.price, order.quantity);
}
```

The rule does not establish that a function contains substantial computation from its name alone.
Do not create a meaningless helper just to silence it. A clearer name or a justified suppression can be appropriate.
Returning an I/O result, checking its status, and handling failures do not by themselves trigger separation.

## Configuration

Each rule accepts the same optional object. Configure both when their interpretation must agree:

```ts
const effectOptions = {
  vocabulary: {
    // Replace this category's default list. Other categories remain available.
    orchestration: ["start", "stop", "refresh", "publish"],
    audit: ["audit", "record"],
  },
  // Exact unbound/ambient paths only. Lexical bindings still take precedence.
  globalCalls: { "auditSink.append": "audit" },
  // Replace the default computation-contract prefixes. [] disables that signal.
  computationNames: ["calculate", "compute", "derive"],
};
```

Vocabulary lists contain lowercase alphabetic words. Matching remains case-insensitive through name tokenization.
Each supplied category replaces that category's defaults. New categories extend the vocabulary.
A category list must contain at least one word. To change acceptance across categories, replace each relevant list.
The full defaults are exported from [vocabulary.ts](javascript/eslint-effects/vocabulary.ts).

`globalCalls` maps exact dotted paths to category labels. A configured entry can replace a built-in call's category.
It does not match imports, local bindings, computed access, wildcards, or regular expressions.
Use a vocabulary entry for each custom category to obtain useful naming suggestions.
`computationNames` replaces the default first-word list. An empty list leaves the arithmetic signal enabled.

## Respond to a diagnostic

Read the named operation and the surrounding code. Preserve evaluation order, error behavior, API contracts, and resource ownership.
Extract a computation when it creates a useful boundary. Name effect orchestration explicitly when the API permits renaming.
If the diagnostic does not apply, suppress that specific rule with a meaningful reason:

```ts
// eslint-disable-next-line jdeurt/name-effects -- The host API requires this exported handler name.
export async function handler() {
  return fetch("/rows");
}
```

Both messages include this refactor-or-explain instruction. The plugin does not validate suppression prose.
Do not add a file-wide disable or weaken unrelated strict TypeScript and lint rules to accommodate this proposal.

## Known limits

The analysis has no call graph, alias analysis, escape analysis, type-based effect model, or control-flow reachability check.
It misses wrappers, CommonJS/dynamic imports, re-exports, computed calls, timers, streams, database clients, DOM APIs, and most Bun APIs.
It does not classify array/Map/Set mutator calls, because method spelling does not establish the receiver's semantics.
It misses destructuring assignment targets and writes through aliases, TS assertion wrappers, or captured function-local bindings.
It skips class initializer effects, top-level effects, anonymous functions, inferred object-literal callbacks, and functions hidden behind higher-order wrappers.
Nested effects do not propagate, even through an immediately invoked callback.

Unreachable code can report. Overridden ambient implementations can disagree with the standard operation assumed by the detector.
Input mutation can be intentional, including a helper receiving a fresh object from its caller.
Mutable instance methods can implement pure overall transformations on a newly allocated instance.
An interface can require a name outside the vocabulary. These cases need review or a specific suppression.

The vocabulary accepts some misleading names and rejects some clear domain terms.
The separation rule deliberately misses most mixed computation and orchestration.
The [evaluation report](effect-boundaries-evaluation.md) records the trial scope and observed limitations in the source repository.
