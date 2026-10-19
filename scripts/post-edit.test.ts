import { afterEach, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { editedPaths, run } from "../plugins/engineering/scripts/post-edit-core.ts";
import PRETTIER_DEFAULTS from "../prettier.config.mjs";
import { createConfig } from "../eslint.config.ts";
import reactHooks from "eslint-plugin-react-hooks";
import reactDoctor from "eslint-plugin-react-doctor";
import * as z from "zod/mini";

const roots: string[] = [];
const deps = path.resolve("node_modules");
process.env.JDEURT_HOOK_DEPS_ROOT = process.cwd();

test("bundled formatting defaults use a 120-column width", () => {
  expect(PRETTIER_DEFAULTS.printWidth).toBe(120);
});

test("shared policy enables the requested modern rules at their chosen severities", () => {
  const config = createConfig({ hook: true });
  const common = config.find((item) => item.rules?.["unicorn/try-complexity"] === "warn");

  for (const name of [
    "no-duplicate-imports",
    "no-inner-declarations",
    "no-self-compare",
    "no-unreachable-loop",
    "no-use-before-define",
    "complexity",
    "eqeqeq",
    "no-lonely-if",
    "no-magic-numbers",
    "no-shadow",
    "prefer-const",
    "sort-imports",
    "unicorn/no-repeated-call-wrappers",
    "unicorn/try-complexity",
  ])
    expect(common?.rules?.[name]).toBe("warn");

  expect(common?.rules?.["no-var"]).toBe("error");
  const typed = config.find((item) => item.rules?.["@typescript-eslint/no-shadow"]);
  expect(typed?.rules?.["@typescript-eslint/no-shadow"]).toBe("warn");
  expect(typed?.rules?.["@typescript-eslint/no-use-before-define"]).toBe("warn");
  const spacing = config.find((item) => item.rules?.["@stylistic/padding-line-between-statements"]);
  expect(spacing?.rules?.["@stylistic/padding-line-between-statements"]?.[0]).toBe("warn");
});

test("JavaScript formatting needs no repository-only TOML plugin", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "engineering-prettier-"));
  roots.push(root);
  const modules = path.join(root, "node_modules");
  await mkdir(modules);
  await symlink(path.join(deps, "prettier"), path.join(modules, "prettier"));
  await writeFile(path.join(root, "package.json"), '{"type":"module"}');
  const file = path.join(root, "plain.js");
  await writeFile(file, "const x=1\n");
  process.env.JDEURT_EDIT_LINT_ACTIVE = "1";
  const result = await run(event(root, file));
  expect(result).not.toContain("Prettier unavailable");
  expect(await readFile(file, "utf8")).toBe("const x = 1;\n");
});

test("React Hooks uses its installed modern flat preset", () => {
  const config = createConfig({ hook: true });
  const entry = config.find((item) => item.plugins?.["react-hooks"]);
  expect(entry?.rules).toBe(reactHooks.configs.flat["recommended-latest"].rules);
  expect(entry?.rules?.["react-hooks/unsupported-syntax"]).toBeDefined();
});

test("React Doctor uses its installed recommended preset", () => {
  const config = createConfig({ hook: true });
  const entry = config.find((item) => item.plugins?.["react-doctor"]);
  expect(entry?.rules).toBe(reactDoctor.configs.recommended.rules);
});

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "engineering-hook-"));
  roots.push(root);
  await symlink(deps, path.join(root, "node_modules"));
  await writeFile(path.join(root, "package.json"), '{"type":"module"}');

  return root;
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

function event(root: string, file: string) {
  return { cwd: root, tool_name: "Write", tool_input: { file_path: file } };
}

test("extracts only explicit edited JS/TS paths from batch and patch input", () => {
  expect(
    editedPaths({
      tool_name: "MultiEdit",
      tool_input: {
        edits: [
          { file_path: "a space.ts" },
          { file_path: "nested/b.mts" },
          { file_path: "dist/ignored.js" },
          { file_path: "note.md" },
        ],
      },
    })
  ).toEqual(["a space.ts", "nested/b.mts"]);
  expect(
    editedPaths({
      tool_name: "apply_patch",
      tool_input: {
        patch: "*** Add File: new.cjs\n*** Update File: path/x.tsx\n*** Delete File: old.ts",
      },
    })
  ).toEqual(["new.cjs", "path/x.tsx"]);
  expect(editedPaths({ tool_name: "Bash", tool_input: { file_path: "a.ts" } })).toEqual([]);
  expect(
    editedPaths({
      tool_name: "apply_patch",
      tool_input: { command: "*** Begin Patch\n*** Add File: /tmp/a space.mjs\n+x\n*** End Patch" },
    })
  ).toEqual(["/tmp/a space.mjs"]);
});

