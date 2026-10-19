import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

test("text formatting uses ESLint's Prettier options and leaves source files to ESLint", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "agents-format-text-"));
  try {
    await writeFile(path.join(root, "README.md"), "# Title\n\nA    paragraph\n");
    await writeFile(path.join(root, "settings.toml"), "answer=42\n");
    await writeFile(path.join(root, "source.js"), "const value=1\n");
    const git = (...args: string[]) => Bun.spawnSync(["git", ...args], { cwd: root });
    expect(git("init", "-q").exitCode).toBe(0);
    expect(git("add", ".").exitCode).toBe(0);
    await writeFile(path.join(root, "notes.md"), "# Notes\n\nAn    untracked note\n");
    const format = (mode: string) =>
      Bun.spawnSync([process.execPath, path.resolve("scripts/format-text.ts"), mode], { cwd: root });
    const check = format("--check");
    expect(check.exitCode).toBe(1);
    expect(check.stdout.toString()).toContain("settings.toml");
    expect(check.stdout.toString()).toContain("notes.md");
    expect(format("--write").exitCode).toBe(0);
    expect(format("--check").exitCode).toBe(0);
    expect(await readFile(path.join(root, "settings.toml"), "utf8")).toBe("answer = 42\n");
    expect(await readFile(path.join(root, "source.js"), "utf8")).toBe("const value=1\n");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
