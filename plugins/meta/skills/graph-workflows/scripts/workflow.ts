import { selectForkEdges } from "./parallel.ts";
import { type Decision, selectEdge } from "./graph.ts";
import { loadWorkflow, type Workflow } from "./load.ts";

const USAGE =
  "Usage: workflow.ts validate|show|next|fork FILE [NODE] [--root DIR] [--true TARGET|--false TARGET|--unknown TARGET]";

/**
Parse explicit branch assessments and the optional bundle root.
@param args - Arguments after the command, file, and optional node identifier.
@returns Decisions and an optional root. Invalid options throw.
*/
function parseOptions(args: string[]) {
  const decisions = new Map<string, Decision>();

  let root: string | undefined;

  for (let index = 0; index < args.length; index += 2) {
    const option = args[index];
    const value = args[index + 1];

    if (!value || value.startsWith("--")) {
      throw new Error(USAGE);
    }

    if (option === "--root" && root === undefined) {
      root = value;
    } else if (["--true", "--false", "--unknown"].includes(option ?? "")) {
      const decision = option?.slice(2);

      if (decisions.has(value) || (decision !== "true" && decision !== "false" && decision !== "unknown")) {
        throw new Error(`Invalid or duplicate decision: ${value}`);
      }

      decisions.set(value, decision);
    } else {
      throw new Error(USAGE);
    }
  }

  return { decisions, root };
}

/**
Describe one node and the resources needed to execute it.
@param workflow - Validated workflow containing resources and outgoing edges.
@param selected - Selected identifier, or undefined after _stop returns.
@returns A printable node description. Unknown identifiers throw.
*/
function describeNode(workflow: Workflow, selected: string | undefined) {
  const current = selected === undefined ? undefined : workflow.graph.nodes.get(selected);

  if (selected !== undefined && !current) {
    throw new Error(`Unknown node: ${selected}`);
  }

  return JSON.stringify(
    {
      node: current ?? null,
      reference: selected === undefined ? null : (workflow.references.get(selected) ?? null),
      outgoing: workflow.graph.edges.filter((edge) => edge.from === selected),
      callee: selected === undefined ? null : (workflow.calls.get(selected)?.filename ?? null),
      document: selected === undefined ? null : Object.fromEntries(workflow.documents.get(selected) ?? []),
      notes: workflow.notes,
      note: "Navigation only. Agent judgment, execution, call/return state, and runtime state remains with the executor.",
    },
    undefined,
    2
  );
}

/**
Select a navigation target using explicit assessments.
@param workflow - Validated workflow.
@param command - Show or next command.
@param id - Current identifier.
@param decisions - Outgoing assessments.
@returns The selected node description.
*/
function navigate(workflow: Workflow, command: string, id: string, decisions: Map<string, Decision>) {
  const selected = command === "next" ? selectEdge(workflow.graph, id, decisions)?.to : id;

  return command === "fork"
    ? JSON.stringify(
        { branches: selectForkEdges(workflow.graph, id, decisions), join: workflow.parallel.get(id)?.join },
        undefined,
        2
      )
    : describeNode(workflow, selected);
}

/**
List identifiers that need resolution through an installed skill registry.
@param workflow - Entry workflow whose locally available children are inspected.
@returns Unique unresolved skill identifiers from the reachable resource graph.
*/
function unresolvedSkills(workflow: Workflow) {
  const pending = [workflow];
  const visited = new Set<Workflow>();
  const identifiers = new Set<string>();

  while (pending.length > 0) {
    const current = pending.pop();

    if (!current || visited.has(current)) {
      continue;
    }

    visited.add(current);

    for (const identifier of current.unresolvedSkills) {
      identifiers.add(identifier);
    }

    pending.push(...current.calls.values());
  }

  return [...identifiers];
}

/**
Report structural validation without claiming unresolved installed dependencies were checked.
@param workflow - Validated local workflow resources.
@param filename - Requested entry path.
@returns The validation result and any unresolved skill identifiers.
*/
function validationResult(workflow: Workflow, filename: string) {
  const unresolved = unresolvedSkills(workflow);

  return unresolved.length === 0
    ? `Valid: ${filename} (graph and local references checked)`
    : `Valid graph: ${filename}. Resolve installed skills before execution: ${unresolved.join(", ")}`;
}

/**
Run a checked CLI command after argument parsing.
@param command - Supported command name.
@param filename - Entry workflow path.
@param node - Requested node identifier or undefined for START.
@param options - Parsed bundle root and branch assessments.
@returns A printable validation or navigation result.
*/
async function runCommand(
  command: string,
  filename: string,
  node: string | undefined,
  options: ReturnType<typeof parseOptions>
) {
  const workflow = await loadWorkflow(filename, options.root);

  if ((command === "validate" && node) || (!["next", "fork"].includes(command) && options.decisions.size > 0)) {
    throw new Error(USAGE);
  }

  return command === "validate"
    ? validationResult(workflow, filename)
    : navigate(workflow, command, node ?? "_start", options.decisions);
}

/**
Separate the optional node identifier from flags before command execution.
@param command - Supported command name.
@param filename - Entry workflow path.
@param rest - Optional node followed by flags.
@returns The printable command result.
*/
function runPositionals(command: string, filename: string, rest: string[]) {
  const node = rest[0]?.startsWith("--") ? undefined : rest.shift();

  return runCommand(command, filename, node, parseOptions(rest));
}

/**
Validate or navigate Markdown workflows without executing instructions.
@param args - Command, entry filename, optional node, and assessment flags.
@returns A validation summary or node description.
*/
export async function runWorkflow(args: string[]) {
  const [command = "", filename, ...rest] = args;

  if (!filename || !["validate", "show", "next", "fork"].includes(command)) {
    throw new Error(USAGE);
  }

  return runPositionals(command, filename, rest);
}

/**
Print a command result and convert failures into a nonzero CLI status.
@param args - Command-line arguments after the script path.
*/
export async function workflowMain(args: string[]) {
  try {
    console.log(await runWorkflow(args));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (import.meta.main) {
  await workflowMain(Bun.argv.slice(2));
}
