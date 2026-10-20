import type { ESLint, JSSyntaxElement, Rule } from "eslint";

const suggestionType = "suggestion";
const tokens = {
  typeof: "typeof",
  operator: "operator",
  unaryExpression: "UnaryExpression",
  binaryExpression: "BinaryExpression",
  right: "right",
  left: "left",
  object: "object",
  type: "type",
  string: "string",
  arrayExpression: "ArrayExpression",
  objectExpression: "ObjectExpression",
  property: "Property",
  tSAsExpression: "TSAsExpression",
  tSSatisfiesExpression: "TSSatisfiesExpression",
  parent: "parent",
  variableDeclarator: "VariableDeclarator",
  init: "init",
  identifier: "Identifier",
  kind: "kind",
  const: "const",
  tSLiteralType: "TSLiteralType",
  tSImportType: "TSImportType",
  expressionStatement: "ExpressionStatement",
  directive: "directive",
  tSModuleDeclaration: "TSModuleDeclaration",
  key: "key",
  source: "source",
  importDeclaration: "ImportDeclaration",
  exportNamedDeclaration: "ExportNamedDeclaration",
  exportAllDeclaration: "ExportAllDeclaration",
  value: "value",
  cooked: "cooked",
  raw: "raw",
  quasis: "quasis",
  suggestion: "suggestion",
  integer: "integer",
  minLength: "minLength",
  number: "number",
  extract: "extract",
  exportDefaultDeclaration: "ExportDefaultDeclaration",
  declaration: "declaration",
  declare: "declare",
  variableDeclaration: "VariableDeclaration",
  functionDeclaration: "FunctionDeclaration",
  tSDeclareFunction: "TSDeclareFunction",
  tSTypeAliasDeclaration: "TSTypeAliasDeclaration",
  tSInterfaceDeclaration: "TSInterfaceDeclaration",
  body: "body",
  loc: "loc",
  start: "start",
  line: "line",
  column: "column",
  move: "move",
};

function property(value: unknown, key: string): unknown {
  return typeof value === "object" && value !== null ? Reflect.get(value, key) : undefined;
}

function typeOf(value: unknown): string {
  const type = property(value, tokens.type);

  return typeof type === "string" ? type : "";
}

function isConstantInitializer(node: unknown): boolean {
  const containers = new Set([
    tokens.arrayExpression,
    tokens.objectExpression,
    tokens.property,
    tokens.tSAsExpression,
    tokens.tSSatisfiesExpression,
  ]);
  let current = node;
  let parent = property(current, tokens.parent);

  while (containers.has(typeOf(parent))) {
    current = parent;
    parent = property(current, tokens.parent);
  }

  return (
    typeOf(parent) === tokens.variableDeclarator &&
    property(parent, tokens.init) === current &&
    typeOf(property(parent, "id")) === tokens.identifier &&
    property(property(parent, tokens.parent), tokens.kind) === tokens.const
  );
}

function isTypeofComparison(node: unknown): boolean {
  const parent = property(node, tokens.parent);
  const left = property(parent, tokens.left);
  const right = property(parent, tokens.right);
  const value = property(node, tokens.value);
  const types = ["string", "object", "number", "undefined", "boolean", "function", "symbol", "bigint"];

  return (
    typeof value === "string" &&
    types.includes(value) &&
    typeOf(parent) === tokens.binaryExpression &&
    ((typeOf(left) === tokens.unaryExpression && property(left, tokens.operator) === tokens.typeof) ||
      (typeOf(right) === tokens.unaryExpression && property(right, tokens.operator) === tokens.typeof))
  );
}

