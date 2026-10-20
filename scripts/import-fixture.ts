import { mkdir, mkdtemp, realpath, rm } from "node:fs/promises";
import { git } from "./git.ts";
import path from "node:path";
import { tmpdir } from "node:os";
import { writeFile } from "./io.ts";

const SKILLS_SHADCN = "skills/shadcn";
const SKILLS_SHADCN_SKILL_MD = "skills/shadcn/SKILL.md";
const NAME_SHADCN_DESCRIPTION_TEST_IMPORTED_SKILL_ALLOWED =
  "---\nname: shadcn\ndescription: Test imported skill.\nallowed-tools: Read\n---\nImported instructions.\n";

const FIXTURE_LICENSE = "Fixture license\n";
const SAMPLE_CODEX_PLUGIN = "sample/.codex-plugin";
const SAMPLE_CODEX_PLUGIN_PLUGIN_JSON = "sample/.codex-plugin/plugin.json";

const HOOKS_JSON = "./hooks.json";
const MCP_JSON = "./.mcp.json";
const SAMPLE_HOOKS_JSON = "sample/hooks.json";
const HOOKS = '{"hooks":{}}\n';
const SAMPLE_MCP_JSON = "sample/.mcp.json";
const DOCS_URL_HTTPS_EXAMPLE_COM_MCP = '{"docs":{"url":"https://example.com/mcp"}}\n';

const DRY_REFACTORING = "dry-refactoring";
const CODEBASE_REFACTORING = "codebase-refactoring";
const COMPARE_CODEBASES = "compare-codebases";
const CODE_MIGRATION = "code-migration";

const PLUGIN_JSON = "plugin.json";
const CODEX_PLUGIN_PLUGIN_JSON = ".codex-plugin/plugin.json";
const CLAUDE_PLUGIN_PLUGIN_JSON = ".claude-plugin/plugin.json";

const TEST_EXAMPLE_COM = "test@example.com";

const HTTPS_GITHUB_COM_SHADCN_UI_UI_GIT = "https://github.com/shadcn-ui/ui.git";
const HTTPS_GITHUB_COM_CLOUDFLARE_SKILLS_GIT = "https://github.com/cloudflare/skills.git";
const HTTPS_GITHUB_COM_KUCHERENKO_JSCPD_GIT = "https://github.com/kucherenko/jscpd.git";
const AGENTS_UPSTREAM_TEST = "agents-upstream-test-";

const ASD_STE100_REPOSITORY = "https://github.com/danyuchn/asd-ste100-skill.git";
const ASD_STE100_FIXTURE_SKILL =
  '---\nname: asd-ste100\ndescription: Fixture STE100 skill.\nversion: "0.4.0"\n---\nImported STE100 instructions.\n';
const ASD_STE100_LINTER_PATH = "scripts/ste-lint.py";
const ASD_STE100_LINTER_SOURCE = "# Fixture structural linter.\n";

function initializeFixtureRepository(upstream: string) {
  git(upstream, ["init", "-b", "trunk"]);
  git(upstream, ["config", "user.name", "Test"]);
  git(upstream, ["config", "user.email", TEST_EXAMPLE_COM]);
  git(upstream, ["add", "."]);
  git(upstream, ["commit", "-m", "Fixture"]);
}

async function prepareAsdFixture(upstream: string) {
  const gitRewrite = `url.file://${upstream}.insteadOf`;

  await mkdir(path.join(upstream, "scripts"), { recursive: true });
  await writeFile(path.join(upstream, "SKILL.md"), ASD_STE100_FIXTURE_SKILL);
  await writeFile(path.join(upstream, ASD_STE100_LINTER_PATH), ASD_STE100_LINTER_SOURCE);
  await writeFile(path.join(upstream, "LICENSE"), FIXTURE_LICENSE);
  initializeFixtureRepository(upstream);
  process.env.GIT_CONFIG_COUNT = "4";
  process.env.GIT_CONFIG_KEY_3 = gitRewrite;
  process.env.GIT_CONFIG_VALUE_3 = ASD_STE100_REPOSITORY;
}

function fixtureSkill(name: string) {
  const contents = `---\nname: ${name}\ndescription: Fixture skill for jscpd.\n---\n\nScan all supported formats.\n`;

  return contents;
}

async function prepareFixture(upstream: string) {
  const gitRewrite = `url.file://${upstream}.insteadOf`;

  await mkdir(path.join(upstream, SKILLS_SHADCN), { recursive: true });
  await writeFile(path.join(upstream, SKILLS_SHADCN_SKILL_MD), NAME_SHADCN_DESCRIPTION_TEST_IMPORTED_SKILL_ALLOWED);
  await writeFile(path.join(upstream, "LICENSE.md"), FIXTURE_LICENSE);
  await mkdir(path.join(upstream, SAMPLE_CODEX_PLUGIN), {
    recursive: true,
  });
  await writeFile(
    path.join(upstream, SAMPLE_CODEX_PLUGIN_PLUGIN_JSON),
    JSON.stringify({
      name: "sample",
      version: "1.0.0",
      hooks: HOOKS_JSON,
      mcpServers: MCP_JSON,
    })
  );
  await writeFile(path.join(upstream, SAMPLE_HOOKS_JSON), HOOKS);
  await writeFile(path.join(upstream, SAMPLE_MCP_JSON), DOCS_URL_HTTPS_EXAMPLE_COM_MCP);
  await writeFile(path.join(upstream, "LICENSE"), FIXTURE_LICENSE);

  for (const name of ["jscpd", DRY_REFACTORING, CODEBASE_REFACTORING, COMPARE_CODEBASES, CODE_MIGRATION]) {
    await mkdir(path.join(upstream, "skills", name), { recursive: true });
    await writeFile(path.join(upstream, "skills", name, "SKILL.md"), fixtureSkill(name));
  }

  for (const manifest of [PLUGIN_JSON, CODEX_PLUGIN_PLUGIN_JSON, CLAUDE_PLUGIN_PLUGIN_JSON]) {
    await Bun.write(
      path.join(upstream, manifest),
      JSON.stringify({
        name: "cloudflare",
        version: "1.0.2",
        skills: "./skills/",
      })
    );
  }

  initializeFixtureRepository(upstream);
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
  const asdUpstream = upstream + "-asd";
  const keys = [
    "GIT_CONFIG_COUNT",
    "GIT_CONFIG_KEY_0",
    "GIT_CONFIG_VALUE_0",
    "GIT_CONFIG_KEY_1",
    "GIT_CONFIG_VALUE_1",
    "GIT_CONFIG_KEY_2",
    "GIT_CONFIG_VALUE_2",
    "GIT_CONFIG_KEY_3",
    "GIT_CONFIG_VALUE_3",
  ];
  const previous = keys.map((key) => process.env[key]);

  try {
    await prepareFixture(upstream);
    await prepareAsdFixture(asdUpstream);

    return await use(upstream);
  } finally {
    restoreEnvironment(keys, previous);

    await rm(upstream, { recursive: true, force: true });
    await rm(asdUpstream, { recursive: true, force: true });
  }
}
