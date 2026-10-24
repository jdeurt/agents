import { type Decision, type Edge, type Graph, validateGraph } from "./graph.ts";

export interface ParallelRegion {
  fork: string;
  join: string;
  branches: Map<string, string[]>;
}

/**
Read a required, single-line control value from an instruction document.
@param document - Parsed control document.
@param heading - Exact section heading.
@returns The trimmed value. Missing or multiline values throw.
*/
function controlValue(document: Map<string, string> | undefined, heading: string) {
  const value = document?.get(heading)?.trim();

  if (!value || value.includes("\n")) {
    throw new Error(`Control document requires a single-line ${heading} section.`);
  }

  return value;
}

/**
Require a supported semantic role for the shared fork shape.
@param document - Control instruction document.
@returns The explicit fork or join role.
*/
function documentRole(document: Map<string, string> | undefined) {
  const isFork = document?.has("Fork") ?? false;
  const isJoin = document?.has("Join") ?? false;

  if (isFork === isJoin) {
    throw new Error("Control document requires a Fork or Join section identifying its pair.");
  }

  return isFork ? "fork" : "join";
}

/**
Resolve identical fork shapes into explicit document-declared semantic roles.
@param graph - Parsed graph whose parallel nodes will receive concrete roles.
@param documents - Instruction documents indexed by node identifier.
*/
function resolveRoles(graph: Graph, documents: Map<string, Map<string, string>>) {
  for (const node of graph.nodes.values()) {
    if (node.kind !== "parallel") {
      continue;
    }

    node.kind = documentRole(documents.get(node.id));
  }
}

/**
Reject terminals and nested controls inside one parallel branch.
@param graph - Workflow graph.
@param id - Branch node identifier.
*/
function checkBranchNode(graph: Graph, id: string) {
  const node = graph.nodes.get(id);

  if (!node || ["start", "stop"].includes(node.kind)) {
    throw new Error(`Parallel branch must reach its join without bypassing the join: ${id}`);
  }
}

/**
Collect a branch's nodes before its paired join, rejecting bypasses and nested controls.
@param graph - Workflow graph.
@param start - Direct fork successor.
@param join - Paired join identifier.
@returns The branch node identifiers excluding the join.
*/
function branchNodes(graph: Graph, start: string, join: string) {
  const visited = new Set<string>();
  const pending = [start];

  while (pending.length > 0) {
    const current = pending.pop();

    if (current === undefined || current === join || visited.has(current)) {
      continue;
    }

    checkBranchNode(graph, current);

    visited.add(current);
    pending.push(...graph.edges.filter((edge) => edge.from === current).map((edge) => edge.to));
  }

  return [...visited];
}

/**
Check disjoint branch ownership and reject external entry into a parallel region.
@param graph - Workflow graph.
@param region - Paired fork and join with branch membership.
*/
function checkBranches(graph: Graph, region: ParallelRegion) {
  const owners = new Map<string, string>();

  for (const [start, members] of region.branches) {
    if (members.length === 0) {
      throw new Error("A fork cannot connect directly to its join.");
    }

    for (const member of members) {
      if (owners.has(member)) {
        throw new Error(`Parallel branches overlap before their join: ${member}`);
      }

      owners.set(member, start);
    }
  }

  for (const edge of graph.edges) {
    if (owners.has(edge.to) && edge.from !== region.fork && owners.get(edge.from) !== owners.get(edge.to)) {
      throw new Error(`External or cross-branch entry: ${edge.from} -> ${edge.to}`);
    }

    if (edge.to === region.join && !owners.has(edge.from)) {
      throw new Error(`Join receives an edge outside its paired branches: ${region.join}`);
    }
  }
}

/**
Check branch mapping declarations without interpreting mapping prose.
@param outgoing - Fork edges.
@param mappings - Free-form Branches bullets with target prefixes.
@param fork - Fork identifier for diagnostics.
*/
function checkMappings(outgoing: Edge[], mappings: string, fork: string) {
  const declared = Array.from(mappings.matchAll(/^[-*+] ([A-Za-z_][A-Za-z0-9_]*): \S.+$/gm), (match) => match[1]);

  if (declared.length !== outgoing.length || outgoing.some((edge) => !declared.includes(edge.to))) {
    throw new Error(`Fork ${fork} Branches must map each outgoing target exactly once.`);
  }
}

