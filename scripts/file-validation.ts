import * as z from "zod/mini";
import Ajv from "ajv";
import path from "node:path";
import { readFile } from "./io.ts";
const schemaSource = await readFile(new URL("skill-frontmatter.schema.json", import.meta.url), "utf8");
const properties = z.record(z.string(), z.unknown());
const schema = z.looseObject({ properties }).parse(JSON.parse(schemaSource));
const metadataRecord = z.record(z.string(), z.string());
const metadataSchema = z.looseObject({
  name: z.string(),
  metadata: z.optional(metadataRecord),
});
const ajv = new Ajv({ allErrors: true });
const isSharedMetadataValid = ajv.compile(schema);
const nativeMetadataValidators = {
  claude: ajv.compile({
    ...schema,
    properties: {
      ...schema.properties,
      "disable-model-invocation": { type: "boolean" },
    },
  }),
  codex: isSharedMetadataValid,
};

export function parseSkillFrontmatter(source: string) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?=\r?\n|$)/.exec(source);

  if (!match) {
    throw new Error("SKILL.md must start with YAML frontmatter.");
  }

  const document = Bun.YAML.parse(match[1]);

  if (!document || typeof document !== "object" || Array.isArray(document)) {
    throw new Error("Skill frontmatter must contain one YAML mapping.");
  }

  return {
    header: { position: { end: { offset: match[0].length } } },
    document,
  };
}

export async function validateSkillFrontmatter(filename: string, { harness }: { harness?: "claude" | "codex" } = {}) {
  const { document } = parseSkillFrontmatter(await readFile(filename, "utf8"));
  const metadata = metadataSchema.parse(document);
  const isMetadataValid = harness === undefined ? isSharedMetadataValid : nativeMetadataValidators[harness];

  if (!isMetadataValid(metadata)) {
    throw new Error(ajv.errorsText(isMetadataValid.errors));
  }

  if (metadata.name !== path.basename(path.dirname(filename))) {
    throw new Error("Skill name must match its directory name.");
  }

  return metadata;
}
