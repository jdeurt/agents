import { binding, field, isWithin, kind, text } from "./ast.ts";
import type { Rule } from "eslint";

/**
Check a small expression grammar for a direct calculation over parameters and literals.
@param node - Expression to inspect.
@param parameters - Plain parameter names, excluding destructuring and defaults.
@returns Whether the expression fits the grammar. This is a refactoring candidate, not a purity proof.
*/
function isCalculationPart(node: unknown, parameters: Set<string>): boolean {
  if (kind(node) === "Literal") {
    return typeof field(node, "value") === "number" || typeof field(node, "value") === "string";
  }

  return kind(node) === "Identifier"
    ? parameters.has(text(node, "name"))
    : kind(node) === "BinaryExpression" &&
        ["+", "-", "*", "/", "%", "**"].includes(text(node, "operator")) &&
        isCalculationPart(field(node, "left"), parameters) &&
        isCalculationPart(field(node, "right"), parameters);
}

/**
Count operators and input references in the accepted arithmetic grammar.
@param node - Expression to inspect.
@param names - Parameter names resolved at the return statement.
@returns Operator and input counts for the candidate.
*/
function calculationSize(node: unknown, names: Set<string>): { operators: number; inputs: number } {
  if (kind(node) === "BinaryExpression") {
    const left = calculationSize(field(node, "left"), names);
    const right = calculationSize(field(node, "right"), names);

    return { operators: 1 + left.operators + right.operators, inputs: left.inputs + right.inputs };
  }

  return { operators: 0, inputs: kind(node) === "Identifier" && names.has(text(node, "name")) ? 1 : 0 };
}

/**
Identify a returned arithmetic expression over plain parameters.
@param argument - Returned expression.
@param owner - Function that owns the return.
@param context - Rule context used to resolve shadowed parameters.
@param statement - Return statement with the relevant scope.
@returns Whether extraction of a calculation can be considered.
*/
export function isReturnedCalculation(
  argument: unknown,
  owner: unknown,
  context: Rule.RuleContext,
  statement: Rule.Node
): boolean {
  const params = field(owner, "params");
  const candidates = new Set(
    Array.isArray(params)
      ? params.filter((item: unknown) => kind(item) === "Identifier").map((item: unknown) => text(item, "name"))
      : []
  );

  const names = new Set(
    [...candidates].filter((name) => {
      const definition = binding(context, statement, name)?.defs[0];

      return definition?.type === "Parameter" && isWithin(definition.name, owner);
    })
  );
  const size = calculationSize(argument, names);

  return size.operators >= 2 && size.inputs > 0 && isCalculationPart(argument, names);
}
