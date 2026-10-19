# Engineering review

After completing each distinct feature or bug fix, review the project with the jscpd CLI. Use `npx -y jscpd@5 --semantic-download` once to cache its local embedding model. Then run:

```sh
npx -y jscpd@5 . --reporters ai --ignore-identifiers --ignore-literals --ignore-annotations --max-gap-lines 2 --similarity=0.8 --semantic
npx -y jscpd@5 . --dead-code --dead-code-categories all --min-confidence 0 --include-tests --include-entry-exports --reporters ai
```

Review exact, renamed, near-miss, semantic, and dead-code findings involving the feature or fix. Inspect both sides of a plausible clone before refactoring, and rerun the relevant scan after resolving it.

Static analysis can miss dynamic use, framework entry points, and callers outside the scanned project; inspect the code before deleting it. Rust dead-code analysis requires compiler diagnostics supplied to jscpd; do not run project build scripts merely to obtain them.

Do this at the end of each logical change, even when one task contains several features or fixes. Do not run a whole-project scan after every individual file edit. The clone scan covers all supported formats; do not narrow it to JavaScript or TypeScript. Dead-code detection covers the languages jscpd documents for that mode. A semantic match is a review lead, not proof that two functions can be merged. If the semantic model or CLI is unavailable, report that the review could not run.
