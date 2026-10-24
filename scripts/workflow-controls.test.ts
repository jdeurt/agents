import { expect, test } from "bun:test";
import { selectForkEdges, validateParallel } from "../plugins/meta/skills/workflow-execution/scripts/parallel.ts";
import assert from "node:assert/strict";
import { loadWorkflow } from "../plugins/meta/skills/workflow-execution/scripts/load.ts";
import { parseGraph } from "../plugins/meta/skills/workflow-execution/scripts/graph.ts";
import { runWorkflow } from "../plugins/meta/skills/workflow-execution/scripts/workflow.ts";

const EXAMPLE = "plugins/meta/skills/change-brief/SKILL.md";
const ROOT = "plugins/meta/skills";
const FORK_GRAPH = [
  "flowchart TD",
  '_start@{ shape: sm-circ, label: "Start" }',
  'split@{ shape: fork, label: "Fork or Join" }',
  'a["a.md"]',
  'b["b.md"]',
  'gather@{ shape: fork, label: "Fork or Join" }',
  '_stop@{ shape: framed-circle, label: "Stop" }',
  "_start --> split",
  "split -->|a is needed| a",
  "split -->|b is needed| b",
  "a --> gather",
  "b --> gather",
  "gather --> _stop",
].join("\n");

/**
Build the two minimal reciprocal control documents.
@returns Document sections declaring roles, pairs, and free-form branch mappings.
*/
function controlDocuments() {
  return new Map([
    [
      "split",
      new Map([
        ["Fork", "gather"],
        ["Branches", "- a: supply Artifact. Return A.\n- b: supply Artifact. Return B."],
      ]),
    ],
    ["gather", new Map([["Join", "split"]])],
  ]);
}

test("pairs explicit fork/join roles and selects all eligible branches", () => {
  const graph = parseGraph(FORK_GRAPH);
  const regions = validateParallel(graph, controlDocuments());

  expect(regions.get("split")?.join).toBe("gather");
  expect(
    selectForkEdges(
      graph,
      "split",
      new Map([
        ["a", "true"],
        ["b", "true"],
      ])
    ).map((edge) => edge.to)
  ).toEqual(["a", "b"]);
  expect(
    selectForkEdges(
      graph,
      "split",
      new Map([
        ["a", "true"],
        ["b", "false"],
      ])
    ).map((edge) => edge.to)
  ).toEqual(["a"]);
  expect(() =>
    selectForkEdges(
      graph,
      "split",
      new Map([
        ["a", "true"],
        ["b", "unknown"],
      ])
    )
  ).toThrow("unknown");
  expect(() =>
    selectForkEdges(
      graph,
      "split",
      new Map([
        ["a", "false"],
        ["b", "false"],
      ])
    )
  ).toThrow("no parallel");
  expect(() => selectForkEdges(graph, "a", new Map())).toThrow("Not a declared fork");
});

test("allows independent unconditional branches only at an explicit fork", () => {
  const graph = parseGraph(FORK_GRAPH.replace("-->|a is needed|", "-->").replace("-->|b is needed|", "-->"));

  validateParallel(graph, controlDocuments());
  expect(selectForkEdges(graph, "split", new Map()).map((edge) => edge.to)).toEqual(["a", "b"]);
});

test.each([
  FORK_GRAPH.replace("b --> gather", "b --> a"),
  FORK_GRAPH.replace("a --> gather", "a --> _stop"),
  FORK_GRAPH.replace("-->|b is needed|", "-->"),
])("rejects overlapping branches, join bypasses, and invalid fork conditions", (source) => {
  expect(() => validateParallel(parseGraph(source), controlDocuments())).toThrow();
});

test("rejects missing roles, unmatched joins, and incomplete branch mappings", () => {
  const missingRole = controlDocuments();
  const unmatched = controlDocuments();
  const missingMapping = controlDocuments();

  missingRole.set("split", new Map());
  unmatched.set("gather", new Map([["Join", "other"]]));
  missingMapping.set(
    "split",
    new Map([
      ["Fork", "gather"],
      ["Branches", "- a: supply Artifact. Return A."],
    ])
  );
  expect(() => validateParallel(parseGraph(FORK_GRAPH), missingRole)).toThrow("Fork or Join");
  expect(() => validateParallel(parseGraph(FORK_GRAPH), unmatched)).toThrow("reciprocal join");
  expect(() => validateParallel(parseGraph(FORK_GRAPH), missingMapping)).toThrow("map each outgoing target");
});

test("validates and navigates the real nested parallel example without executing it", async () => {
  const workflow = await loadWorkflow(EXAMPLE, ROOT);

  expect(workflow.parallel.get("split")?.branches.get("review")).toEqual(["review"]);
  expect(workflow.calls.get("review")?.documents.has("_stop")).toBe(true);
  expect(
    await runWorkflow(["fork", EXAMPLE, "split", "--true", "review", "--true", "clarity", "--root", ROOT])
  ).toContain('"join": "gather"');
  await assert.rejects(runWorkflow(["next", EXAMPLE, "split", "--root", ROOT]), /fork command/);
  expect(
    await runWorkflow(["next", EXAMPLE, "gather", "--true", "_stop", "--false", "qualify", "--root", ROOT])
  ).toContain('"id": "_stop"');
});

test("permits several nodes in a branch and nested fork/join regions", () => {
  const source = FORK_GRAPH.replace('a["a.md"]', () =>
    [
      'a["a.md"]',
      'inside@{ shape: fork, label: "Fork or Join" }',
      'x["x.md"]',
      'y["y.md"]',
      'inside_join@{ shape: fork, label: "Fork or Join" }',
    ].join("\n")
  ).replace("a --> gather", () =>
    [
      "a --> inside",
      "inside --> x",
      "inside --> y",
      "x --> inside_join",
      "y --> inside_join",
      "inside_join --> gather",
    ].join("\n")
  );
  const graph = parseGraph(source);
  const documents = controlDocuments();

  documents.set(
    "inside",
    new Map([
      ["Fork", "inside_join"],
      ["Branches", "- x: supply input. Return X.\n- y: supply input. Return Y."],
    ])
  );
  documents.set("inside_join", new Map([["Join", "inside"]]));
  expect(validateParallel(graph, documents).get("inside")?.join).toBe("inside_join");
});

test.each(["", "|ready|"])("joins retain ordinary edge rules after resolving shape roles", (label) => {
  const source = FORK_GRAPH.replace("gather --> _stop", () =>
    ['c["c.md"]', 'd["d.md"]', `gather -->${label} c`, `gather -->${label} d`, "c --> _stop", "d --> _stop"].join("\n")
  );

  expect(() => validateParallel(parseGraph(source), controlDocuments())).toThrow("Duplicate branch");
});
