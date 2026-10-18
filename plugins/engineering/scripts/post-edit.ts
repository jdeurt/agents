import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Keep the host hook successful even if a linter crashes or exceeds its budget.
const input = readFileSync(0, "utf8");
const script = fileURLToPath(new URL("./post-edit-core.ts", import.meta.url));
const child = spawn("bun", [script], {
  env: { ...process.env, JDEURT_EDIT_LINT_ACTIVE: "1" },
  stdio: ["pipe", "pipe", "pipe"],
});
let output = "";
child.stdout.on("data", (chunk: Buffer) => {
  if (output.length < 16_000) output += chunk.toString();
});
child.stderr.on("data", (chunk: Buffer) => {
  if (output.length < 16_000) output += chunk.toString();
});
child.stdin.end(input.slice(0, 256_000));
const timer = setTimeout(() => child.kill("SIGKILL"), 25_000);
const status = await new Promise<number | null>((resolve) =>
  child.on("close", resolve)
);
clearTimeout(timer);
if (status === null) output = "Edit lint hook timed out.";
if (status !== 0 && !output.trim())
  output =
    "Edit lint hook could not run; check Bun and project lint dependencies.";
if (output.trim()) {
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: output.slice(0, 12_000),
      },
    })
  );
}