/**
Construct one explicitly paired all-success parallel region.
@param graph - Workflow graph with resolved control roles.
@param documents - Parsed documents indexed by identifier.
@param fork - Fork identifier.
@returns The validated region and its statically disjoint branches.
*/
function readRegion(graph: Graph, documents: Map<string, Map<string, string>>, fork: string): ParallelRegion {
  const document = documents.get(fork);
  const join = controlValue(document, "Fork");
  const joinDocument = documents.get(join);
  const outgoing = graph.edges.filter((edge) => edge.from === fork);

  if (graph.nodes.get(join)?.kind !== "join" || controlValue(joinDocument, "Join") !== fork) {
    throw new Error(`Fork ${fork} must pair with a reciprocal join.`);
  }

  checkMappings(outgoing, document?.get("Branches") ?? "", fork);

  return {
    fork,
    join,
    branches: new Map(outgoing.map((edge) => [edge.to, branchNodes(graph, edge.to, join)])),
  };
}

/**
Validate and record one fork region while preserving unique join ownership.
@param graph - Workflow graph.
@param documents - Parsed instruction documents.
@param id - Fork identifier.
@param regions - Result map receiving the region.
@param paired - Join identifiers already owned by a fork.
*/
function addRegion(
  graph: Graph,
  documents: Map<string, Map<string, string>>,
  id: string,
  regions: Map<string, ParallelRegion>,
  paired: Set<string>
) {
  const region = readRegion(graph, documents, id);

  if (paired.has(region.join)) {
    throw new Error(`Join is paired with multiple forks: ${region.join}`);
  }

  checkBranches(graph, region);
  paired.add(region.join);
  regions.set(id, region);
}

/**
Validate explicit parallel pairings after instruction documents load.
@param graph - Graph whose parallel node roles will be resolved.
@param documents - Parsed node instruction documents.
@returns Parallel regions indexed by fork. Nested regions are permitted when their branches remain disjoint.
*/
export function validateParallel(graph: Graph, documents: Map<string, Map<string, string>>) {
  const regions = new Map<string, ParallelRegion>();
  const paired = new Set<string>();

  resolveRoles(graph, documents);

  for (const node of graph.nodes.values()) {
    if (node.kind !== "fork") {
      continue;
    }

    addRegion(graph, documents, node.id, regions, paired);
  }

  for (const node of graph.nodes.values()) {
    if (node.kind === "join" && !paired.has(node.id)) {
      throw new Error(`Join ${node.id} requires a paired fork.`);
    }
  }

  validateGraph(graph);

  return regions;
}

/**
Require at least one eligible parallel branch after assessment.
@param outgoing - Fork outgoing edges.
@param decisions - Complete ordinary branch assessments.
@returns All eligible edges.
*/
function eligibleForkEdges(outgoing: Edge[], decisions: Map<string, Decision>) {
  const selected = outgoing.filter((edge) => edge.condition === "" || decisions.get(edge.to) === "true");

  if (selected.length === 0) {
    throw new Error("Blocked: no parallel branch is eligible.");
  }

  return selected;
}

/**
Select every eligible branch at an explicit fork from complete agent assessments.
@param outgoing - Fork outgoing edges.
@param decisions - True, false, or unknown assessments for each ordinary branch.
@returns Selected branch edges. Unknown, missing, or empty selections block.
*/
function assessForkEdges(outgoing: Edge[], decisions: Map<string, Decision>): Edge[] {
  const judged = outgoing.filter((edge) => edge.condition !== "");

  if (decisions.keys().some((target) => judged.every((edge) => edge.to !== target))) {
    throw new Error("Unexpected fork decision target.");
  }

  if (judged.some((edge) => !decisions.has(edge.to) || decisions.get(edge.to) === "unknown")) {
    throw new Error("Blocked: assess every fork condition and resolve unknown evidence.");
  }

  return eligibleForkEdges(outgoing, decisions);
}

/**
Select branches only at an explicitly resolved fork node.
@param graph - Validated workflow graph.
@param id - Fork identifier.
@param decisions - Explicit condition assessments.
@returns Every eligible branch edge.
*/
export function selectForkEdges(graph: Graph, id: string, decisions: Map<string, Decision>) {
  if (graph.nodes.get(id)?.kind !== "fork") {
    throw new Error(`Not a declared fork: ${id}`);
  }

  return assessForkEdges(
    graph.edges.filter((edge) => edge.from === id),
    decisions
  );
}
