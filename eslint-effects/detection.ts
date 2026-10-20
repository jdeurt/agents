import { binding, field, isWithin, kind, text } from "./ast.ts";
import { filesystemCalls, globalEffects } from "./vocabulary.ts";
import type { Rule } from "eslint";

export interface Effect {
  category: string;
  evidence: string;
}

/**
Read a static dotted call path. Computed properties deliberately remain unknown.
@param node - Callee to inspect.
@returns The path segments, or an empty array.
*/
function callPath(node: unknown): string[] {
  if (kind(node) === "Identifier") {
    return [text(node, "name")];
  }

  if (kind(node) === "MemberExpression" && !field(node, "computed")) {
    const base = callPath(field(node, "object"));

    return base.length > 0 ? [...base, text(field(node, "property"), "name")] : [];
  }

  return [];
}

/**
Resolve supported ES imports to their module and exported path.
@param definition - Import binding definition.
@param suffix - Member path after the local binding.
@returns The canonical module and exported member path.
*/
function importedCall(definition: unknown, suffix: string[]) {
  const specifier = field(definition, "node");
  const moduleName = text(field(field(definition, "parent"), "source"), "value");
  const imported = field(specifier, "imported");
  const member = kind(specifier) === "ImportSpecifier" ? text(imported, "name") || text(imported, "value") : "";
  const path = member ? [member, ...suffix] : suffix;

  return { moduleName: moduleName.replace(/^node:/u, ""), member: path.join(".") };
}

/**
Identify explicitly supported filesystem and process imports.
@param moduleName - Canonical module name.
@param member - Exported call path.
@returns The effect category when supported.
*/
function importedCategory(moduleName: string, member: string): string | undefined {
  const fsMember = member.replace(/^promises\./u, "");

  if (["fs", "fs/promises"].includes(moduleName) && filesystemCalls.has(fsMember)) {
    return "filesystem";
  }

  return moduleName === "child_process" &&
    ["spawn", "spawnSync", "exec", "execSync", "execFile", "execFileSync", "fork"].includes(member)
    ? "process"
    : undefined;
}

/**
Recognize direct ambient calls and lexical Node imports, never arbitrary method names.
@param context - Active rule context.
@param node - Call expression.
@param customCalls - Explicit project-owned global call paths mapped to categories.
@returns High-confidence evidence, or undefined.
*/
export function callEffect(
  context: Rule.RuleContext,
  node: Rule.Node,
  customCalls: Record<string, string>
): Effect | undefined {
  const path = callPath(field(node, "callee"));
  const root = path[0];
  const variable = root ? binding(context, node, root) : undefined;
  const definition = variable?.defs[0];
  const direct = path.join(".");

  if (definition?.type === "ImportBinding") {
    const imported = importedCall(definition, path.slice(1));
    const importedEffect = importedCategory(imported.moduleName, imported.member);

    return importedEffect
      ? { category: importedEffect, evidence: `${imported.moduleName}.${imported.member}()` }
      : undefined;
  }

  if (!variable || variable.defs.length === 0) {
    const configured = Object.hasOwn(customCalls, direct) ? customCalls[direct] : undefined;
    const standard = Object.hasOwn(globalEffects, direct) ? globalEffects[direct] : undefined;
    const category = configured ?? standard;

    return category ? { category, evidence: `${direct}()` } : undefined;
  }

  return undefined;
}

/**
Find the root of a property-write target.
@param node - Assignment, update, or delete target.
@returns Its root identifier or this expression.
*/
function writeRoot(node: unknown): unknown {
  return kind(node) === "MemberExpression" ? writeRoot(field(node, "object")) : node;
}

/**
Recognize writes through inputs, this, or module bindings. Captured locals and aliases remain unknown.
@param context - Active rule context.
@param node - Write expression.
@param owner - Nearest enclosing function.
@returns State evidence, or undefined.
*/
export function writeEffect(context: Rule.RuleContext, node: Rule.Node, owner: Rule.Node): Effect | undefined {
  const target = field(node, kind(node) === "AssignmentExpression" ? "left" : "argument");
  const root = writeRoot(target);
  const name = text(root, "name");
  const variable = name ? binding(context, node, name) : undefined;
  const definition = variable?.defs[0];
  const isMember = kind(target) === "MemberExpression";

  if (isMember && kind(root) === "ThisExpression") {
    return { category: "state", evidence: "write through this" };
  }

  if (!definition) {
    return undefined;
  }

  if (definition.type === "Parameter" && isWithin(definition.name, owner)) {
    return isMember ? { category: "state", evidence: `write through input ${name}` } : undefined;
  }

  return !isWithin(definition.name, owner) && ["module", "global"].includes(variable.scope.variableScope.type)
    ? { category: "state", evidence: `write to module binding ${name}` }
    : undefined;
}
