import * as values from "./compile-plugin-values.ts";
import { parseSkillFrontmatter, type validateSkillFrontmatter } from "./file-validation.ts";
import type { HarnessOutput } from "soubi/compiler";
import { jsonRecord } from "./validation.ts";

function parsePolicyMapping(document: unknown, configPath: string): Record<string, unknown> {
  if (!document || typeof document !== "object" || Array.isArray(document)) {
    const message2 = `${configPath}: configuration must be a YAML mapping`;
    throw new Error(message2);
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
  const policy: unknown = Reflect.get(document, values.POLICY);

  if (policy !== undefined && (!policy || typeof policy !== "object" || Array.isArray(policy))) {
    const message3 = `${configPath}: policy must be a YAML mapping`;
    throw new Error(message3);
  }

  Reflect.set(document, values.POLICY, {
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
    const message4 = `${harness}: missing skill ${name}`;
    throw new Error(message4);
  }

  return skill;
}

function serializedSkill(document: object, source: string, offset: number) {
  const header = `---\n${Bun.YAML.stringify(document, undefined, 2).trimEnd()}\n---`;

  return header + source.slice(offset);
}

export function applyInvocationPolicies(
  output: HarnessOutput,
  harness: "claude" | "codex",
  skills: Map<string, Awaited<ReturnType<typeof validateSkillFrontmatter>>>
) {
  const files = new Map(output.files.map((file) => [file.path, file]));

  for (const [name, metadata] of skills) {
    const isExplicit = metadata.metadata?.invocation === values.EXPLICIT;

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

    if (harness === values.CODEX) {
      Reflect.deleteProperty(skillDocument, values.ALLOWED_TOOLS);
      Reflect.deleteProperty(skillDocument, values.USER_INVOCABLE);
    }

    if (isExplicit && harness === values.CLAUDE) {
      skillDocument[values.DISABLE_MODEL_INVOCATION] = true;
    }

    files.set(skillPath, {
      ...skill,
      contents: serializedSkill(skillDocument, source, header.position.end.offset),
    });

    if (!isExplicit || harness !== values.CODEX) {
      continue;
    }

    applyExplicitCodexPolicy(files, name);
  }

  return files.values();
}
