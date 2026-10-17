import { mkdtemp, mkdir, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { git } from "./git.ts";
import { writeFile } from "./io.ts";

export async function withImportFixture<T>(
  use: (upstream: string) => Promise<T>
) {
  const upstream = await realpath(
    await mkdtemp(path.join(tmpdir(), "agents-upstream-test-"))
  );
  const keys = [
    "GIT_CONFIG_COUNT",
    "GIT_CONFIG_KEY_0",
    "GIT_CONFIG_VALUE_0",
    "GIT_CONFIG_KEY_1",
    "GIT_CONFIG_VALUE_1",
  ];
  const previous = keys.map((key) => process.env[key]);
  try {
    await mkdir(path.join(upstream, "skills/shadcn"), { recursive: true });
    await writeFile(
      path.join(upstream, "skills/shadcn/SKILL.md"),
      "---\nname: shadcn\ndescription: Test imported skill.\nallowed-tools: Read\n---\nImported instructions.\n"
    );
    await writeFile(path.join(upstream, "LICENSE.md"), "Fixture license\n");
    await mkdir(path.join(upstream, "sample/.codex-plugin"), {
      recursive: true,
    });
    await writeFile(
      path.join(upstream, "sample/.codex-plugin/plugin.json"),
      JSON.stringify({
        name: "sample",
        version: "1.0.0",
        hooks: "./hooks.json",
        mcpServers: "./.mcp.json",
      })
    );
    await writeFile(path.join(upstream, "sample/hooks.json"), '{"hooks":{}}\n');
    await writeFile(
      path.join(upstream, "sample/.mcp.json"),
      '{"docs":{"url":"https://example.com/mcp"}}\n'
    );
    await writeFile(path.join(upstream, "LICENSE"), "Fixture license\n");
    for (const manifest of [
      "plugin.json",
      ".codex-plugin/plugin.json",
      ".claude-plugin/plugin.json",
    ]) {
      await Bun.write(
        path.join(upstream, manifest),
        JSON.stringify({
          name: "cloudflare",
          version: "1.0.2",
          skills: "./skills/",
        })
      );
    }
    git(upstream, ["init", "-b", "trunk"]);
    git(upstream, ["config", "user.name", "Test"]);
    git(upstream, ["config", "user.email", "test@example.com"]);
    git(upstream, ["add", "."]);
    git(upstream, ["commit", "-m", "Fixture"]);
    process.env.GIT_CONFIG_COUNT = "2";
    process.env.GIT_CONFIG_KEY_0 = `url.file://${upstream}.insteadOf`;
    process.env.GIT_CONFIG_VALUE_0 = "https://github.com/shadcn-ui/ui.git";
    process.env.GIT_CONFIG_KEY_1 = `url.file://${upstream}.insteadOf`;
    process.env.GIT_CONFIG_VALUE_1 = "https://github.com/cloudflare/skills.git";
    return await use(upstream);
  } finally {
    for (const [i, key] of keys.entries()) {
      if (previous[i] === undefined) delete process.env[key];
      else process.env[key] = previous[i];
    }
    await rm(upstream, { recursive: true, force: true });
  }
}
