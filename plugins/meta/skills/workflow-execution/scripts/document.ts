import { parseGraph } from "./graph.ts";

/**
Collect level-two sections as Markdown content, ignoring headings inside fenced content.
@param source - Markdown body to inspect.
@returns Section content indexed by exact heading text.
*/
function sectionsIn(source: string) {
  const sections = new Map<string, string>();

  let current: string | undefined;
  let fence: string | undefined;

  for (const line of source.split(/\r?\n/)) {
    const marker = /^\s*(`{3,}|~{3,})/.exec(line)?.[1];
    const heading = fence ? undefined : /^## (.+)$/.exec(line)?.[1];

    if (heading) {
      current = heading;
      sections.set(current, sections.get(current) ?? "");
    } else if (current) {
      sections.set(current, `${sections.get(current) ?? ""}${line}\n`);
    }

    if (marker && !fence) {
      fence = marker;
    } else if (marker && fence && marker.startsWith(fence) && /^\s*(`+|~+)\s*$/.test(line)) {
      fence = undefined;
    }
  }

  return sections;
}

/**
Check the opt-in marker without changing ordinary skill parsing.
@param source - Complete Markdown document.
@returns Whether the YAML metadata opts into workflow dialect version one.
*/
export function isWorkflow(source: string) {
  const header = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(source)?.[1];
  const parsed: unknown = header === undefined ? undefined : Bun.YAML.parse(header);
  const metadata = parsed && typeof parsed === "object" && "metadata" in parsed ? parsed.metadata : undefined;

  return Boolean(
    metadata && typeof metadata === "object" && "workflow" in metadata && metadata.workflow === "mermaid-v1"
  );
}

/**
Check that optional shared Notes contain single-line bullets only.
@param source - Notes section text, or undefined when absent.
@returns The trimmed bullet text, or an empty string when absent.
*/
function parseNotes(source: string | undefined) {
  const notes = source?.trim();

  if (notes?.split(/\r?\n/).some((line) => !(line === "" || /^[-*+] \S/.test(line)))) {
    throw new Error("Notes must contain execution-relevant, single-line Markdown bullets only.");
  }

  if (notes === "") {
    throw new Error("Omit an empty Notes section.");
  }

  return notes ?? "";
}

/**
Check required standard skill identity fields before workflow validation.
@param source - Complete document with leading YAML frontmatter.
@returns The validated skill name.
*/
function requireSkillIdentity(source: string) {
  const header = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(source)?.[1];
  const parsed: unknown = header === undefined ? undefined : Bun.YAML.parse(header);

  if (!parsed || typeof parsed !== "object" || !("name" in parsed) || !("description" in parsed)) {
    throw new Error("Workflow skills require standard name and description frontmatter.");
  }

  if (typeof parsed.name !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(parsed.name)) {
    throw new Error("Workflow skill name must be lowercase and hyphenated.");
  }

  if (typeof parsed.description !== "string" || !parsed.description.trim()) {
    throw new Error("Workflow skill description must be nonempty text.");
  }

  return parsed.name;
}

/**
Require workflow opt-in before returning the Markdown body.
@param source - Complete skill document.
@returns The body after its standard frontmatter.
*/
function workflowBody(source: string) {
  if (!isWorkflow(source)) {
    throw new Error("Set metadata.workflow to mermaid-v1 in the skill frontmatter.");
  }

  return source.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, "").trim();
}

/**
Parse an opted-in skill whose body starts with its Mermaid graph and optional Notes bullets.
@param source - Complete workflow skill, including ordinary YAML frontmatter.
@returns The validated graph and optional execution notes.
*/
export function parseDocument(source: string) {
  const body = workflowBody(source);
  const match = /^```mermaid\r?\n([\s\S]*?)\r?\n```(?:\s*\r?\n## Notes\r?\n([\s\S]*))?$/.exec(body);
  const graphText = match?.[1];

  if (!graphText) {
    throw new Error("The skill body must start with one mermaid fence, followed only by optional Notes bullets.");
  }

  return { name: requireSkillIdentity(source), graph: parseGraph(graphText), notes: parseNotes(match[2]) };
}

/**
Read one relative Markdown link from a document section.
@param sections - Document headings and their content.
@param heading - Exact section heading.
@returns The reference, or undefined when the section is absent. Malformed links throw.
*/
export function sectionReference(sections: Map<string, string>, heading: string) {
  const text = sections.get(heading)?.trim();
  const reference = text === undefined ? undefined : /^\[[^\]\n]+\]\(([A-Za-z0-9_./-]+\.md)\)$/.exec(text)?.[1];

  if (text !== undefined && !reference) {
    throw new Error(`${heading} must contain one relative Markdown link.`);
  }

  return reference;
}

/**
Read sections for navigation without imposing a schema on ordinary node prose.
@param source - Referenced Markdown instruction file.
@returns The document's sections. Empty files throw.
*/
export function parseNodeFile(source: string) {
  const sections = sectionsIn(source);

  if (!source.trim()) {
    throw new Error("Node instruction files must be nonempty.");
  }

  return sections;
}

/**
Locate start inputs and stop outputs without imposing an ordinary-node schema.
@param kind - Node kind before control-role resolution.
@param sections - Parsed Markdown sections.
*/
export function validateNodeContract(kind: string, sections: Map<string, string>) {
  for (const heading of ["Inputs", "Outputs"]) {
    if (!(kind === "start" && heading === "Inputs") && !(kind === "stop" && heading === "Outputs")) {
      continue;
    }

    if (!/^[-*+] \S/m.test(sections.get(heading) ?? "")) {
      throw new Error(`${kind} document requires ${heading} bullets.`);
    }
  }
}
