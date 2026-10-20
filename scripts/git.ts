const GIT = "git";
const IGNORE = "ignore";
const PIPE = "pipe";
export function git(cwd: string, args: string[]): string {
  const result = Bun.spawnSync([GIT, ...args], {
    cwd,
    env: { ...process.env },
    stdin: IGNORE,
    stdout: PIPE,
    stderr: PIPE,
  });

  if (result.exitCode !== 0) {
    const failure = `git exited ${String(result.exitCode)}`;

    throw Object.assign(new Error(result.stderr.toString().trim() || failure), {
      code: result.exitCode,
    });
  }

  return result.stdout.toString().trim();
}
