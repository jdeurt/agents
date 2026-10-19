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
