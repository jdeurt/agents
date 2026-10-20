import * as values from "./compile-plugin-values.ts";
import * as z from "zod/mini";
import type { BuiltFile, Plugin } from "./types.ts";
import { EXECUTABLE_MODE, REGULAR_MODE } from "./file-modes.ts";
import { type HarnessOutput, compileProject } from "soubi/compiler";
import { cp, mkdir, realpath, stat } from "node:fs/promises";
import { filesIn, inside, marketplaceSourceFilter } from "./build-files.ts";
import { jsonRecord, parseJsonRecord } from "./validation.ts";
import { applyInvocationPolicies } from "./compile-invocation.ts";
import { compileNativePlugin } from "./compile-native.ts";
import path from "node:path";
import { validateSkillFrontmatter } from "./file-validation.ts";
import { writeFile } from "./io.ts";

/**
Serialize a value as formatted JSON with a final newline.
@param value - Value to serialize.
@returns The formatted JSON text.
*/
const json = (value: unknown) => `${JSON.stringify(value, undefined, 2)}\n`;

/**
Copy the shared JavaScript lint and formatting files into skill references.
@param root - Repository root containing the shared policy files.
@param references - Destination directory for the bundled reference files.
*/
async function copyJavascriptPolicy(root: string, references: string) {
  await mkdir(references, { recursive: true });

  for (const file of ["eslint.config.ts", "prettier.config.mjs", "eslint-rules.ts"]) {
    await cp(path.join(root, file), path.join(references, file));
  }
}

/**
Bundle JavaScript policy references when the staged plugin is Engineering.
@param root - Repository root containing the shared policy files.
@param project - Staged plugin directory.
@param name - Plugin name used to select Engineering.
*/
async function copyEngineeringPolicy(root: string, project: string, name: string) {
  if (name !== "engineering") {
    return;
  }

  await copyJavascriptPolicy(root, path.join(project, "skills/formatting-linting/references/javascript"));
}

/**
Select compiled harness output and reject a missing result.
@param outputs - Harness results returned by the compiler.
@param harness - Harness name to select.
@param pluginName - Plugin name to include in an error message.
@returns The compiled output for the requested harness.
*/
function requireHarnessOutput(outputs: HarnessOutput[], harness: string, pluginName: string) {
  const output = outputs.find((item) => item.harness === harness);

  if (!output) {
    throw new Error(`${pluginName}: missing ${harness} output`);
  }

  return output;
}

/**
Normalize compiled manifests, skill policies, and server paths for publication.
@param root - Source root used to validate compiler output paths.
@param plugin - Plugin metadata and harness settings.
@param outputs - Compiled output for the requested harnesses.
@param skills - Validated source metadata indexed by skill name.
@returns The generated file map with publication paths and executable modes.
*/
function collectCompiledFiles(
  root: string,
  plugin: Plugin,
  outputs: HarnessOutput[],
  skills: Map<string, Awaited<ReturnType<typeof validateSkillFrontmatter>>>
) {
  const files = new Map<string, BuiltFile>();

  for (const harness of plugin.harnesses) {
    const output = requireHarnessOutput(outputs, harness, plugin.name);
    const base = `dist/${harness}/plugins/${plugin.name}`;
    const manifestPath = `.${harness}-plugin/plugin.json`;

    if (output.files.every((file) => file.path !== manifestPath)) {
      throw new Error(`${plugin.name}: missing ${harness} manifest`);
    }

    for (const file of applyInvocationPolicies(output, harness, skills)) {
      const target = `${base}/${file.path}`;

      let contents: Buffer;

      inside(root, file.path);
      contents = Buffer.from(file.contents);

      if (file.path === manifestPath) {
        const manifest = parseJsonRecord(contents.toString());

        contents = Buffer.from(
          json({
            ...manifest,
            name: `jdeurt-${plugin.name}`,
            version: plugin.version,
            ...(plugin.license && { license: plugin.license }),
          })
        );
      }

      if (harness === "codex" && file.path === ".mcp.json") {
        const servers = z.record(z.string(), jsonRecord).parse(JSON.parse(contents.toString()));

        // Soubi 0.0.1 drops cwd for Codex; native plugins resolve it against their installed root.
        const sourceServers = Object.entries(plugin.soubi?.mcpServers ?? {});

        for (const [name, server] of sourceServers) {
          if ("command" in server && server.command && server.cwd) {
            servers[name].cwd = server.cwd.replaceAll(values.PLUGIN_ROOT_PLACEHOLDER, ".");
          }
        }

        contents = Buffer.from(json(servers));
      }

      if (files.has(target)) {
        throw new Error(`Duplicate generated file: ${target}`);
      }

      files.set(target, { contents, mode: file.executable ? EXECUTABLE_MODE : REGULAR_MODE });
    }
  }

  return files;
}