test("native Codex PostToolUse string response formats and reports findings", async () => {
  const root = await fixture();
  const file = path.join(root, "example.js");
  await writeFile(
    path.join(root, "eslint.config.mjs"),
    "export default [{rules:{'prefer-const':'error','no-undef':'error'}}];\n"
  );
  await writeFile(file, "let count=1;\nconsole.log(count,missing);\n");
  const result = spawnSync(process.execPath, ["plugins/engineering/scripts/post-edit-core.ts"], {
    cwd: process.cwd(),
    env: { ...process.env, JDEURT_EDIT_LINT_ACTIVE: "1" },
    input: JSON.stringify({
      cwd: root,
      tool_name: "apply_patch",
      tool_input: { command: `*** Begin Patch\n*** Add File: ${file}\n+let count=1;\n*** End Patch` },
      tool_response: `Success. Updated the following files:\nA ${file}`,
    }),
    encoding: "utf8",
  });
  expect(result.status).toBe(0);
  expect(result.stdout).toContain("Formatted/fixed; re-read file.");
  expect(result.stdout).toContain("no-undef");
  expect(result.stdout).toContain("Fix all findings caused by your edit; follow these rules in future edits.");
  expect(result.stdout).toContain("example.js:\nFormatted/fixed; re-read file.\n");
  expect(result.stdout).not.toContain(" | ");
  expect(await readFile(file, "utf8")).toBe("const count = 1;\nconsole.log(count, missing);\n");
});

test("formats a touched file, reports lint findings, and is idempotent", async () => {
  const root = await fixture();
  const file = path.join(root, "a space.js");
  const other = path.join(root, "other.js");
  await writeFile(file, "const bad =  1\nconsole.log(missing)\n");
  await writeFile(other, "const untouched=  2");
  process.env.JDEURT_EDIT_LINT_ACTIVE = "1";
  const first = await run(event(root, file));
  expect(first).toContain("Formatted/fixed; re-read file.");
  expect(first).toContain("no-undef");
  expect(await readFile(file, "utf8")).toBe("const bad = 1;\nconsole.log(missing);\n");
  expect(await readFile(other, "utf8")).toBe("const untouched=  2");
  const second = await run(event(root, file));
  expect(second).not.toContain("Formatted/fixed");
});

test("bundled ESLint autofix changes only the edited file and leaves findings nonblocking", async () => {
  const root = await fixture();
  const file = path.join(root, "fix.js");
  const other = path.join(root, "other.js");
  await writeFile(
    path.join(root, "eslint.config.mjs"),
    "export default [{rules:{'prefer-const':'error','no-undef':'error'}}];\n"
  );
  await writeFile(file, "let value=1; console.log(value,missing)\n");
  await writeFile(other, "let untouched=1\n");
  process.env.JDEURT_EDIT_LINT_ACTIVE = "1";
  const result = await run(event(root, file));
  expect(await readFile(file, "utf8")).toBe("const value = 1;\nconsole.log(value, missing);\n");
  expect(await readFile(other, "utf8")).toBe("let untouched=1\n");
  expect(result).toContain("re-read file");
  expect(result).toContain("no-undef");
});

test("TypeScript without a tsconfig reports the type-aware fallback", async () => {
  const root = await fixture();
  const file = path.join(root, "loose.ts");
  await writeFile(file, "const value= 1\n");
  process.env.JDEURT_EDIT_LINT_ACTIVE = "1";
  const result = await run(event(root, file));
  expect(result).toContain("Type-aware rules skipped: no project tsconfig");
  expect(await readFile(file, "utf8")).toBe("const value = 1;\n");
});

test("fallback respects a tsconfig that disables strict null checks", async () => {
  const root = await fixture();
  const file = path.join(root, "sample.ts");
  await writeFile(
    path.join(root, "tsconfig.json"),
    '{"compilerOptions":{"strict":false,"noEmit":true},"include":["sample.ts"]}'
  );
  await writeFile(file, "const value: any=1; value.foo()\n");
  process.env.JDEURT_EDIT_LINT_ACTIVE = "1";
  const result = await run(event(root, file));
  expect(result).toContain("project tsconfig does not enable strict null checks");
  expect(result).not.toContain("requires the `strictNullChecks` compiler option");
  expect(await Bun.file(path.join(root, "sample.js")).exists()).toBe(false);
});

