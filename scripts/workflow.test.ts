import { PACKET, SIMPLE_GRAPH, entry, withWorkflowFixture, writeWorkflow } from "./workflow-test-support.ts";
import { describe, expect, test } from "bun:test";
import { isWorkflow, parseDocument, parseNodeFile } from "../plugins/meta/skills/graph-workflows/scripts/document.ts";
import { parseGraph, selectEdge } from "../plugins/meta/skills/graph-workflows/scripts/graph.ts";
import assert from "node:assert/strict";
import { loadWorkflow } from "../plugins/meta/skills/graph-workflows/scripts/load.ts";
import path from "node:path";
import { runWorkflow } from "../plugins/meta/skills/graph-workflows/scripts/workflow.ts";
import { symlink } from "node:fs/promises";

const BRANCH_GRAPH = [
  "flowchart TD",
  '_start@{ shape: sm-circ, label: "Start" }',
  'a["a.md"]',
  'b["b.md"]',
  '_stop@{ shape: framed-circle, label: "Stop" }',
  "_start -->|a is supported| a",
  "_start -->|b is supported| b",
  "a --> _stop",
  "b --> _stop",
].join("\n");

const NESTED_GRAPH = [
  "flowchart TD",
  '_start@{ shape: sm-circ, label: "Start" }',
  "%% subagent:fresh",
  'child["sample:child"]',
  '_stop@{ shape: framed-circle, label: "Stop" }',
  "_start --> child",
  "child --> _stop",
].join("\n");

const REFERENCE_GRAPH = SIMPLE_GRAPH.replace("_start --> _stop", '_start --> task\ntask["task.md"]\ntask --> _stop');

/**
Check that a resolved prose skill is available without workflow parsing.
@param filename - Entry workflow path.
@param root - Plugin collection root.
*/
async function assertRegularSkill(filename: string, root: string) {
  const workflow = await loadWorkflow(filename, root);

  expect(workflow.references.get("child")).toEndWith("child/SKILL.md");
  expect(workflow.calls.has("child")).toBe(false);
}

describe("workflow documents and graph structure", () => {
  test("accepts graph-first entries, ordinary prose documents, and Markdown bullet markers", () => {
    expect(parseDocument(entry()).graph.nodes.has("_stop")).toBe(true);
    expect(parseDocument(entry(SIMPLE_GRAPH, "\n## Notes\n\n+ Supplied context.\n")).notes).toBe("+ Supplied context.");
    expect(isWorkflow("---\nname: ordinary\ndescription: Ordinary skill.\n---\n# Instructions")).toBe(false);
    expect(parseNodeFile("Return the explicitly supplied Fact unchanged.").size).toBe(0);
    expect(parseNodeFile("## Instructions\n```text\nLiteral example through the file end.\n").has("Instructions")).toBe(
      true
    );
    expect(parseNodeFile("## Example\nFirst.\n## Example\nSecond.\n").get("Example")).toContain("Second.");
    expect(parseNodeFile(PACKET.replaceAll("- Artifact:", "+ Artifact:")).has("Outputs")).toBe(true);
    expect(
      parseNodeFile(PACKET.replace("Return Artifact unchanged.", "```text\nReturn Fact.\n````")).has("Instructions")
    ).toBe(true);
    expect(() => parseNodeFile("")).toThrow("nonempty");
  });

  test.each([
    entry(SIMPLE_GRAPH, "\n## Notes\n\nUnlisted prose.\n"),
    entry(SIMPLE_GRAPH, "\n## Notes\n"),
    entry(SIMPLE_GRAPH, "\n## Inputs\n\n- Hidden contract.\n"),
    entry().replace("```mermaid", "# Introduction\n\n```mermaid"),
    entry().replace("mermaid-v1", "mermaid-v2"),
    entry().replace("name: sample\n", ""),
    entry().replace("description: Return a supplied artifact.", "description: 1"),
  ])("rejects malformed entries", (source) => {
    expect(() => parseDocument(source)).toThrow();
  });

  test.each([
    SIMPLE_GRAPH.replace('_stop@{ shape: framed-circle, label: "Stop" }', ""),
    `${SIMPLE_GRAPH}\n_start@{ shape: sm-circ, label: "Start" }`,
    SIMPLE_GRAPH.replace("_start --> _stop", "_start --> missing"),
    `${SIMPLE_GRAPH}\norphan["orphan.md"]\norphan --> _stop`,
    BRANCH_GRAPH.replace("a --> _stop", "a --> a"),
    `${SIMPLE_GRAPH}\n_stop --> _start`,
    SIMPLE_GRAPH.replace("-->", "--x"),
    `${SIMPLE_GRAPH}\nclick _start call evil()`,
    `${SIMPLE_GRAPH}\n%%{init: {}}%%`,
    `${SIMPLE_GRAPH}\nstyle _start fill:red`,
    BRANCH_GRAPH.replace("b is supported", "a is supported"),
    NESTED_GRAPH.replace("subagent:fresh", "subagent:invented"),
    `${SIMPLE_GRAPH}\n%% subagent:fresh`,
    `${SIMPLE_GRAPH}\n%% subagent:fresh\n%% subagent:inherit`,
    `${SIMPLE_GRAPH}\n%% subagent:unknown`,
    BRANCH_GRAPH.replace("-->|b is supported|", "-->"),
  ])("rejects malformed, unreachable, or executable Mermaid", (source) => {
    expect(() => parseGraph(source)).toThrow();
  });

  test("allows cycles with a structural exit and node-specific agent preferences", () => {
    const graph = parseGraph(
      BRANCH_GRAPH.replace("a --> _stop", "a -->|retry is justified| a\na -->|task is complete| _stop")
    );

    expect(
      selectEdge(
        graph,
        "a",
        new Map([
          ["a", "false"],
          ["_stop", "true"],
        ])
      )?.to
    ).toBe("_stop");
    expect(parseGraph(NESTED_GRAPH).nodes.get("child")?.agent).toBe("subagent:fresh");
    expect(parseGraph(NESTED_GRAPH.replace("subagent:fresh", "subagent:inherit")).nodes.get("child")?.agent).toBe(
      "subagent:inherit"
    );
  });

  test("requires complete unambiguous ordinary assessments", () => {
    const graph = parseGraph(BRANCH_GRAPH);

    expect(
      selectEdge(
        graph,
        "_start",
        new Map([
          ["a", "true"],
          ["b", "false"],
        ])
      )?.to
    ).toBe("a");
    expect(() => selectEdge(graph, "_start", new Map())).toThrow("assess every condition");
    expect(() =>
      selectEdge(
        graph,
        "_start",
        new Map([
          ["a", "true"],
          ["b", "unknown"],
        ])
      )
    ).toThrow("unknown");
    expect(() =>
      selectEdge(
        graph,
        "_start",
        new Map([
          ["a", "true"],
          ["b", "true"],
        ])
      )
    ).toThrow("multiple conditions");
    expect(() =>
      selectEdge(
        graph,
        "_start",
        new Map([
          ["a", "false"],
          ["b", "false"],
        ])
      )
    ).toThrow("no condition");
    expect(() => selectEdge(graph, "_start", new Map([["elsewhere", "true"]]))).toThrow("Unexpected decision");
    expect(selectEdge(graph, "_stop", new Map())).toBeUndefined();
  });
});

