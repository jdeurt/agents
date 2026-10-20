import type { ESLint, JSSyntaxElement, Rule } from "eslint";

const tokens = {
  arrayExpression: "ArrayExpression",
  objectExpression: "ObjectExpression",
  tSAsExpression: "TSAsExpression",
  tSSatisfiesExpression: "TSSatisfiesExpression",
  variableDeclarator: "VariableDeclarator",
  tSLiteralType: "TSLiteralType",
  tSImportType: "TSImportType",
  expressionStatement: "ExpressionStatement",
  tSModuleDeclaration: "TSModuleDeclaration",
  importDeclaration: "ImportDeclaration",
  exportNamedDeclaration: "ExportNamedDeclaration",
  exportAllDeclaration: "ExportAllDeclaration",
  exportDefaultDeclaration: "ExportDefaultDeclaration",
  declaration: "declaration",
  variableDeclaration: "VariableDeclaration",
  functionDeclaration: "FunctionDeclaration",
  tSDeclareFunction: "TSDeclareFunction",
  tSTypeAliasDeclaration: "TSTypeAliasDeclaration",
  tSInterfaceDeclaration: "TSInterfaceDeclaration",
};

function property(value: unknown, key: string): unknown {
  return typeof value === "object" && value !== null ? Reflect.get(value, key) : undefined;
}

function typeOf(value: unknown): string {
  const type = property(value, "type");

  return typeof type === "string" ? type : "";
}

function isConstantInitializer(node: unknown): boolean {
  const containers = new Set([
    tokens.arrayExpression,
    tokens.objectExpression,
    "Property",
    tokens.tSAsExpression,
    tokens.tSSatisfiesExpression,
  ]);

  let current = node;
  let parent = property(current, "parent");

  while (containers.has(typeOf(parent))) {
    current = parent;
    parent = property(current, "parent");
  }

  return (
    typeOf(parent) === tokens.variableDeclarator &&
    property(parent, "init") === current &&
    typeOf(property(parent, "id")) === "Identifier" &&
    property(property(parent, "parent"), "kind") === "const"
  );
}

function isStringSyntax(node: unknown): boolean {
  const parent = property(node, "parent");
  const type = typeOf(parent);

  return (
    type === tokens.tSLiteralType ||
    type === tokens.tSImportType ||
    (type === tokens.expressionStatement && typeof property(parent, "directive") === "string") ||
    (type === tokens.tSModuleDeclaration && property(parent, "id") === node) ||
    property(parent, "key") === node ||
    (property(parent, "source") === node &&
      [tokens.importDeclaration, tokens.exportNamedDeclaration, tokens.exportAllDeclaration].includes(type))
  );
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function quasiText(quasi: unknown): string {
  const value = property(quasi, "value");
  const cooked = property(value, "cooked");

  return typeof cooked === "string" ? cooked : stringValue(property(value, "raw"));
}

function templateText(node: unknown): string {
  const quasis = property(node, "quasis");

  return Array.isArray(quasis) ? quasis.map((quasi: unknown) => quasiText(quasi)).join("") : "";
}

const noMagicStrings: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: { description: "Name string values with constants instead of embedding them in expressions." },
    schema: [
      {
        type: "object",
        properties: {
          minLength: {
            type: "integer",
            minimum: 0,
            description: "Report strings longer than this length; allow lengths up to and including it.",
          },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ minLength: 10 }],
    messages: { extract: "Extract this string into a named constant." },
  },
  create(context) {
    const options: unknown = context.options[0];
    const configured = property(options, "minLength");
    const defaultMinimum = 10;
    const minimum = typeof configured === "number" ? configured : defaultMinimum;

    function inspect(node: JSSyntaxElement, value: string) {
      if (value.length <= minimum || isConstantInitializer(node) || isStringSyntax(node)) {
        return;
      }

      context.report({ node, messageId: "extract" });
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
        const value = property(node, "value");

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
    property(declaration, "declare") === true ||
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
    (type === tokens.expressionStatement && typeof property(statement, "directive") === "string") ||
    isRuntimeDeclarationPrefix(statement)
  );
}

const constOnTop: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: { description: "Keep const and let declarations in the declaration prefix of their scope." },
    schema: [],
    messages: { move: "Declare this variable at the top of its scope, before executable statements." },
  },
  create(context) {
    function inspectBody(body: unknown[]) {
      let hasExecutableStatement = false;

      for (const statement of body) {
        const declaration = declarationOf(statement);
        const kind = property(declaration, "kind");

        if (
          hasExecutableStatement &&
          typeOf(declaration) === tokens.variableDeclaration &&
          (kind === "const" || kind === "let")
        ) {
          const location = property(declaration, "loc");
          const start = property(location, "start");
          const line = property(start, "line");
          const column = property(start, "column");

          if (typeof line === "number" && typeof column === "number") {
            context.report({ loc: { line, column }, messageId: "move" });
          }
        }

        if (!isDeclarationPrefix(statement)) {
          hasExecutableStatement = true;
        }
      }
    }

    function inspect(node: JSSyntaxElement) {
      const body = property(node, "body");

      if (Array.isArray(body)) {
        inspectBody(body);
      }
    }

    return { Program: inspect, BlockStatement: inspect, StaticBlock: inspect };
  },
};

const plugin: ESLint.Plugin = { rules: { "no-magic-strings": noMagicStrings, "const-on-top": constOnTop } };

export default plugin;
