import { parseNode, type WorkflowNode } from "./nodes.ts";

const THIRD_CAPTURE = 3;

export interface Edge {
  from: string;
  to: string;
  condition: string;
}

export interface Graph {
  nodes: Map<string, WorkflowNode>;
  edges: Edge[];
}

/**
Find all nodes reachable through the supplied directed edges.
@param start - Initial node identifier.
@param edges - Edges oriented in the traversal direction.
@returns Reachable node identifiers, including the initial node.
*/
function reachable(start: string, edges: Edge[]) {
  const visited = new Set<string>();
  const pending = [start];

  while (pending.length > 0) {
    const current = pending.pop();

    if (current === undefined || visited.has(current)) {
      continue;
    }

    visited.add(current);
    pending.push(...edges.filter((edge) => edge.from === current).map((edge) => edge.to));
  }

  return visited;
}

/**
Check branch declarations and both directions of structural reachability.
@param graph - Graph with checked terminals and edge endpoints.
*/
function checkReachability(graph: Graph) {
  const { nodes, edges } = graph;
  const forward = reachable("_start", edges);
  const reverse = reachable(
    "_stop",
    edges.map((edge) => ({ ...edge, from: edge.to, to: edge.from }))
  );

  for (const id of nodes.keys()) {
    const outgoing = edges.filter((edge) => edge.from === id);
    const targets = outgoing.map((edge) => edge.to);
    const labels = outgoing.map((edge) => edge.condition);

    if (
      new Set(targets).size !== targets.length ||
      (!["parallel", "fork"].includes(nodes.get(id)?.kind ?? "") && new Set(labels).size !== labels.length)
    ) {
      throw new Error(`Duplicate branch target or condition at ${id}.`);
    }

    if (labels.includes("") && labels.some(Boolean)) {
      throw new Error(`Node ${id} cannot mix unconditional and conditional outgoing edges.`);
    }

    if (
      !["parallel", "fork"].includes(nodes.get(id)?.kind ?? "") &&
      labels.filter((label) => label === "").length > 1
    ) {
      throw new Error(`Multiple unconditional edges require an explicit fork: ${id}`);
    }

    if (!forward.has(id) || !reverse.has(id)) {
      throw new Error(`Node ${id} must be reachable from _start and able to reach _stop.`);
    }
  }
}

/**
Reject undefined edges, invalid terminals, ambiguous static branches, and unreachable nodes.
@param graph - Parsed graph to check.
*/
export function validateGraph(graph: Graph) {
  const { nodes, edges } = graph;

  if (!nodes.has("_start") || !nodes.has("_stop")) {
    throw new Error("Declare exactly _start and _stop terminals.");
  }

  for (const edge of edges) {
    if (!nodes.has(edge.from) || !nodes.has(edge.to) || edge.to === "_start" || edge.from === "_stop") {
      throw new Error(`Invalid edge: ${edge.from} -> ${edge.to}`);
    }
  }

  checkReachability(graph);
}

/**
Read an edge's checked regex captures without relying on implicit node creation.
@param match - Matched edge statement.
@returns The edge with trimmed condition text.
*/
function parsedEdge(match: RegExpExecArray): Edge {
  const from = match[1];
  const condition = match[2]?.trim() ?? "";
  const to = match[THIRD_CAPTURE];

  if (!from || !to || (!condition && match[2] !== undefined)) {
    throw new Error("Malformed workflow edge.");
  }

  return { from, condition, to };
}

/**
Read an exact agent-preference comment for the immediately following declaration.
@param line - Trimmed comment line.
@returns The preference or undefined for ordinary comments.
*/
function agentAnnotation(line: string): WorkflowNode["agent"] {
  if (line === "%% subagent:fresh") {
    return "subagent:fresh";
  }

  if (line === "%% subagent:inherit") {
    return "subagent:inherit";
  }

  if (line.startsWith("%% subagent") || line.startsWith("%% agent ")) {
    throw new Error("Use %% subagent:fresh or %% subagent:inherit directly above a node.");
  }

  return undefined;
}

/**
Attach unambiguous agent preferences after all node declarations are available.
@param graph - Parsed graph.
@param annotations - Preferences indexed by node identifier.
*/
function attachAnnotations(graph: Graph, annotations: Map<string, NonNullable<WorkflowNode["agent"]>>) {
  for (const [id, preference] of annotations) {
    const node = graph.nodes.get(id);

    if (!node) {
      throw new Error(`Agent annotation references an undeclared node: ${id}`);
    }

    node.agent = preference;
  }
}