test("fallback uses type-aware unsafe assertion rule with a suitable tsconfig", async () => {
  const root = await fixture();
  const file = path.join(root, "source.ts");
  await writeFile(
    path.join(root, "tsconfig.json"),
    '{"compilerOptions":{"strictNullChecks":true,"noEmit":true},"include":["source.ts"]}'
  );
  await writeFile(file, "const input: unknown = {}; const value = input as { name: string }; console.log(value)\n");
  process.env.JDEURT_EDIT_LINT_ACTIVE = "1";
  const result = await run(event(root, file));
  expect(result).toContain("@typescript-eslint/no-unsafe-type-assertion");
  expect(result).not.toContain("Type-aware rules skipped");
});

test("missing Bun produces a nonblocking installation request", async () => {
  const module = await import("../plugins/engineering/hooks/post-edit.ts");
  const hook = module.default;
  const command = hook.handler.type === "command" && hook.handler.command;

  if (typeof command !== "string") throw new TypeError("Expected command hook");

  const result = spawnSync("/bin/sh", ["-c", command], {
    env: { PATH: "/usr/bin:/bin" },
    encoding: "utf8",
  });
  expect(result.status).toBe(0);
  const response = z
    .object({ hookSpecificOutput: z.object({ additionalContext: z.string() }) })
    .parse(JSON.parse(result.stdout));
  expect(response.hookSpecificOutput.additionalContext).toContain("Please install Bun");
});

test("bundled ESLint and Prettier policy ignores project configs and emits no TS output", async () => {
  const root = await fixture();
  const file = path.join(root, "source.ts");
  await writeFile(
    path.join(root, "eslint.config.mjs"),
    "export default [{files:['**/*.ts'],rules:{'no-unused-vars':'off'}}];\n"
  );
  await writeFile(path.join(root, ".prettierrc.json"), '{"semi":false,"singleQuote":true}');
  await writeFile(path.join(root, ".prettierignore"), "source.ts\n");
  await writeFile(
    path.join(root, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: { module: "NodeNext", moduleResolution: "NodeNext", outDir: "output", strict: false },
      include: ["source.ts"],
    })
  );
  await writeFile(file, "const greeting =  'hello';\n");
  process.env.JDEURT_EDIT_LINT_ACTIVE = "1";
  const result = await run(event(root, file));
  expect(result).toContain("Formatted/fixed");
  expect(await readFile(file, "utf8")).toBe('const greeting = "hello";\n');
  expect(result).toContain("@typescript-eslint/no-unused-vars");
  expect(await Bun.file(path.join(root, "output")).exists()).toBe(false);
  expect(await readFile(path.join(root, "tsconfig.json"), "utf8")).toContain('"strict":false');
});

test("bundled ESLint policy ignores a legacy project config", async () => {
  const root = await fixture();
  const file = path.join(root, "legacy.js");
  await writeFile(
    path.join(root, ".eslintrc.json"),
    '{"root":true,"env":{"es2022":true,"node":true},"rules":{"no-unused-vars":"off"}}'
  );
  await writeFile(file, "const value=1\n");
  process.env.JDEURT_EDIT_LINT_ACTIVE = "1";
  const result = await run(event(root, file));
  expect(await readFile(file, "utf8")).toBe("const value = 1;\n");
  expect(result).toContain("no-unused-vars");
  expect(result).not.toContain("ESLint unavailable");
});

test("ignores generated, deleted, symlink-escaped and unsupported files", async () => {
  const root = await fixture();
  const outside = await mkdtemp(path.join(os.tmpdir(), "hook-outside-"));
  roots.push(outside);
  await writeFile(path.join(outside, "escape.js"), "const x=1");
  await symlink(path.join(outside, "escape.js"), path.join(root, "escape.js"));
  await mkdir(path.join(root, "dist"));
  await writeFile(path.join(root, "dist", "skip.js"), "const x=1");
  process.env.JDEURT_EDIT_LINT_ACTIVE = "1";
  expect(await run(event(root, path.join(root, "escape.js")))).toBe("");
  expect(await run(event(root, path.join(root, "missing.js")))).toBe("");
  expect(await run(event(root, path.join(root, "dist", "skip.js")))).toBe("");
  expect(await readFile(path.join(outside, "escape.js"), "utf8")).toBe("const x=1");
});

test("bundled React Doctor ESLint rules report React findings", async () => {
  const root = await fixture();
  const file = path.join(root, "View.jsx");
  await writeFile(file, 'export function View() { return <img src="/photo.png" />; }\n');
  process.env.JDEURT_EDIT_LINT_ACTIVE = "1";
  const report = await run(event(root, file));
  expect(report).toContain("react-doctor/alt-text");
  expect(report).toContain("Fix all findings caused by your edit");
});
