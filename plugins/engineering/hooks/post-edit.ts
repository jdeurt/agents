import { defineHook } from "soubi";

export default defineHook({
  id: "lint-format-edited-files",
  description: "Format edited JS/TS files and report remaining diagnostics.",
  event: "PostToolUse",
  matcher: "^(Write|Edit|MultiEdit|apply_patch)$",
  handler: {
    type: "command",
    command: 'bun "${PLUGIN_ROOT}/scripts/post-edit.ts"',
    timeoutMs: 30000,
  },
});
