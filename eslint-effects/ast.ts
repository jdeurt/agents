import type { Rule } from "eslint";

/**
Read an AST field after checking the container.
@param value - Possible AST node.
@param key - Field to read.
@returns The field, or undefined.
*/
export function field(value: unknown, key: string): unknown {
  return typeof value === "object" && value !== null ? Reflect.get(value, key) : undefined;
}

/**
Read a string field without a type assertion.
@param value - Possible AST node.
@param key - Field to read.
@returns The string, or an empty string.
*/
export function text(value: unknown, key: string): string {
  const result = field(value, key);

  return typeof result === "string" ? result : "";
}

/**
Read a node's type.
@param value - Possible AST node.
@returns The type, or an empty string.
*/
export function kind(value: unknown): string {
  return text(value, "type");
}

/**
Resolve a lexical binding at an expression.
@param context - Active rule context.
@param node - Expression whose scope is needed.
@param name - Identifier to resolve.
@returns The nearest variable, or undefined for an undeclared global.
*/
export function binding(context: Rule.RuleContext, node: Rule.Node, name: string) {
  let scope = context.sourceCode.getScope(node);

  for (;;) {
    const variable = scope.set.get(name);

    if (variable) {
      return variable;
    }

    if (!scope.upper) {
      return;
    }

    scope = scope.upper;
  }
}

/**
Check whether a node lies inside another node's source range.
@param node - Node to locate.
@param container - Possible enclosing node.
@returns Whether both ranges exist and the node is enclosed.
*/
export function isWithin(node: unknown, container: unknown): boolean {
  const range = field(node, "range");
  const bounds = field(container, "range");

  return (
    Array.isArray(range) &&
    Array.isArray(bounds) &&
    typeof range[0] === "number" &&
    typeof range[1] === "number" &&
    typeof bounds[0] === "number" &&
    typeof bounds[1] === "number" &&
    range[0] >= bounds[0] &&
    range[1] <= bounds[1]
  );
}

/**
Read an explicit function name or its direct binding/property name.
@param node - Function to inspect.
@returns The name, or an empty string for anonymous callbacks and computed keys.
*/
export function functionName(node: unknown): string {
  const own = text(field(node, "id"), "name");
  const parent = field(node, "parent");

  if (own || kind(parent) === "VariableDeclarator") {
    return own || text(field(parent, "id"), "name");
  }

  return ["MethodDefinition", "PropertyDefinition"].includes(kind(parent)) && !field(parent, "computed")
    ? text(field(parent, "key"), "name")
    : "";
}

/**
Split conventional camelCase, PascalCase, acronym, and snake_case names into words.
@param name - Function name to split.
@returns Lowercase words with no substring matching.
*/
export function words(name: string): string[] {
  return name
    .replaceAll(/([A-Z]+)([A-Z][a-z])/gu, "$1 $2")
    .replaceAll(/([a-z\d])([A-Z])/gu, "$1 $2")
    .toLowerCase()
    .split(/[^a-z\d]+/u)
    .filter(Boolean);
}
