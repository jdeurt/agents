import { type Effect, callEffect, writeEffect } from "./detection.ts";
import { computationWords, vocabulary } from "./vocabulary.ts";
import { field, functionName, kind, text, words } from "./ast.ts";
import type { Rule } from "eslint";
import { isReturnedCalculation } from "./computation.ts";

interface Frame {
  node: Rule.Node;
  name: string;
  effects: Map<string, string>;
  calculation: boolean;
}

const LAST_FRAME = -1;
const SUGGESTION_LIMIT = 4;

const optionSchema = [
  {
    type: "object",
    additionalProperties: false,
    properties: {
      vocabulary: {
        type: "object",
        additionalProperties: { type: "array", items: { type: "string", pattern: "^[a-z]+$" }, minItems: 1 },
      },
      globalCalls: {
        type: "object",
        propertyNames: { pattern: String.raw`^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$` },
        additionalProperties: { type: "string", minLength: 1 },
      },
      computationNames: { type: "array", items: { type: "string", pattern: "^[a-z]+$" } },
    },
  },
];
const advice =
  " Refactor when this boundary is valid. Otherwise, suppress this specific diagnostic with an ESLint disable comment and a meaningful explanation.";

/**
Read checked project mappings from schema-validated rule options.
@param value - Candidate mapping.
@returns A string dictionary with no unchecked values.
*/
function stringMap(value: unknown): Record<string, string> {
  return Object.fromEntries(
    Object.entries(typeof value === "object" && value !== null ? value : {}).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string"
    )
  );
}

/**
Read checked word lists from schema-validated rule options.
@param value - Candidate list.
@returns Only string entries.
*/
function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry: unknown): entry is string => typeof entry === "string") : [];
}

/**
Combine default categories with per-category replacement vocabularies.
@param value - Candidate category mapping.
@returns Category word lists for this rule invocation.
*/
function configuredVocabulary(value: unknown): Record<string, string[]> {
  const entries = Object.entries(typeof value === "object" && value !== null ? value : {});

  return { ...vocabulary, ...Object.fromEntries(entries.map(([key, list]) => [key, stringList(list)])) };
}

/**
Exclude language-defined constructor and accessor names from naming advice.
@param node - Function node to inspect.
@returns Whether its name is chosen freely by the author.
*/
function hasAuthorName(node: Rule.Node): boolean {
  const parent = field(node, "parent");

  return !["constructor", "get", "set"].includes(text(parent, "kind"));
}

/**
Create an opt-in rule using nearest-function evidence without call-graph propagation.
@param mode - Naming or computation-separation diagnostic.
@returns The ESLint rule definition.
*/
function createEffectRule(mode: "name" | "separate"): Rule.RuleModule {
  return {
    meta: {
      type: "suggestion",
      docs: {
        description:
          mode === "name"
            ? "Name recognized effects explicitly (opt-in proposal)."
            : "Separate recognized effects from computation contracts (opt-in proposal).",
      },
      schema: optionSchema,
      messages: {
        name:
          "Function '{{name}}' lacks an accepted effect word. Observed {{categories}}: {{evidence}}. Consider {{suggestions}}." +
          advice,
        separate:
          "Function '{{name}}' combines {{computation}} with {{evidence}}. Consider extracting a pure calculation and keeping orchestration in an effect-named function." +
          advice,
      },
    },
    create(context) {
      const options: unknown = context.options[0];
      const categoryWords = configuredVocabulary(field(options, "vocabulary"));
      const accepted = new Map(Object.entries(categoryWords));
      const acceptedWords = new Set(accepted.values().flatMap((list) => list));
      const customCalls = stringMap(field(options, "globalCalls"));
      const pureNames =
        field(options, "computationNames") === undefined
          ? computationWords
          : stringList(field(options, "computationNames"));
      const stack: Frame[] = [];

      function enter(node: Rule.Node) {
        stack.push({ node, name: functionName(node), effects: new Map(), calculation: false });
      }

      function record(effect: Effect | undefined) {
        const frame = stack.at(LAST_FRAME);

        if (frame && effect && !frame.effects.has(effect.category)) {
          frame.effects.set(effect.category, effect.evidence);
        }
      }

      function inspect(frame: Frame) {
        const tokens = words(frame.name);
        const categories = frame.effects.keys().toArray();
        const hasEffectName = tokens.some((word) => acceptedWords.has(word));
        const isPureContract = pureNames.includes(tokens[0] ?? "");
        const evidence = frame.effects.values().toArray().join(", ");

        if (mode === "name" && !hasEffectName && hasAuthorName(frame.node)) {
          context.report({
            node: frame.node,
            messageId: "name",
            data: {
              name: frame.name,
              categories: categories.join(", "),
              evidence,
              suggestions: categories
                .map(
                  (category) =>
                    `${category}: ${(accepted.get(category) ?? []).slice(0, SUGGESTION_LIMIT).join("/") || "configure vocabulary"}`
                )
                .join("; "),
            },
          });
        }

        if (mode === "separate" && (isPureContract || frame.calculation)) {
          context.report({
            node: frame.node,
            messageId: "separate",
            data: {
              name: frame.name,
              evidence,
              computation: isPureContract
                ? "a computation-oriented name"
                : "a returned arithmetic expression over parameters",
            },
          });
        }
      }

      function leave() {
        const frame = stack.pop();

        if (frame?.name && frame.effects.size > 0) {
          inspect(frame);
        }
      }

      function visitCall(node: Rule.Node) {
        if (stack.length > 0) {
          record(callEffect(context, node, customCalls));
        }
      }

      function visitWrite(node: Rule.Node) {
        const owner = stack.at(LAST_FRAME)?.node;

        if (owner && (kind(node) !== "UnaryExpression" || text(node, "operator") === "delete")) {
          record(writeEffect(context, node, owner));
        }
      }

      function visitReturn(node: Rule.Node) {
        const frame = stack.at(LAST_FRAME);

        if (frame && isReturnedCalculation(field(node, "argument"), frame.node, context, node)) {
          frame.calculation = true;
        }
      }

      return {
        ClassBody: enter,
        "ClassBody:exit": leave,
        FunctionDeclaration: enter,
        FunctionExpression: enter,
        ArrowFunctionExpression: enter,
        "FunctionDeclaration:exit": leave,
        "FunctionExpression:exit": leave,
        "ArrowFunctionExpression:exit": leave,
        CallExpression: visitCall,
        AssignmentExpression: visitWrite,
        UpdateExpression: visitWrite,
        UnaryExpression: visitWrite,
        ReturnStatement: visitReturn,
      };
    },
  };
}

export const nameEffects = createEffectRule("name");
export const separateEffects = createEffectRule("separate");
