import { containedFile, resolveSkillTarget } from "./skill-target.ts";
import { validateParallel, type ParallelRegion } from "./parallel.ts";
import { isWorkflow, sectionReference, parseDocument, parseNodeFile, validateNodeContract } from "./document.ts";
import { realpath } from "node:fs/promises";
import path from "node:path";

export interface Workflow extends ReturnType<typeof parseDocument> {
  filename: string;
  references: Map<string, string>;
  calls: Map<string, Workflow>;
  documents: Map<string, Map<string, string>>;
  parallel: Map<string, ParallelRegion>;
  unresolvedSkills: Set<string>;
}

/**
Check lexical reference containment before accessing a file.
@param owner - Absolute document path containing the reference.
@param reference - Relative POSIX Markdown path.
@param root - Canonical bundle root.
@returns The absolute candidate path within the root.
*/
function referencePath(owner: string, reference: string, root: string) {
  const candidate = path.resolve(path.dirname(owner), reference);

  if (
    path.isAbsolute(reference) ||
    reference.includes("\\") ||
    reference.includes("\0") ||
    !reference.endsWith(".md")
  ) {
    throw new Error(`Invalid relative Markdown reference: ${reference}`);
  }

  if (!candidate.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Reference leaves bundle root: ${reference}`);
  }

  return candidate;
}

/**
Resolve a regular Markdown file while rejecting physical escapes from the bundle.
@param owner - Document path containing the reference.
@param reference - Relative Markdown path.
@param root - Canonical bundle directory.
@returns The canonical regular-file path. Missing and escaping references throw.
*/
async function resolveReference(owner: string, reference: string, root: string) {
  const candidate = referencePath(owner, reference, root);

  return containedFile(candidate, root);
}

/**
Require documents and templates to stay within their owning skill.
@param filename - Canonical resource path.
@param entry - Canonical owning workflow entry path.
@returns The unchanged resource path when it is contained.
*/
function insideSkill(filename: string, entry: string) {
  if (!filename.startsWith(`${path.dirname(entry)}${path.sep}`)) {
    throw new Error(`Resource leaves its skill directory: ${filename}`);
  }

  return filename;
}

/**
Load the optional _stop output template after checking its placement.
@param workflow - Workflow whose reference map receives the resolved template.
@param kind - Kind of the node containing the document.
@param document - Parsed instruction document.
@param target - Canonical document filename.
@param root - Canonical bundle directory.
*/
async function loadTemplate(
  workflow: Workflow,
  kind: string,
  document: Map<string, string>,
  target: string,
  root: string
) {
  const template = sectionReference(document, "Output template");

  if (!template) {
    return;
  }

  if (kind !== "stop") {
    throw new Error("Only the _stop document can declare an Output template.");
  }

  workflow.references.set("$template", insideSkill(await resolveReference(target, template, root), workflow.filename));
}

/**
Read resolved skill content and recursively inspect it only when it is a workflow.
@param workflow - Owning workflow.
@param id - Invoking node.
@param target - Resolved regular or workflow skill entry.
@param loadChild - Recursive workflow loader.
*/
async function readSkill(
  workflow: Workflow,
  id: string,
  target: string,
  loadChild: (filename: string) => Promise<Workflow>
) {
  const source = await Bun.file(target).text();

  workflow.references.set(id, target);
  workflow.documents.set(id, new Map([["Content", source]]));

  if (isWorkflow(source)) {
    workflow.calls.set(id, await loadChild(target));
  }
}

/**
Resolve a declared skill target without requiring it to be a workflow.
@param workflow - Owning workflow.
@param id - Invoking ordinary node.
@param identifier - Declared plugin:skill name.
@param root - Known bundle root.
@param loadChild - Recursive loader for locally available workflows.
*/
async function loadSkill(
  workflow: Workflow,
  id: string,
  identifier: string,
  root: string,
  loadChild: (filename: string) => Promise<Workflow>
) {
  const target = await resolveSkillTarget(identifier, root);

  if (!target) {
    workflow.unresolvedSkills.add(identifier);

    return;
  }

  await readSkill(workflow, id, target, loadChild);
}

/**
Read an ordinary or special node's Markdown content from its owning skill.
@param workflow - Owning workflow.
@param id - Node identifier.
@param kind - Special role or ordinary node.
@param reference - Relative steps filename.
@param root - Canonical bundle root.
*/
async function loadNodeFile(workflow: Workflow, id: string, kind: string, reference: string, root: string) {
  const resolved = await resolveReference(workflow.filename, reference, root);
  const target = insideSkill(resolved, workflow.filename);
  const document = parseNodeFile(await Bun.file(target).text());

  validateNodeContract(kind, document);
  workflow.references.set(id, target);
  workflow.documents.set(id, document);
  await loadTemplate(workflow, kind, document, target, root);
}

/**
Populate validated documents, templates, and nested calls for one workflow.
@param workflow - Workflow whose resource maps will be populated.
@param root - Canonical bundle directory.
@param loadChild - Loader with the active call ancestry bound to it.
*/
async function loadResources(workflow: Workflow, root: string, loadChild: (filename: string) => Promise<Workflow>) {
  for (const node of workflow.graph.nodes.values()) {
    if (node.skill) {
      await loadSkill(workflow, node.id, node.skill, root, loadChild);
    } else {
      await loadNodeFile(workflow, node.id, node.kind, node.reference, root);
    }
  }
}

/**
Populate resource maps after checking the entry skill identity.
@param document - Parsed workflow document.
@param canonical - Canonical entry path.
@param root - Canonical bundle root.
@param loadChild - Recursive child loader.
@param cache - Workflows already inspected during this validation.
@returns The workflow with validated documents and calls.
*/
async function populateWorkflow(
  document: ReturnType<typeof parseDocument>,
  canonical: string,
  root: string,
  loadChild: (filename: string) => Promise<Workflow>,
  cache: Map<string, Workflow>
) {
  const workflow: Workflow = {
    ...document,
    filename: canonical,
    references: new Map(),
    calls: new Map(),
    documents: new Map(),
    parallel: new Map(),
    unresolvedSkills: new Set(),
  };

  cache.set(canonical, workflow);
  await loadResources(workflow, root, loadChild);
  workflow.parallel = validateParallel(workflow.graph, workflow.documents);

  return workflow;
}

/**
Read checked workflow resources through an ancestry-aware child loader.
@param canonical - Validated canonical entry path.
@param root - Canonical bundle directory.
@param loadChild - Recursive child loader.
@param cache - Workflows already inspected during this validation.
@returns The complete validated workflow.
*/
async function readWorkflow(
  canonical: string,
  root: string,
  loadChild: (filename: string) => Promise<Workflow>,
  cache: Map<string, Workflow>
) {
  const document = parseDocument(await Bun.file(canonical).text());

  if (document.name !== path.basename(path.dirname(canonical))) {
    throw new Error("Workflow skill name must match its directory name.");
  }

  return populateWorkflow(document, canonical, root, loadChild, cache);
}

/**
Load all referenced workflows without executing instructions.
@param filename - Workflow entry path, relative to the process directory or absolute.
@param bundleRoot - Permitted resource root. Defaults to the entry document's directory.
@param cache - Internal resource cache that permits finite validation of recursive references.
@returns The validated workflow and nested callees. Broken references throw.
*/
export async function loadWorkflow(
  filename: string,
  bundleRoot = path.dirname(path.resolve(filename)),
  cache = new Map<string, Workflow>()
): Promise<Workflow> {
  const root = await realpath(bundleRoot);
  const canonical = await resolveReference(
    path.join(root, "entry.md"),
    path.relative(root, path.resolve(filename)),
    root
  );

  return cache.get(canonical) ?? readWorkflow(canonical, root, (child) => loadWorkflow(child, root, cache), cache);
}
