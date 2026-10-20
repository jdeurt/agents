import { parseSkillFrontmatter, type validateSkillFrontmatter } from "./file-validation.ts";
import type { HarnessOutput } from "soubi/compiler";
import { jsonRecord } from "./validation.ts";

/**
Require a YAML mapping before applying a generated invocation policy.
@param document - Parsed YAML value to validate.
@param configPath - Configuration path to include in an error message.
@returns The validated mapping with its existing fields preserved.
*/
function parsePolicyMapping(document: unknown, configPath: string): Record<string, unknown> {
  if (!document || typeof document !== "object" || Array.isArray(document)) {
    throw new Error(`${configPath}: configuration must be a YAML mapping`);
  }

  return jsonRecord.parse(document);
}

/**
Set the Codex policy that prevents implicit invocation of an explicit skill.
@param files - Mutable compiler file map to update with the skill configuration.
@param name - Skill name used to locate its Codex configuration.
*/
function applyExplicitCodexPolicy(files: Map<string, HarnessOutput["files"][number]>, name: string) {
  const configPath = `skills/${name}/agents/openai.yaml`;
  const existing = files.get(configPath);
  const document = parsePolicyMapping(
    existing ? Bun.YAML.parse(Buffer.from(existing.contents).toString()) : {},
    configPath
  );
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

/**
Require a compiled skill file before restoring its source metadata.
@param skill - Compiled skill file, if the compiler produced it.
@param harness - Harness name to include in an error message.
@param name - Skill name to include in an error message.
@returns The compiled skill file.
*/
function requireSkill(skill: HarnessOutput["files"][number] | undefined, harness: string, name: string) {
  if (!skill) {
    throw new Error(`${harness}: missing skill ${name}`);
  }

  return skill;
}

/**
Restore validated skill metadata and apply harness-specific invocation policies.
@param output - Compiled harness output containing skill files.
@param harness - Target harness whose metadata fields must be applied.
@param skills - Validated source metadata indexed by skill name.
@returns The compiled file iterator after metadata and policy updates.
*/
export function applyInvocationPolicies(
  output: HarnessOutput,
  harness: "claude" | "codex",
  skills: Map<string, Awaited<ReturnType<typeof validateSkillFrontmatter>>>
) {
  const files = new Map(output.files.map((file) => [file.path, file]));

  for (const [name, metadata] of skills) {
    const isExplicit = metadata.metadata?.invocation === "explicit";

    const skillPath = `skills/${name}/SKILL.md`;
    const skill = requireSkill(files.get(skillPath), harness, name);
    const metadataKeys = Object.keys(metadata.metadata ?? {});

    const source = Buffer.from(skill.contents).toString();
    const { header, document: skillDocument } = parseSkillFrontmatter(source);

    // Soubi 0.0.1 flattens nested YAML metadata; retain the validated source fields.

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
