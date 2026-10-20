import * as values from "./compile-plugin-values.ts";
import { parseSkillFrontmatter, type validateSkillFrontmatter } from "./file-validation.ts";
import type { HarnessOutput } from "soubi/compiler";
import { jsonRecord } from "./validation.ts";

function parsePolicyMapping(document: unknown, configPath: string): Record<string, unknown> {
  if (!document || typeof document !== "object" || Array.isArray(document)) {
    const invalidConfigurationMessage = `${configPath}: configuration must be a YAML mapping`;

    throw new Error(invalidConfigurationMessage);
  }

  return jsonRecord.parse(document);
}

function applyExplicitCodexPolicy(files: Map<string, HarnessOutput["files"][number]>, name: string) {
  const configPath = `skills/${name}/agents/openai.yaml`;
  const existing = files.get(configPath);
  const document = parsePolicyMapping(
    existing ? Bun.YAML.parse(Buffer.from(existing.contents).toString()) : {},
    configPath
  );
  const policy: unknown = Reflect.get(document, "policy");

  if (policy !== undefined && (!policy || typeof policy !== "object" || Array.isArray(policy))) {
    const invalidPolicyMessage = `${configPath}: policy must be a YAML mapping`;

    throw new Error(invalidPolicyMessage);
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

function requireSkill(skill: HarnessOutput["files"][number] | undefined, harness: string, name: string) {
  if (!skill) {
    const missingSkillMessage = `${harness}: missing skill ${name}`;

    throw new Error(missingSkillMessage);
  }

  return skill;
}

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
      Reflect.deleteProperty(skillDocument, values.ALLOWED_TOOLS);
      Reflect.deleteProperty(skillDocument, values.USER_INVOCABLE);
    }

    if (isExplicit && harness === "claude") {
      skillDocument[values.DISABLE_MODEL_INVOCATION] = true;
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
