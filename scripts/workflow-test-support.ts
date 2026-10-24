import { mkdtemp, realpath, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";

export const SIMPLE_GRAPH = [
  "flowchart TD",
  '_start@{ shape: sm-circ, label: "Start" }',
  '_stop@{ shape: framed-circle, label: "Stop" }',
  "_start --> _stop",
].join("\n");

export const PACKET = [
  "## Purpose",
  "Return a supplied artifact.",
  "## Inputs",
  "- Artifact: the supplied text.",
  "## Instructions",
  "Return Artifact unchanged.",
  "## Outputs",
  "- Artifact: the supplied text.",
  "",
].join("\n");

/**
Construct a standard skill entry around a restricted graph.
@param graph - Mermaid graph body.
@param suffix - Optional body content after the graph.
@returns A complete opted-in skill document.
*/
export function entry(graph = SIMPLE_GRAPH, suffix = "") {
  return (
    `---\nname: sample\ndescription: Return a supplied artifact.\nmetadata:\n  workflow: mermaid-v1\n---\n\n` +
    `\`\`\`mermaid\n${graph}\n\`\`\`\n${suffix}`
  );
}

/**
Write a workflow and its terminal documents into a fixture directory.
@param root - Temporary bundle root.
@param name - Child directory to create.
@param graph - Graph body or the simple terminal graph by default.
@returns The workflow entry path.
*/
export async function writeWorkflow(root: string, name: string, graph = SIMPLE_GRAPH) {
  const directory = path.join(root, name);
  const filename = path.join(directory, "SKILL.md");

  await Bun.write(
    filename,
    entry(graph).replace("name: sample", () => `name: ${name}`)
  );
  await Bun.write(path.join(directory, "steps/_start.md"), PACKET);
  await Bun.write(path.join(directory, "steps/_stop.md"), PACKET);

  return filename;
}

/**
Own a temporary bundle directory for one asynchronous test.
@param use - Test operation receiving the canonical bundle path.
@returns The operation's result after removing all fixtures.
*/
export async function withWorkflowFixture<T>(use: (root: string) => Promise<T>) {
  const temporary = await mkdtemp(path.join(tmpdir(), "agents-workflow-"));
  const root = await realpath(temporary);

  try {
    return await use(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