function isStringSyntax(node: unknown): boolean {
  const parent = property(node, tokens.parent);
  const type = typeOf(parent);

  return (
    isTypeofComparison(node) ||
    type === tokens.tSLiteralType ||
    type === tokens.tSImportType ||
    (type === tokens.expressionStatement && typeof property(parent, tokens.directive) === "string") ||
    (type === tokens.tSModuleDeclaration && property(parent, "id") === node) ||
    property(parent, tokens.key) === node ||
    (property(parent, tokens.source) === node &&
      [tokens.importDeclaration, tokens.exportNamedDeclaration, tokens.exportAllDeclaration].includes(type))
  );
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function quasiText(quasi: unknown): string {
  const value = property(quasi, tokens.value);
  const cooked = property(value, tokens.cooked);

  return typeof cooked === "string" ? cooked : stringValue(property(value, tokens.raw));
}

function templateText(node: unknown): string {
  const quasis = property(node, tokens.quasis);

  return Array.isArray(quasis) ? quasis.map((quasi: unknown) => quasiText(quasi)).join("") : "";
}

const noMagicStrings: Rule.RuleModule = {
  meta: {
    type: suggestionType,
    docs: { description: "Name string values with constants instead of embedding them in expressions." },
    schema: [
      {
        type: tokens.object,
        properties: { minLength: { type: tokens.integer, minimum: 0 } },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ minLength: 3 }],
    messages: { extract: "Extract this string into a named constant." },
  },
  create(context) {
    const options: unknown = context.options[0];
    const configured = property(options, tokens.minLength);
    const defaultMinimum = 3;
    const minimum = typeof configured === "number" ? configured : defaultMinimum;

    function inspect(node: JSSyntaxElement, value: string) {
      if (value.length < minimum || isConstantInitializer(node) || isStringSyntax(node)) {
        return;
      }

      context.report({ node, messageId: tokens.extract });
    }

    return {
      Literal(node) {
        if (typeof node.value === "string") {
          inspect(node, node.value);
        }
      },
      TemplateLiteral(node) {
        const text = templateText(node);

        if (text.length > 0) {
          inspect(node, text);
        }
      },
      JSXText(node: JSSyntaxElement) {
        const value = property(node, tokens.value);

        if (typeof value === "string" && value.trim().length > 0) {
          inspect(node, value.trim());
        }
      },
    };
  },
};

function declarationOf(statement: unknown): unknown {
  return typeOf(statement) === tokens.exportNamedDeclaration || typeOf(statement) === tokens.exportDefaultDeclaration
    ? property(statement, tokens.declaration)
    : statement;
}

function isRuntimeDeclarationPrefix(statement: unknown): boolean {
  const declaration = declarationOf(statement);
  const declarationType = typeOf(declaration);

  return (
    property(declaration, tokens.declare) === true ||
    [
      tokens.variableDeclaration,
      tokens.functionDeclaration,
      tokens.tSDeclareFunction,
      tokens.tSTypeAliasDeclaration,
      tokens.tSInterfaceDeclaration,
    ].includes(declarationType)
  );
}

function isDeclarationPrefix(statement: unknown): boolean {
  const type = typeOf(statement);

  return (
    type === tokens.importDeclaration ||
    type === tokens.exportAllDeclaration ||
    (type === tokens.exportNamedDeclaration && !property(statement, tokens.declaration)) ||
    (type === tokens.expressionStatement && typeof property(statement, tokens.directive) === "string") ||
    isRuntimeDeclarationPrefix(statement)
  );
}

const constOnTop: Rule.RuleModule = {
  meta: {
    type: suggestionType,
    docs: { description: "Keep constant declarations in the declaration prefix of their scope." },
    schema: [],
    messages: { move: "Declare this constant at the top of its scope, before executable statements." },
  },
  create(context) {
    function inspect(node: JSSyntaxElement) {
      const body = property(node, tokens.body);

      if (!Array.isArray(body)) {
        return;
      }

      let hasExecutableStatement = false;

      for (const statement of body) {
        const declaration = declarationOf(statement);

        if (
          hasExecutableStatement &&
          typeOf(declaration) === tokens.variableDeclaration &&
          property(declaration, tokens.kind) === tokens.const
        ) {
          const location = property(declaration, tokens.loc);
          const start = property(location, tokens.start);
          const line = property(start, tokens.line);
          const column = property(start, tokens.column);

          if (typeof line === "number" && typeof column === "number") {
            context.report({ loc: { line, column }, messageId: tokens.move });
          }
        }

        if (!isDeclarationPrefix(statement)) {
          hasExecutableStatement = true;
        }
      }
    }

    return { Program: inspect, BlockStatement: inspect, StaticBlock: inspect };
  },
};

const plugin: ESLint.Plugin = { rules: { "no-magic-strings": noMagicStrings, "const-on-top": constOnTop } };

export default plugin;
