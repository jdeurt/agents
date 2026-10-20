import * as values from "./compile-plugin-values.ts";
import * as z from "zod/mini";
import type { BuiltFile, Plugin } from "./types.ts";
import { EXECUTABLE_BITS, EXECUTABLE_MODE, REGULAR_MODE } from "./file-modes.ts";
import { type HarnessOutput, compileProject } from "soubi/compiler";
import { cp, mkdir, realpath, stat } from "node:fs/promises";
import { filesIn, inside, marketplaceSourceFilter } from "./build-files.ts";
import { jsonRecord, parseJsonRecord } from "./validation.ts";
import { readFile, writeFile } from "./io.ts";
import { applyInvocationPolicies } from "./compile-invocation.ts";
import path from "node:path";
import { validateSkillFrontmatter } from "./file-validation.ts";

const json = (value: unknown) => `${JSON.stringify(value, undefined, 2)}\n`;

async function sourceBuiltFile(source: string, file: string, contents: Buffer): Promise<BuiltFile> {
  const info = await stat(path.join(source, file));

  return { contents, mode: info.mode & EXECUTABLE_BITS ? EXECUTABLE_MODE : REGULAR_MODE };
}

async function compileNativePlugin(plugin: Plugin, source: string, sourceFiles: string[]) {
  const files = new Map<string, BuiltFile>();

  for (const harness of plugin.harnesses) {
    const manifestPath = `.${harness}-plugin/plugin.json`;
    const isPortable = harness === "codex" && sourceFiles.includes(values.PLUGIN_JSON);
    const selected = isPortable ? values.PLUGIN_JSON : manifestPath;

    await readFile(path.join(source, selected), "utf8");

    for (const file of sourceFiles) {
      const target = `dist/${harness}/plugins/${plugin.name}/${file}`;

      let contents = await readFile(path.join(source, file));

      if (file === selected || file === manifestPath) {
        const manifest = parseJsonRecord(contents.toString());

        contents = Buffer.from(
          json({
            ...manifest,
            name: `jdeurt-${plugin.name}`,
            version: plugin.version,
          })
        );
      }

      files.set(target, await sourceBuiltFile(source, file, contents));
    }
  }

  return files;
}

async function copyJavascriptPolicy(root: string, references: string) {
  await mkdir(references, { recursive: true });

  for (const file of [values.ESLINT_CONFIG_TS, values.PRETTIER_CONFIG_MJS, values.ESLINT_RULES_TS]) {
    await cp(path.join(root, file), path.join(references, file));
  }
}

async function copyEngineeringPolicy(root: string, project: string, name: string) {
  if (name !== values.ENGINEERING) {
    return;
  }

  await copyJavascriptPolicy(root, path.join(project, values.SKILLS_FORMATTING_LINTING_REFERENCES_JAVASCRIPT));
}

function requireHarnessOutput(outputs: HarnessOutput[], harness: string, pluginName: string) {
  const output = outputs.find((item) => item.harness === harness);

  if (!output) {
    const message = `${pluginName}: missing ${harness} output`;

    throw new Error(message);
  }

  return output;
}

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
      const missingManifestMessage = `${plugin.name}: missing ${harness} manifest`;

      throw new Error(missingManifestMessage);
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
            servers[name].cwd = server.cwd.replaceAll(values.PLUGIN_ROOT_2, ".");
          }
        }

        contents = Buffer.from(json(servers));
      }

      if (files.has(target)) {
        const duplicateFileMessage = `Duplicate generated file: ${target}`;

        throw new Error(duplicateFileMessage);
      }

      files.set(target, { contents, mode: file.executable ? EXECUTABLE_MODE : REGULAR_MODE });
    }
  }

  return files;
}

async function collectSkill(
  source: string,
  file: string,
  skills: Map<string, Awaited<ReturnType<typeof validateSkillFrontmatter>>>
) {
  const metadata = await validateSkillFrontmatter(path.join(source, file));

  skills.set(metadata.name, metadata);
}

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
      (issue) => !(issue.harness === "codex" && issue.message === values.CODEX_AGENT_SKILLS_DO_NOT_SUPPORT_AN)
    ),
  ];

  if (issues.length > 0 || result.outputs.some((output) => output.excluded)) {
    const compilationFailureMessage = `${plugin.name}: Soubi compilation lost or changed behavior\n`;

    throw new Error(compilationFailureMessage + issues.map((issue) => `${issue.harness}: ${issue.message}`).join("\n"));
  }

  return collectCompiledFiles(root, plugin, result.outputs, skills);
}

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
  const text5 = `export default ${json(config)}`;

  await writeFile(path.join(project, values.PLUGIN_CONFIG_TS), text5);

  return compileProjectFiles(root, plugin, project, skills);
}

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
    const configurationLocationMessage = `${plugin.name}: define Soubi configuration in marketplace.toml`;

    throw new Error(configurationLocationMessage);
  }

  await cp(source, project, { recursive: true, dereference: true, filter: shouldInclude });

  await copyEngineeringPolicy(root, project, plugin.name);

  return compileStagedPlugin(root, plugin, owner, project, skills);
}

export async function compilePlugin(root: string, plugin: Plugin, owner: string, staging: string) {
  const source = inside(root, `plugins/${plugin.name}`);
  const resolved = await realpath(source);
  const resolvedValue1 = await stat(source);

  if (resolved !== source || !resolvedValue1.isDirectory()) {
    const invalidSourceMessage = `Invalid plugin source: ${source}`;

    throw new Error(invalidSourceMessage);
  }

  return compileSourcePlugin(root, plugin, owner, staging, source);
}
