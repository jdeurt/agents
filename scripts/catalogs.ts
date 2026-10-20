import type { BuiltFile, Plugin, Registry } from "./types.ts";

const HARNESSES = ["claude", "codex"] as const;
const CATALOGS = {
  claude: ".claude-plugin/marketplace.json",
  codex: ".agents/plugins/marketplace.json",
};
/**
Serialize a value as formatted JSON with a final newline.
@param value - Value to serialize.
@returns The formatted JSON text.
*/
const json = (value: unknown) => `${JSON.stringify(value, undefined, 2)}\n`;

/**
Create the Claude and Codex marketplace catalogs from registry metadata.
@param registry - Validated marketplace registry with plugin publication metadata.
@returns The generated catalog files indexed by publication path.
*/
export function catalogs(registry: Registry) {
  const expected = new Map<string, BuiltFile>();
  const marketplace = registry.marketplace;

  for (const harness of HARNESSES) {
    const plugins = registry.plugins.filter((plugin) => plugin.harnesses.includes(harness));
    const source = (plugin: Plugin) => {
      const directory = `./dist/${harness}/plugins/${plugin.name}`;

      return harness === "claude" ? directory : { source: "local", path: directory };
    };
    const catalog =
      harness === "claude"
        ? {
            name: marketplace.name,
            owner: { name: marketplace.owner },
            metadata: { description: marketplace.description },
            plugins: plugins.map((plugin) => ({
              name: `jdeurt-${plugin.name}`,
              source: source(plugin),
              description: plugin.description,
            })),
          }
        : {
            name: marketplace.name,
            interface: {
              displayName: marketplace.display_name ?? marketplace.owner,
            },
            plugins: plugins.map((plugin) => ({
              name: `jdeurt-${plugin.name}`,
              source: source(plugin),
              policy: {
                installation: "AVAILABLE",
                authentication: plugin.authentication === "on-use" ? "ON_USE" : "ON_INSTALL",
              },
              category: plugin.category,
            })),
          };

    expected.set(CATALOGS[harness], {
      contents: Buffer.from(json(catalog)),
      mode: 0o644,
    });
  }

  return expected;
}
