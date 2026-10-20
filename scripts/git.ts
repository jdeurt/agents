export function git(cwd: string, args: string[]): string {
  const result = Bun.spawnSync(["git", ...args], {
    cwd,
    env: { ...process.env },
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
  });

  if (result.exitCode !== 0) {
    const failure = `git exited ${String(result.exitCode)}`;

    throw Object.assign(new Error(result.stderr.toString().trim() || failure), {
      code: result.exitCode,
    });
  }

  return result.stdout.toString().trim();
}
