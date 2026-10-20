/**
Run Git in a working directory and reject an unsuccessful exit.
@param cwd - Working directory for the Git process.
@param args - Arguments to pass directly to Git.
@returns The trimmed command output.
*/
export function git(cwd: string, args: string[]): string {
  const result = Bun.spawnSync(["git", ...args], {
    cwd,
    env: { ...process.env },
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
  });

  if (result.exitCode !== 0) {
    throw Object.assign(new Error(result.stderr.toString().trim() || `git exited ${String(result.exitCode)}`), {
      code: result.exitCode,
    });
  }

  return result.stdout.toString().trim();
}
