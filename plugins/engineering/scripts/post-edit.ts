import { dependencyRoot } from "./post-edit-deps.ts";
import path from "node:path";
import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";

const MAX_SETUP_ERROR_CHARS = 220;
const MAX_CAPTURED_OUTPUT_CHARS = 16_000;
const MAX_EVENT_BYTES = 256_000;
const HOOK_TIMEOUT_MS = 75_000;
const MAX_AGENT_CONTEXT_CHARS = 12_000;

// Keep the host hook successful even if a linter crashes or exceeds its budget.
const input = readFileSync(0, "utf8");
let root: string | undefined;

try {
  root = await dependencyRoot();
} catch (error) {
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: `Edit lint hook setup failed: ${String(error).slice(0, MAX_SETUP_ERROR_CHARS)}`,
      },
    })
  );
}

if (root) {
  const script = path.join(root, "scripts", "post-edit-core.ts");
  const runner = path.join(root, "node_modules", "tsx", "dist", "cli.mjs");
  const child = spawn(process.execPath, [runner, script], {
    env: { ...process.env, JDEURT_EDIT_LINT_ACTIVE: "1", JDEURT_HOOK_DEPS_ROOT: root },
    stdio: ["pipe", "pipe", "pipe"],
  });
  let output = "";
  let errors = "";
  child.stdout.on("data", (chunk: Buffer) => {
    if (output.length < MAX_CAPTURED_OUTPUT_CHARS) {
      output += chunk.toString();
    }
  });
  child.stderr.on("data", (chunk: Buffer) => {
    if (errors.length < MAX_CAPTURED_OUTPUT_CHARS) {
      errors += chunk.toString();
    }
  });
  child.stdin.end(input.slice(0, MAX_EVENT_BYTES));
  const timer = setTimeout(() => child.kill("SIGKILL"), HOOK_TIMEOUT_MS);
  const status = await new Promise<number | null>((resolve) => child.on("close", resolve));
  clearTimeout(timer);

  if (status === null) {
    output = "Edit lint hook timed out.";
  } else if (status !== 0) {
    const reason = errors
      .split("\n")
      .map((line) => line.trim())
      .find((line) => /(?:Error:|error:|not found|unsupported)/i.test(line));
    output = `Edit lint hook unavailable: ${(reason ?? `process exited ${String(status)}`).slice(0, MAX_SETUP_ERROR_CHARS)}`;
  }

  if (output.trim()) {
    console.log(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PostToolUse",
          additionalContext: output.slice(0, MAX_AGENT_CONTEXT_CHARS),
        },
      })
    );
  }
}