/**
Read and validate a skill's metadata, then add it to the source metadata map.
@param source - Plugin source directory.
@param file - Relative path to the skill document.
@param skills - Mutable metadata map indexed by skill name.
*/
async function collectSkill(
  source: string,
  file: string,
  skills: Map<string, Awaited<ReturnType<typeof validateSkillFrontmatter>>>
) {
  const metadata = await validateSkillFrontmatter(path.join(source, file));

  skills.set(metadata.name, metadata);
}

/**
Compile a staged project and reject unsupported behavior changes.
@param root - Source root used to validate generated paths.
@param plugin - Plugin metadata and harness settings.
@param project - Staged project directory to compile.
@param skills - Validated source metadata indexed by skill name.
@returns The normalized generated file map for the plugin.
*/
async function compileProjectFiles(
  root: string,
  plugin: Plugin,
  project: string,
  skills: Map<string, Awaited<ReturnType<typeof validateSkillFrontmatter>>>
) {
  const result = await compileProject(project, {
    only: plugin.harnesses,
    fresh: true,
  });
  const issues = [
    ...result.failures,
    ...result.warnings.filter(
      (issue) =>
        !(
          issue.harness === "codex" &&
          issue.message === "Codex Agent Skills do not support an allowed-tools field; the restriction was omitted."
        )
    ),
  ];

  if (issues.length > 0 || result.outputs.some((output) => output.excluded)) {
    throw new Error(
      `${plugin.name}: Soubi compilation lost or changed behavior\n` +
        issues.map((issue) => `${issue.harness}: ${issue.message}`).join("\n")
    );
  }

  return collectCompiledFiles(root, plugin, result.outputs, skills);
}

/**
Write the compiler configuration and compile the staged plugin.
@param root - Source root used to validate generated paths.
@param plugin - Plugin metadata and compiler settings.
@param owner - Default author name for plugins without an author.
@param project - Staged plugin directory.
@param skills - Validated source metadata indexed by skill name.
@returns The normalized generated file map for the plugin.
*/
async function compileStagedPlugin(
  root: string,
  plugin: Plugin,
  owner: string,
  project: string,
  skills: Map<string, Awaited<ReturnType<typeof validateSkillFrontmatter>>>
) {
  const config = {
    ...plugin.soubi,
    id: `jdeurt-${plugin.name}`,
    version: plugin.version,
    description: plugin.description,
    author: { name: plugin.author ?? owner },
    harnesses: plugin.harnesses,
    harnessDefaults: Object.fromEntries(
      plugin.harnesses.map((harness) => [
        harness,
        {
          ...plugin.soubi?.harnessDefaults?.[harness],
          onUnsupported: "fail",
        },
      ])
    ),
  };

  await writeFile(path.join(project, "plugin.config.ts"), `export default ${json(config)}`);

  return compileProjectFiles(root, plugin, project, skills);
}

/**
Prepare source files for native packaging or staged compiler execution.
@param root - Root directory containing plugin sources and shared policy files.
@param plugin - Plugin metadata and compiler settings.
@param owner - Default author name for plugins without an author.
@param staging - Temporary parent directory for staged projects.
@param source - Validated source directory for this plugin.
@returns The generated file map for the plugin.
*/
async function compileSourcePlugin(root: string, plugin: Plugin, owner: string, staging: string, source: string) {
  const pluginsRoot = path.join(root, "plugins");
  const shouldInclude = marketplaceSourceFilter(pluginsRoot);
  const sourceFiles = await filesIn(source, "", pluginsRoot, new Set(), shouldInclude);
  const skills = new Map<string, Awaited<ReturnType<typeof validateSkillFrontmatter>>>();
  const project = path.join(staging, plugin.name);

  if (plugin.native) {
    return compileNativePlugin(plugin, source, sourceFiles);
  }

  for (const file of sourceFiles) {
    if (path.basename(file) !== "SKILL.md") {
      continue;
    }

    await collectSkill(source, file, skills);
  }

  if (sourceFiles.some((file) => /^plugin\.config\.[^/]+$/.test(file))) {
    throw new Error(`${plugin.name}: define Soubi configuration in marketplace.toml`);
  }

  await cp(source, project, { recursive: true, dereference: true, filter: shouldInclude });

  await copyEngineeringPolicy(root, project, plugin.name);

  return compileStagedPlugin(root, plugin, owner, project, skills);
}

/**
Validate the plugin source directory and compile its configured harness outputs.
@param root - Root directory containing plugin sources and shared policy files.
@param plugin - Plugin metadata and compiler settings.
@param owner - Default author name for plugins without an author.
@param staging - Temporary parent directory for staged projects.
@returns The generated file map for the plugin.
*/
export async function compilePlugin(root: string, plugin: Plugin, owner: string, staging: string) {
  const source = inside(root, `plugins/${plugin.name}`);
  const resolved = await realpath(source);
  const resolvedValue1 = await stat(source);

  if (resolved !== source || !resolvedValue1.isDirectory()) {
    throw new Error(`Invalid plugin source: ${source}`);
  }

  return compileSourcePlugin(root, plugin, owner, staging, source);
}