describe("reference validation and calls", () => {
  test("rejects mismatched skill identity and missing public contracts", async () =>
    withWorkflowFixture(async (root) => {
      const filename = await writeWorkflow(root, "sample");

      await Bun.write(filename, entry().replace("name: sample", "name: mismatched-name"));
      await assert.rejects(loadWorkflow(filename), /match its directory name/);
      await Bun.write(filename, entry());
      await Bun.write(path.join(root, "sample/steps/_start.md"), "# Missing public inputs\n");
      await assert.rejects(loadWorkflow(filename), /Inputs bullets/);
    }));

  test("rejects missing templates and references", async () =>
    withWorkflowFixture(async (root) => {
      const filename = await writeWorkflow(root, "sample");

      await Bun.write(
        path.join(root, "sample/steps/_stop.md"),
        `${PACKET}\n## Output template\n\n[Result](missing.md)\n`
      );
      await assert.rejects(loadWorkflow(filename));
      await Bun.write(filename, entry(REFERENCE_GRAPH));
      await assert.rejects(loadWorkflow(filename));
    }));

  test("rejects path syntax instead of filenames and skill identifiers", () => {
    expect(() => parseGraph(REFERENCE_GRAPH.replace("task.md", "../outside.md"))).toThrow("must name");
    expect(() => parseGraph(REFERENCE_GRAPH.replace("task.md", "[Task](task.md)"))).toThrow();
    expect(() => parseGraph(SIMPLE_GRAPH.replace("flowchart TD", "flowchart LR"))).toThrow("Use flowchart TD");
  });

  test("rejects symlink targets outside the skill", async () =>
    withWorkflowFixture(async (root) => {
      const filename = await writeWorkflow(root, "sample", REFERENCE_GRAPH);

      await Bun.write(path.join(root, "outside.md"), PACKET);
      await symlink(path.join(root, "outside.md"), path.join(root, "sample/steps/task.md"));
      await assert.rejects(loadWorkflow(filename), /bundle root/);
    }));

  test("accepts regular skills, workflow skills, and recursive skill references", async () =>
    withWorkflowFixture(async (root) => {
      const skills = path.join(root, "sample/skills");
      const parent = await writeWorkflow(skills, "parent", NESTED_GRAPH);
      const child = await writeWorkflow(skills, "child", NESTED_GRAPH.replace("sample:child", "sample:parent"));
      const workflow = await loadWorkflow(parent, root);

      expect(workflow.calls.get("child")?.calls.get("child")?.filename).toBe(parent);
      await Bun.write(
        child,
        "---\nname: child\ndescription: Return a supplied artifact.\n---\nReturn the supplied artifact.\n"
      );
      await assertRegularSkill(parent, root);
      await Bun.write(child, entry().replace("name: sample", "name: child"));
      expect(await loadWorkflow(parent, root)).toBeDefined();
      await assert.rejects(runWorkflow(["validate", parent, "--invalid", "value"]), /Usage/);
    }));

  test("leaves unavailable plugin namespaces for installed skill resolution", async () =>
    withWorkflowFixture(async (root) => {
      const parent = await writeWorkflow(root, "sample", NESTED_GRAPH.replace("sample:child", "other:skill"));
      const workflow = await loadWorkflow(parent);

      expect([...workflow.unresolvedSkills]).toEqual(["other:skill"]);
      expect(await runWorkflow(["validate", parent])).toContain("Resolve installed skills before execution");
    }));
});
