import { expect, test } from "bun:test";
import path from "node:path";
import { ESLint } from "eslint";
import { createConfig } from "../eslint.config.ts";

test("spacing separates sections and completed switch cases without splitting if/else or grouped cases", async () => {
  const spacing = createConfig({ hook: true }).find(
    (item) => item.rules?.["@stylistic/padding-line-between-statements"]
  );

  if (!spacing) throw new Error("Missing spacing policy");

  const engine = new ESLint({
    overrideConfigFile: true,
    overrideConfig: [{ ...spacing, files: ["**/*.js"] }],
    fix: true,
  });
  const source = `const ready = true;
function first() {}
class Example {}
if (ready) {
  first();
} else if (!ready) {
  first();
} else {
  first();
}
switch (ready) {
  case true:
    first();
    break;
  case false:
  default:
    first();
}
for (const value of [ready]) { first(value); }
while (ready) { break; }
function last() {}
`;
  const [result] = await engine.lintText(source, { filePath: path.join(process.cwd(), "spacing-fixture.js") });
  const output = result.output ?? source;
  expect(output).toContain("const ready = true;\n\nfunction first");
  expect(output).toContain("class Example {}\n\nif (ready) {");
  expect(output).toContain("  first();\n} else if (!ready) {");
  expect(output).toContain("  first();\n} else {");
  expect(output).toContain("  first();\n}\n\nswitch (ready)");
  expect(output).toContain("break;\n\n  case false:\n  default:");
  expect(output).toContain("}\n\nfor (const value");
  expect(output).toContain("}\n\nwhile (ready)");
  expect(output).toContain("}\n\nfunction last");
});
