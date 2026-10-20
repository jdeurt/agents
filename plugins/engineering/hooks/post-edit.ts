import { defineHook } from "soubi";

const hook = defineHook({
  id: "lint-format-edited-files",
  description: "Format edited JS/TS files and report remaining diagnostics.",
  event: "PostToolUse",
  matcher: "^(Write|Edit|MultiEdit|apply_patch)$",
  handler: {
    type: "command",
    command:
      'if command -v npx >/dev/null 2>&1; then npx -y tsx@4.23.15 "${PLUGIN_ROOT}/scripts/post-edit.ts"; else printf \'%s\\n\' \'{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"npx is not installed. Please install Node.js and npm to enable the engineering edit hook."}}\'; fi',
    timeoutMs: 80_000,
  },
});

export default hook;
