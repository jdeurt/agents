---
name: publishing
description: "Use when publishing, validating, or troubleshooting releases of the jdeurt/agents marketplace. Explain and verify the transformations from authored sources to the marketplace branch and client installation."
---

# Publishing

Work in a `jdeurt/agents` checkout. Read `AGENTS.md`, `marketplace.toml`, `scripts/publish-marketplace.ts`, and `.github/workflows/marketplace.yml` for the current release configuration. Use `jdeurt-meta:importing` when the task changes import declarations or policies; keep that workflow separate from publishing.

## What gets published

`main` holds authored plugin content, configuration, and import markers. Generated files stay in ignored or temporary build directories until published to `marketplace`. Publication never commits back to `main`.

The build and publisher perform these transformations:

1. Resolve imports into temporary sources and apply their declared inclusion policies. See `jdeurt-meta:importing` for the import controls and omission notices.
2. Compile shared skills and MCP declarations for each configured client. Preserve validated skill metadata; omit Claude-only `allowed-tools` and `user-invocable` fields in compiled Codex skills. Translate explicit invocation policy into the client's supported metadata.
3. Generate client manifests and MCP declarations from packaging configuration. Authored `plugins/` files contain portable content, with no client manifests, icons, or OpenAI UI metadata. Whole imported native plugins retain their supported client structures after policy filtering.
4. Prefix built plugin identifiers with `jdeurt-`. Source `meta` becomes `jdeurt-meta`; a skill reference is `jdeurt-meta:importing`. The colon separates plugin and skill and cannot appear inside the plugin name. References written in source skills already use the final prefixed namespace; the build does not rewrite arbitrary prose or scripts.
5. Generate catalogs with repository-relative paths to each compiled client/plugin directory. Preserve hidden manifests and supporting resources.
6. Verify the build against the same resolved imports, then publish the generated tree and README as a single parentless `marketplace` commit. Skip an identical tree. Check the source revision and use a force-with-lease to reject concurrent changes.

## Validate and release

```sh
bun install --frozen-lockfile --ignore-scripts
bun run lint
bun run check-types
bun run format:check
bun run imports:check
bun run build
bun run check
bun test
bun run publish:marketplace -- --dry-run
```

Inspect generated catalogs, skill resources, omission notes, names, licenses, MCP connections, and client-specific output. A build check validates packaging, not the behavior of every skill or external service. Changed plugin content receives a new patch version unless the authored version is newer; unchanged content retains its version. The publisher stores hashes and versions in generated `.publication.json` on `marketplace`, keeping nightly import updates visible to client caches.

CI runs after source pushes, nightly, and on manual dispatch. It publishes only after checks pass, using GitHub's Actions token with content-write permission, then smoke-tests installation from the published branch in Codex. Verify the publish job and installation result before reporting success.

For an authorized manual release, use `bun run publish:marketplace` from a clean checkout at current `origin/main`, with Git push access. Never commit credentials. Resolve failures in source or configuration and rerun the relevant checks. Never merge `marketplace` into `main`; its history is intentionally separate. GitHub has no artifact-branch setting that guarantees suppression of merge suggestions.

ChatGPT Web workspace imports accept the repository URL and a separate `marketplace` branch selection. Imported MCP declarations make a plugin desktop-only, including remote servers. Generate registered-app references in the publishing pipeline when adding Web integrations. See `docs/maintenance.md` for setup and current restrictions. Do not claim Web import, connector authentication, or skill behavior was tested merely because desktop installation succeeded.