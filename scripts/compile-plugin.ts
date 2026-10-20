import * as z from "zod/mini";
import type { BuiltFile, Plugin } from "./types.ts";
import { EXECUTABLE_BITS, EXECUTABLE_MODE, REGULAR_MODE } from "./file-modes.ts";
import { type HarnessOutput, compileProject } from "soubi/compiler";
import { cp, realpath, stat } from "node:fs/promises";
import { filesIn, inside, marketplaceSourceFilter } from "./build-files.ts";
import { jsonRecord, parseJsonRecord } from "./validation.ts";
import { parseSkillFrontmatter, validateSkillFrontmatter } from "./file-validation.ts";
import { readFile, writeFile } from "./io.ts";
import path from "node:path";
const json = (value: unknown) => `${JSON.stringify(value, undefined, 2)}\n`;

function applyExplicitCodexPolicy(files: Map<string, HarnessOutput["files"][number]>, name: string) {
  const configPath = `skills/${name}/agents/openai.yaml`;
  const existing = files.get(configPath);
  const document = existing ? Bun.YAML.parse(Buffer.from(existing.contents).toString()) : {};

  if (!document || typeof document !== "object" || Array.isArray(document)) {
    throw new Error(`${configPath}: configuration must be a YAML mapping`);
  }

  const policy: unknown = Reflect.get(document, "policy");

  if (policy !== undefined && (!policy || typeof policy !== "object" || Array.isArray(policy))) {
    throw new Error(`${configPath}: policy must be a YAML mapping`);
  }

  Reflect.set(document, "policy", {
    ...(policy && typeof policy === "object" && !Array.isArray(policy) && policy),
    allow_implicit_invocation: false,
  });
  files.set(configPath, {
    ...existing,
    path: configPath,
    contents: Bun.YAML.stringify(document, undefined, 2),
  });
}

function applyInvocationPolicies(
  output: HarnessOutput,
  harness: "claude" | "codex",
  skills: Map<string, Awaited<ReturnType<typeof validateSkillFrontmatter>>>
) {
  const files = new Map(output.files.map((file) => [file.path, file]));

  for (const [name, metadata] of skills) {
    const isExplicit = metadata.metadata?.invocation === "explicit";

    const skillPath = `skills/${name}/SKILL.md`;
    const skill = files.get(skillPath);

    if (!skill) {
      throw new Error(`${harness}: missing skill ${name}`);
    }

    const source = Buffer.from(skill.contents).toString();
    const { header, document: skillDocument } = parseSkillFrontmatter(source);

    // Soubi 0.0.1 flattens nested YAML metadata; retain the validated source fields.
    const metadataKeys = Object.keys(metadata.metadata ?? {});

    for (const key of metadataKeys) {
      if (!Object.hasOwn(metadata, key)) {
        Reflect.deleteProperty(skillDocument, key);
      }
    }

    for (const [key, value] of Object.entries(metadata)) {
      skillDocument[key] = value;
    }

    if (harness === "codex") {
      delete skillDocument["allowed-tools"];
      delete skillDocument["user-invocable"];
    }

    if (isExplicit && harness === "claude") {
      skillDocument["disable-model-invocation"] = true;
    }

    files.set(skillPath, {
      ...skill,
      contents:
        `---\n${Bun.YAML.stringify(skillDocument, undefined, 2).trimEnd()}\n---` +
        source.slice(header.position.end.offset),
    });

    if (!isExplicit || harness !== "codex") {
      continue;
    }

    applyExplicitCodexPolicy(files, name);
  }

  return files.values();
}

async function compileNativePlugin(plugin: Plugin, source: string, sourceFiles: string[]) {
  const files = new Map<string, BuiltFile>();

  for (const harness of plugin.harnesses) {
    const manifestPath = `.${harness}-plugin/plugin.json`;
    const isPortable = harness === "codex" && sourceFiles.includes("plugin.json");
    const selected = isPortable ? "plugin.json" : manifestPath;
    await readFile(path.join(source, selected), "utf8");

    for (const file of sourceFiles) {
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

      const info = await stat(path.join(source, file));
      files.set(`dist/${harness}/plugins/${plugin.name}/${file}`, {
        contents,
        mode: info.mode & EXECUTABLE_BITS ? EXECUTABLE_MODE : REGULAR_MODE,
      });
    }
  }

  return files;
}

async function copyEngineeringPolicy(root: string, project: string, name: string) {
  if (name !== "engineering") {
    return;
  }

  for (const file of ["eslint.config.ts", "prettier.config.mjs"]) {
    await cp(path.join(root, file), path.join(project, file));
  }
}

function collectCompiledFiles(
  root: string,
  plugin: Plugin,
  outputs: HarnessOutput[],
  skills: Map<string, Awaited<ReturnType<typeof validateSkillFrontmatter>>>
) {
  const files = new Map<string, BuiltFile>();

  for (const harness of plugin.harnesses) {
    const output = outputs.find((item) => item.harness === harness);

    if (!output) {
      throw new Error(`${plugin.name}: missing ${harness} output`);
    }

    const base = `dist/${harness}/plugins/${plugin.name}`;
    const manifestPath = `.${harness}-plugin/plugin.json`;

    if (output.files.every((file) => file.path !== manifestPath)) {
      throw new Error(`${plugin.name}: missing ${harness} manifest`);
    }

    for (const file of applyInvocationPolicies(output, harness, skills)) {
      // Soubi 0.0.1 emits obsolete manual-install advice for Codex plugin hooks.
      // Current local Codex loads bundled hooks after the user trusts the plugin.
      if (harness === "codex" && plugin.name === "engineering" && file.path === "hooks/README.md") {
        continue;
      }

      inside(root, file.path);
      let contents = Buffer.from(file.contents);

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
            servers[name].cwd = server.cwd.replaceAll("${PLUGIN_ROOT}", ".");
          }
        }

        contents = Buffer.from(json(servers));
      }

      const target = `${base}/${file.path}`;

      if (files.has(target)) {
        throw new Error(`Duplicate generated file: ${target}`);
      }

      files.set(target, { contents, mode: file.executable ? EXECUTABLE_MODE : REGULAR_MODE });
    }
  }

  return files;
}

export async function compilePlugin(root: string, plugin: Plugin, owner: string, staging: string) {
  const source = inside(root, `plugins/${plugin.name}`);
  const resolved = await realpath(source);
  const resolvedValue1 = await stat(source);

  if (resolved !== source || !resolvedValue1.isDirectory()) {
    throw new Error(`Invalid plugin source: ${source}`);
  }

  const pluginsRoot = path.join(root, "plugins");
  const shouldInclude = marketplaceSourceFilter(pluginsRoot);
  const sourceFiles = await filesIn(source, "", pluginsRoot, new Set(), shouldInclude);

  if (plugin.native) {
    return compileNativePlugin(plugin, source, sourceFiles);
  }

  const skills = new Map<string, Awaited<ReturnType<typeof validateSkillFrontmatter>>>();

  for (const file of sourceFiles) {
    if (path.basename(file) !== "SKILL.md") {
      continue;
    }

    const metadata = await validateSkillFrontmatter(path.join(source, file));
    skills.set(metadata.name, metadata);
  }

  if (sourceFiles.some((file) => /^plugin\.config\.[^/]+$/.test(file))) {
    throw new Error(`${plugin.name}: define Soubi configuration in marketplace.toml`);
  }

  const project = path.join(staging, plugin.name);
  await cp(source, project, { recursive: true, dereference: true, filter: shouldInclude });

  await copyEngineeringPolicy(root, project, plugin.name);

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
