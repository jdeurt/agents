import { mkdir, mkdtemp, realpath, rm } from "node:fs/promises";
import { git } from "./git.ts";
import path from "node:path";
import { tmpdir } from "node:os";
import { writeFile } from "./io.ts";
const SKILLS_SHADCN = "skills/shadcn";
const SKILLS_SHADCN_SKILL_MD = "skills/shadcn/SKILL.md";
const NAME_SHADCN_DESCRIPTION_TEST_IMPORTED_SKILL_ALLOWED =
  "---\nname: shadcn\ndescription: Test imported skill.\nallowed-tools: Read\n---\nImported instructions.\n";
const LICENSE_MD = "LICENSE.md";
const FIXTURE_LICENSE = "Fixture license\n";
const SAMPLE_CODEX_PLUGIN = "sample/.codex-plugin";
const SAMPLE_CODEX_PLUGIN_PLUGIN_JSON = "sample/.codex-plugin/plugin.json";
const SAMPLE = "sample";
const VALUE_1_0_0 = "1.0.0";
const HOOKS_JSON = "./hooks.json";
const MCP_JSON = "./.mcp.json";
const SAMPLE_HOOKS_JSON = "sample/hooks.json";
const HOOKS = '{"hooks":{}}\n';
const SAMPLE_MCP_JSON = "sample/.mcp.json";
const DOCS_URL_HTTPS_EXAMPLE_COM_MCP = '{"docs":{"url":"https://example.com/mcp"}}\n';
const LICENSE_2 = "LICENSE";
const JSCPD = "jscpd";
const DRY_REFACTORING = "dry-refactoring";
const CODEBASE_REFACTORING = "codebase-refactoring";
const COMPARE_CODEBASES = "compare-codebases";
const CODE_MIGRATION = "code-migration";
const SKILLS = "skills";
const SKILL_MD = "SKILL.md";
const PLUGIN_JSON = "plugin.json";
const CODEX_PLUGIN_PLUGIN_JSON = ".codex-plugin/plugin.json";
const CLAUDE_PLUGIN_PLUGIN_JSON = ".claude-plugin/plugin.json";
const CLOUDFLARE = "cloudflare";
const VALUE_1_0_2 = "1.0.2";
const SKILLS_2 = "./skills/";
const INIT = "init";
const TRUNK = "trunk";
const CONFIG = "config";
const USER_NAME = "user.name";
const TEST = "Test";
const USER_EMAIL = "user.email";
const TEST_EXAMPLE_COM = "test@example.com";
const ADD = "add";
const COMMIT = "commit";
const FIXTURE = "Fixture";
const HTTPS_GITHUB_COM_SHADCN_UI_UI_GIT = "https://github.com/shadcn-ui/ui.git";
const HTTPS_GITHUB_COM_CLOUDFLARE_SKILLS_GIT = "https://github.com/cloudflare/skills.git";
const HTTPS_GITHUB_COM_KUCHERENKO_JSCPD_GIT = "https://github.com/kucherenko/jscpd.git";
const AGENTS_UPSTREAM_TEST = "agents-upstream-test-";

function fixtureSkill(name: string) {
  const contents = `---\nname: ${name}\ndescription: Fixture skill for jscpd.\n---\n\nScan all supported formats.\n`;

  return contents;
}

async function prepareFixture(upstream: string) {
  const gitRewrite = `url.file://${upstream}.insteadOf`;
  await mkdir(path.join(upstream, SKILLS_SHADCN), { recursive: true });
  await writeFile(path.join(upstream, SKILLS_SHADCN_SKILL_MD), NAME_SHADCN_DESCRIPTION_TEST_IMPORTED_SKILL_ALLOWED);
  await writeFile(path.join(upstream, LICENSE_MD), FIXTURE_LICENSE);
  await mkdir(path.join(upstream, SAMPLE_CODEX_PLUGIN), {
    recursive: true,
  });
  await writeFile(
    path.join(upstream, SAMPLE_CODEX_PLUGIN_PLUGIN_JSON),
    JSON.stringify({
      name: SAMPLE,
      version: VALUE_1_0_0,
      hooks: HOOKS_JSON,
      mcpServers: MCP_JSON,
    })
  );
  await writeFile(path.join(upstream, SAMPLE_HOOKS_JSON), HOOKS);
  await writeFile(path.join(upstream, SAMPLE_MCP_JSON), DOCS_URL_HTTPS_EXAMPLE_COM_MCP);
  await writeFile(path.join(upstream, LICENSE_2), FIXTURE_LICENSE);

  for (const name of [JSCPD, DRY_REFACTORING, CODEBASE_REFACTORING, COMPARE_CODEBASES, CODE_MIGRATION]) {
    await mkdir(path.join(upstream, SKILLS, name), { recursive: true });
    await writeFile(path.join(upstream, SKILLS, name, SKILL_MD), fixtureSkill(name));
  }

  for (const manifest of [PLUGIN_JSON, CODEX_PLUGIN_PLUGIN_JSON, CLAUDE_PLUGIN_PLUGIN_JSON]) {
    await Bun.write(
      path.join(upstream, manifest),
      JSON.stringify({
        name: CLOUDFLARE,
        version: VALUE_1_0_2,
        skills: SKILLS_2,
      })
    );
  }

  git(upstream, [INIT, "-b", TRUNK]);
  git(upstream, [CONFIG, USER_NAME, TEST]);
  git(upstream, [CONFIG, USER_EMAIL, TEST_EXAMPLE_COM]);
  git(upstream, [ADD, "."]);
  git(upstream, [COMMIT, "-m", FIXTURE]);
  process.env.GIT_CONFIG_COUNT = "3";
  process.env.GIT_CONFIG_KEY_0 = gitRewrite;
  process.env.GIT_CONFIG_VALUE_0 = HTTPS_GITHUB_COM_SHADCN_UI_UI_GIT;
  process.env.GIT_CONFIG_KEY_1 = gitRewrite;
  process.env.GIT_CONFIG_VALUE_1 = HTTPS_GITHUB_COM_CLOUDFLARE_SKILLS_GIT;
  process.env.GIT_CONFIG_KEY_2 = gitRewrite;
  process.env.GIT_CONFIG_VALUE_2 = HTTPS_GITHUB_COM_KUCHERENKO_JSCPD_GIT;
}

function restoreEnvironment(keys: string[], previous: (string | undefined)[]) {
  for (const [i, key] of keys.entries()) {
    if (previous[i] === undefined) {
      Reflect.deleteProperty(process.env, key);
    } else {
      process.env[key] = previous[i];
    }
  }
}

export async function withImportFixture<T>(use: (upstream: string) => Promise<T>) {
  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), AGENTS_UPSTREAM_TEST));
  const upstream = await realpath(temporaryDirectory);
  const keys = [
    "GIT_CONFIG_COUNT",
    "GIT_CONFIG_KEY_0",
    "GIT_CONFIG_VALUE_0",
    "GIT_CONFIG_KEY_1",
    "GIT_CONFIG_VALUE_1",
    "GIT_CONFIG_KEY_2",
    "GIT_CONFIG_VALUE_2",
  ];
  const previous = keys.map((key) => process.env[key]);

  try {
    await prepareFixture(upstream);

    return await use(upstream);
  } finally {
    restoreEnvironment(keys, previous);

    await rm(upstream, { recursive: true, force: true });
  }
}
