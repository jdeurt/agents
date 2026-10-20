import * as z from "zod/mini";
import Ajv from "ajv";
import path from "node:path";
import { readFile } from "./io.ts";
const SKILL_FRONTMATTER_SCHEMA_JSON = "skill-frontmatter.schema.json";
const UTF8 = "utf8";
const BOOLEAN = "boolean";
const SKILL_MD_MUST_START_WITH_YAML_FRONTMATTER = "SKILL.md must start with YAML frontmatter.";
const SKILL_FRONTMATTER_MUST_CONTAIN_ONE_YAML_MAPPING = "Skill frontmatter must contain one YAML mapping.";
const SKILL_NAME_MUST_MATCH_ITS_DIRECTORY_NAME = "Skill name must match its directory name.";

const schemaSource = await readFile(new URL(SKILL_FRONTMATTER_SCHEMA_JSON, import.meta.url), UTF8);
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
      "disable-model-invocation": { type: BOOLEAN },
    },
  }),
  codex: isSharedMetadataValid,
};

function parseFrontmatterDocument(source: string) {
  const document = Bun.YAML.parse(source);

  if (!document || typeof document !== "object" || Array.isArray(document)) {
    throw new Error(SKILL_FRONTMATTER_MUST_CONTAIN_ONE_YAML_MAPPING);
  }

  return document;
}

export function parseSkillFrontmatter(source: string) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?=\r?\n|$)/.exec(source);

  if (!match) {
    throw new Error(SKILL_MD_MUST_START_WITH_YAML_FRONTMATTER);
  }

  return {
    header: { position: { end: { offset: match[0].length } } },
    document: parseFrontmatterDocument(match[1]),
  };
}

export async function validateSkillFrontmatter(filename: string, { harness }: { harness?: "claude" | "codex" } = {}) {
  const { document } = parseSkillFrontmatter(await readFile(filename, UTF8));
  const metadata = metadataSchema.parse(document);
  const isMetadataValid = harness === undefined ? isSharedMetadataValid : nativeMetadataValidators[harness];

  if (!isMetadataValid(metadata)) {
    throw new Error(ajv.errorsText(isMetadataValid.errors));
  }

  if (metadata.name !== path.basename(path.dirname(filename))) {
    throw new Error(SKILL_NAME_MUST_MATCH_ITS_DIRECTORY_NAME);
  }

  return metadata;
}
