import { defineHook } from "soubi";

export default defineHook({
  id: "lint-format-edited-files",
  description: "Format edited JS/TS files and report remaining diagnostics.",
  event: "PostToolUse",
  matcher: "^(Write|Edit|MultiEdit|apply_patch)$",
  handler: {
    type: "command",
    command:
      'if command -v bun >/dev/null 2>&1; then bun "${PLUGIN_ROOT}/scripts/post-edit.ts"; else printf \'%s\\n\' \'{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"Bun is not installed. Please install Bun to enable the engineering edit hook."}}\'; fi',
    timeoutMs: 30000,
  },
});
