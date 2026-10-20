import { mkdir, mkdtemp, realpath, rm } from "node:fs/promises";
import { git } from "./git.ts";
import path from "node:path";
import { tmpdir } from "node:os";
import { writeFile } from "./io.ts";

const FIXTURE_LICENSE = "Fixture license\n";

const ASD_STE100_REPOSITORY = "https://github.com/danyuchn/asd-ste100-skill.git";
const ASD_STE100_FIXTURE_SKILL =
  '---\nname: asd-ste100\ndescription: Fixture STE100 skill.\nversion: "0.4.0"\n---\nImported STE100 instructions.\n';
const ASD_STE100_LINTER_PATH = "scripts/ste-lint.py";
const ASD_STE100_LINTER_SOURCE = "# Fixture structural linter.\n";

/**
Create and commit a local upstream fixture repository.
@param upstream - Fixture content directory to initialize as a Git repository.
*/
function initializeFixtureRepository(upstream: string) {
  git(upstream, ["init", "-b", "trunk"]);
  git(upstream, ["config", "user.name", "Test"]);
  git(upstream, ["config", "user.email", "test@example.com"]);
  git(upstream, ["add", "."]);
  git(upstream, ["commit", "-m", "Fixture"]);
}

/**
Create an ASD skill fixture and redirect its upstream URL.
@param upstream - Temporary repository for the imported ASD skill fixture.
*/
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

/**
Create minimal frontmatter and instructions for an imported skill fixture.
@param name - Skill identity to place in the fixture frontmatter.
@returns The complete Markdown skill fixture.
*/
function fixtureSkill(name: string) {
  return `---\nname: ${name}\ndescription: Fixture skill for jscpd.\n---\n\nScan all supported formats.\n`;
}

/**
Create local plugin fixtures and redirect their upstream URLs.
@param upstream - Temporary repository containing fixture plugin content.
*/
async function prepareFixture(upstream: string) {
  const gitRewrite = `url.file://${upstream}.insteadOf`;

  await mkdir(path.join(upstream, "skills/shadcn"), { recursive: true });
  await writeFile(
    path.join(upstream, "skills/shadcn/SKILL.md"),
    "---\nname: shadcn\ndescription: Test imported skill.\nallowed-tools: Read\n---\nImported instructions.\n"
  );
  await writeFile(path.join(upstream, "LICENSE.md"), FIXTURE_LICENSE);
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
  await writeFile(path.join(upstream, "sample/.mcp.json"), '{"docs":{"url":"https://example.com/mcp"}}\n');
  await writeFile(path.join(upstream, "LICENSE"), FIXTURE_LICENSE);

  for (const name of ["jscpd", "dry-refactoring", "codebase-refactoring", "compare-codebases", "code-migration"]) {
    await mkdir(path.join(upstream, "skills", name), { recursive: true });
    await writeFile(path.join(upstream, "skills", name, "SKILL.md"), fixtureSkill(name));
  }

  for (const manifest of ["plugin.json", ".codex-plugin/plugin.json", ".claude-plugin/plugin.json"]) {
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
  process.env.GIT_CONFIG_VALUE_0 = "https://github.com/shadcn-ui/ui.git";
  process.env.GIT_CONFIG_KEY_1 = gitRewrite;
  process.env.GIT_CONFIG_VALUE_1 = "https://github.com/cloudflare/skills.git";
  process.env.GIT_CONFIG_KEY_2 = gitRewrite;
  process.env.GIT_CONFIG_VALUE_2 = "https://github.com/kucherenko/jscpd.git";
}

/**
Restore environment variables changed by fixture setup.
@param keys - Environment variable names captured before setup.
@param previous - Prior values aligned with the captured names.
*/
function restoreEnvironment(keys: string[], previous: (string | undefined)[]) {
  for (const [i, key] of keys.entries()) {
    if (previous[i] === undefined) {
      Reflect.deleteProperty(process.env, key);
    } else {
      process.env[key] = previous[i];
    }
  }
}

/**
Run an operation with local upstream fixtures and restore the environment.
@param use - Operation that receives the primary upstream fixture repository.
@returns The callback result after fixture cleanup.
*/
export async function withImportFixture<T>(use: (upstream: string) => Promise<T>) {
  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), "agents-upstream-test-"));
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
