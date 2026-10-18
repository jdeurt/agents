import { readFile, writeFile } from "./io.ts";
import { cp, mkdir, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { compileProject } from "soubi/compiler";
import type { HarnessOutput } from "soubi/compiler";

import {
  parseSkillFrontmatter,
  validateSkillFrontmatter,
} from "./file-validation.ts";
import { inside, marketplaceSourceFilter, filesIn } from "./build-files.ts";
import type { Plugin } from "./types.ts";
const json = (value: unknown) => `${JSON.stringify(value, undefined, 2)}\n`;
async function applyInvocationPolicies(output: HarnessOutput, harness, skills) {
  const files = new Map(output.files.map((file) => [file.path, file]));
  for (const [name, metadata] of skills) {
    const explicit = metadata.metadata?.invocation === "explicit";

    const skillPath = `skills/${name}/SKILL.md`;
    const skill = files.get(skillPath);
    if (!skill) throw new Error(`${harness}: missing skill ${name}`);
    const source = Buffer.from(skill.contents).toString();
    const { header, document } = await parseSkillFrontmatter(source);
    // Soubi 0.0.1 flattens nested YAML metadata; retain the validated source fields.
    for (const key of Object.keys(metadata.metadata ?? {})) {
      if (!Object.hasOwn(metadata, key)) delete document[key];
    }
    for (const [key, value] of Object.entries(metadata)) document[key] = value;
    if (harness === "codex") {
      delete document["allowed-tools"];
      delete document["user-invocable"];
    }
    if (explicit && harness === "claude")
      document["disable-model-invocation"] = true;
    files.set(skillPath, {
      ...skill,
      contents: `---\n${Bun.YAML.stringify(document, undefined, 2).trimEnd()}\n---${source.slice(header.position.end.offset)}`,
    });
    if (explicit && harness === "codex") {
      const configPath = `skills/${name}/agents/openai.yaml`;
      const existing = files.get(configPath);
      const document = existing
        ? Bun.YAML.parse(Buffer.from(existing.contents).toString())
        : {};
      if (!document || typeof document !== "object" || Array.isArray(document))
        throw new Error(`${configPath}: configuration must be a YAML mapping`);
      const config = document as Record<string, unknown>;
      const policy = config.policy;
      if (
        policy !== undefined &&
        (!policy || typeof policy !== "object" || Array.isArray(policy))
      )
        throw new Error(`${configPath}: policy must be a YAML mapping`);
      config.policy = {
        ...(policy as Record<string, unknown>),
        allow_implicit_invocation: false,
      };
      files.set(configPath, {
        ...existing,
        path: configPath,
        contents: Bun.YAML.stringify(document, undefined, 2),
      });
    }
  }
  return files.values();
}

export async function compilePlugin(
  root: string,
  plugin: Plugin,
  owner: string,
  staging: string
) {
  const source = inside(root, `plugins/${plugin.name}`);
  const resolved = await realpath(source);
  const resolvedValue1 = await stat(source);
  if (resolved !== source || !resolvedValue1.isDirectory())
    throw new Error(`Invalid plugin source: ${source}`);
  const pluginsRoot = path.join(root, "plugins");
  const filter = marketplaceSourceFilter(pluginsRoot);
  const sourceFiles = await filesIn(source, "", pluginsRoot, new Set(), filter);
  if (plugin.native) {
    const files = new Map();
    for (const harness of plugin.harnesses) {
      const manifestPath = `.${harness}-plugin/plugin.json`;
      const portable =
        harness === "codex" && sourceFiles.includes("plugin.json");
      const selected = portable ? "plugin.json" : manifestPath;
      await readFile(path.join(source, selected), "utf8");
      for (const file of sourceFiles) {
        let contents = await readFile(path.join(source, file));
        if (file === selected || file === manifestPath)
          contents = Buffer.from(
            json({
              ...JSON.parse(contents.toString()),
              name: `jdeurt-${plugin.name}`,
              version: plugin.version,
            })
          );
        const info = await stat(path.join(source, file));
        files.set(`dist/${harness}/plugins/${plugin.name}/${file}`, {
          contents,
          mode: info.mode & 0o111 ? 0o755 : 0o644,
        });
      }
    }
    return files;
  }

  const skills = new Map();
  for (const file of sourceFiles.filter(
    (file) => path.basename(file) === "SKILL.md"
  )) {
    const metadata = await validateSkillFrontmatter(path.join(source, file));
    skills.set(metadata.name, metadata);
  }
  if (sourceFiles.some((file) => /^plugin\.config\.[^/]+$/.test(file))) {
    throw new Error(
      `${plugin.name}: define Soubi configuration in marketplace.toml`
    );
  }
  const project = path.join(staging, plugin.name);
  await cp(source, project, { recursive: true, dereference: true, filter });
  if (plugin.name === "engineering") {
    const target = path.join(project, "config/engineering-lint.mjs");
    await mkdir(path.dirname(target), { recursive: true });
    await cp(path.join(root, "config/engineering-lint.mjs"), target);
  }
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
  await writeFile(
    path.join(project, "plugin.config.ts"),
    `export default ${json(config)}`
  );
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
          issue.message ===
            "Codex Agent Skills do not support an allowed-tools field; the restriction was omitted."
        )
    ),
  ];
  if (issues.length > 0 || result.outputs.some((output) => output.excluded)) {
    throw new Error(
      `${plugin.name}: Soubi compilation lost or changed behavior\n${issues.map((issue) => `${issue.harness}: ${issue.message}`).join("\n")}`
    );
  }
  const files = new Map();
  for (const harness of plugin.harnesses) {
    const output = result.outputs.find((item) => item.harness === harness);
    if (!output) throw new Error(`${plugin.name}: missing ${harness} output`);
    const base = `dist/${harness}/plugins/${plugin.name}`;
    const manifestPath = `.${harness}-plugin/plugin.json`;
    if (!output.files.some((file) => file.path === manifestPath))
      throw new Error(`${plugin.name}: missing ${harness} manifest`);
    for (const file of await applyInvocationPolicies(output, harness, skills)) {
      // Soubi 0.0.1 emits obsolete manual-install advice for Codex plugin hooks.
      // Current local Codex loads bundled hooks after the user trusts the plugin.
      if (
        plugin.name === "engineering" &&
        harness === "codex" &&
        file.path === "hooks/README.md"
      )
        continue;
      inside(root, file.path);
      let contents = Buffer.from(file.contents);
      if (file.path === manifestPath) {
        const manifest = JSON.parse(contents.toString());
        contents = Buffer.from(
          json({
            ...manifest,
            name: `jdeurt-${plugin.name}`,
            version: plugin.version,
            ...(plugin.license ? { license: plugin.license } : {}),
          })
        );
      }
      if (harness === "codex" && file.path === ".mcp.json") {
        const servers = JSON.parse(contents.toString());
        // Soubi 0.0.1 drops cwd for Codex; native plugins resolve it against their installed root.
        for (const [name, server] of Object.entries(
          plugin.soubi?.mcpServers ?? {}
        )) {
          if ("command" in server && server.command && server.cwd)
            servers[name].cwd = server.cwd.replaceAll("${PLUGIN_ROOT}", ".");
        }
        contents = Buffer.from(json(servers));
      }
      const target = `${base}/${file.path}`;
      if (files.has(target))
        throw new Error(`Duplicate generated file: ${target}`);
      files.set(target, { contents, mode: file.executable ? 0o755 : 0o644 });
    }
  }
  return files;
}
