import { readFile } from "./io.ts";
import path from "node:path";
import Ajv from "ajv";
const schema = JSON.parse(
  await readFile(
    new URL("skill-frontmatter.schema.json", import.meta.url),
    "utf8"
  )
);
const ajv = new Ajv({ allErrors: true });
const validateSharedMetadata = ajv.compile(schema);
const nativeMetadataValidators = {
  claude: ajv.compile({
    ...schema,
    properties: {
      ...schema.properties,
      "disable-model-invocation": { type: "boolean" },
    },
  }),
  codex: validateSharedMetadata,
};

export function parseSkillFrontmatter(source: string) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?=\r?\n|$)/.exec(source);
  if (!match) throw new Error("SKILL.md must start with YAML frontmatter.");
  const document = Bun.YAML.parse(match[1]);
  if (!document || typeof document !== "object" || Array.isArray(document))
    throw new Error("Skill frontmatter must contain one YAML mapping.");
  return {
    header: { position: { end: { offset: match[0].length } } },
    document: document as Record<string, unknown>,
  };
}

export async function validateSkillFrontmatter(
  filename,
  { harness }: { harness?: "claude" | "codex" } = {}
) {
  const { document } = await parseSkillFrontmatter(
    await readFile(filename, "utf8")
  );
  const metadata = document as {
    name: string;
    metadata?: Record<string, string>;
  };
  const validateMetadata =
    harness === undefined
      ? validateSharedMetadata
      : nativeMetadataValidators[harness];
  if (!validateMetadata)
    throw new Error(`Unsupported skill harness: ${harness}`);
  if (!validateMetadata(metadata))
    throw new Error(ajv.errorsText(validateMetadata.errors));
  if (metadata.name !== path.basename(path.dirname(filename)))
    throw new Error("Skill name must match its directory name.");
  return metadata;
}