/**
Append one declared node or conditional/unconditional edge.
@param graph - Parsed graph receiving the declaration.
@param line - Trimmed statement text.
@param node - Already parsed node, or undefined for an edge.
*/
function appendStatement(graph: Graph, line: string, node: WorkflowNode | undefined) {
  const edge = /^([A-Za-z_][A-Za-z0-9_]*) -->(?:\|([^|"<>`{}\\]+)\|)? ([A-Za-z_][A-Za-z0-9_]*)$/.exec(line);

  if (node) {
    if (graph.nodes.has(node.id)) {
      throw new Error(`Duplicate node: ${node.id}`);
    }

    graph.nodes.set(node.id, node);
  } else if (edge?.[1]) {
    graph.edges.push(parsedEdge(edge));
  } else {
    throw new Error(`Unsupported Mermaid statement: ${line}`);
  }
}

/**
Parse a flowchart without invoking Mermaid, rendering HTML, or evaluating code.
@param source - Contents of the workflow's Mermaid fence.
@returns The validated declared nodes and conditional edges.
*/
export function parseGraph(source: string): Graph {
  const lines = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const graph: Graph = { nodes: new Map(), edges: [] };
  const annotations = new Map<string, NonNullable<WorkflowNode["agent"]>>();
  const direction = lines.shift();

  if (direction !== "flowchart TD") {
    throw new Error("Use flowchart TD.");
  }

  for (const [index, line] of lines.entries()) {
    const node = parseNode(line);
    const annotation = agentAnnotation(line);
    const nextNode = annotation ? parseNode(lines[index + 1] ?? "") : undefined;

    if (annotation) {
      if (!nextNode) {
        throw new Error("A subagent comment must immediately precede a node declaration.");
      }

      annotations.set(nextNode.id, annotation);
      continue;
    }

    if (line.startsWith("%% ")) {
      continue;
    }

    appendStatement(graph, line, node);
  }

  attachAnnotations(graph, annotations);
  validateGraph(graph);

  return graph;
}

export type Decision = "true" | "false" | "unknown";

/**
Select among outgoing edges after all ordinary assessments are known.
@param outgoing - Current node's outgoing edges.
@param id - Current node identifier.
@param decisions - Complete true or false assessments.
@returns The selected edge, or undefined at _stop. Ambiguity or no match throws.
*/
function selectAssessed(outgoing: Edge[], id: string, decisions: Map<string, Decision>) {
  const selected = outgoing.filter((edge) => decisions.get(edge.to) === "true");

  if (selected.length > 1) {
    throw new Error("Blocked: multiple conditions are true. Clarify the conditions or evidence.");
  }

  if (id === "_stop") {
    return;
  }

  if (selected.length === 1) {
    return selected[0];
  }

  if (outgoing.some((edge) => edge.condition === "")) {
    return outgoing.find((edge) => edge.condition === "");
  }

  throw new Error("Blocked: no condition is true.");
}

/**
Require complete assessments for the current node's ordinary branches.
@param outgoing - Current node's outgoing edges.
@param id - Current node identifier.
@param decisions - Agent-provided branch assessments.
@returns The unique selected edge or undefined at _stop.
*/
function selectOutgoing(outgoing: Edge[], id: string, decisions: Map<string, Decision>): Edge | undefined {
  const judged = outgoing.filter((edge) => edge.condition !== "");

  for (const target of decisions.keys()) {
    if (judged.every((edge) => edge.to !== target)) {
      throw new Error(`Unexpected decision target: ${target}`);
    }
  }

  if (judged.some((edge) => !decisions.has(edge.to) || decisions.get(edge.to) === "unknown")) {
    throw new Error("Blocked: assess every condition and resolve unknown evidence before selecting a branch.");
  }

  return selectAssessed(outgoing, id, decisions);
}

/**
Select one branch using explicit agent assessments of every nonreserved condition.
@param graph - Validated graph containing the current node.
@param id - Current node identifier.
@param decisions - Assessments keyed by outgoing target identifier.
@returns The selected edge, or undefined at _stop. Missing or ambiguous evidence throws.
*/
export function selectEdge(graph: Graph, id: string, decisions: Map<string, Decision>): Edge | undefined {
  if (graph.nodes.get(id)?.kind === "fork") {
    throw new Error("Use the fork command to select parallel branches.");
  }

  if (!graph.nodes.has(id)) {
    throw new Error(`Unknown node: ${id}`);
  }

  return selectOutgoing(
    graph.edges.filter((edge) => edge.from === id),
    id,
    decisions
  );
}
