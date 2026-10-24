const THIRD_CAPTURE = 3;

export interface WorkflowNode {
  id: string;
  kind: "start" | "stop" | "node" | "parallel" | "fork" | "join";
  reference: string;
  skill?: string;
  agent?: "subagent:fresh" | "subagent:inherit";
}

/**
Interpret only the requested expanded Mermaid control shapes.
@param line - One trimmed node declaration.
@returns The control node, or undefined for another statement.
*/
function expandedNode(line: string): WorkflowNode | undefined {
  const match = /^([A-Za-z_][A-Za-z0-9_]*)@\{ shape: (sm-circ|framed-circle|fork), label: "([^"<>`{}\\]+)" \}$/.exec(
    line
  );
  const id = match?.[1];
  const shape = match?.[2];
  const label = match?.[THIRD_CAPTURE];

  if (!id || !label) {
    return undefined;
  }

  if (id === "_start" && shape === "sm-circ" && label === "Start") {
    return { id, kind: "start", reference: `steps/${id}.md` };
  }

  if (id === "_stop" && shape === "framed-circle" && label === "Stop") {
    return { id, kind: "stop", reference: `steps/${id}.md` };
  }

  if (["_start", "_stop"].includes(id)) {
    throw new Error("Reserved terminal identifiers require their exact Start and Stop shapes.");
  }

  if (shape === "fork" && label === "Fork or Join") {
    return { id, kind: "parallel", reference: `steps/${id}.md` };
  }

  throw new Error(`Unsupported expanded node: ${line}`);
}

/**
Interpret an ordinary node target as a filename or skill identifier.
@param id - Node identifier.
@param target - Filename within steps or plugin:skill identifier.
@returns One ordinary node regardless of target form.
*/
function ordinaryNode(id: string, target: string): WorkflowNode {
  if (/^[A-Za-z0-9_.-]+:[A-Za-z0-9_.-]+$/.test(target)) {
    return { id, kind: "node", reference: target, skill: target };
  }

  if (!target.endsWith(".md") || target.includes("/") || target.includes(":") || target.includes("\n")) {
    throw new Error(`Node ${id} must name a Markdown file in steps or a plugin:skill identifier.`);
  }

  return { id, kind: "node", reference: `steps/${target}` };
}

/**
Parse an ordinary identifier and its Markdown reference.
@param line - One trimmed graph statement.
@returns A node, or undefined when the statement is not a declaration.
*/
function referencedNode(line: string): WorkflowNode | undefined {
  const match = /^([A-Za-z_][A-Za-z0-9_]*)\["([^"<>`{}\\]+)"\]$/.exec(line);
  const id = match?.[1];
  const target = match?.[2];

  return !id || !target || ["_start", "_stop"].includes(id) ? undefined : ordinaryNode(id, target);
}

/**
Parse a declaration without running Mermaid code.
@param line - One trimmed graph statement.
@returns A referenced or expanded control node, or undefined for an edge.
*/
export function parseNode(line: string) {
  return line.includes("@{") ? expandedNode(line) : referencedNode(line);
}
