import type { BuiltFile, Plugin, Registry } from "./types.ts";
const CLAUDE = "claude";
const LOCAL = "local";
const INSTALLATION_AVAILABLE = "AVAILABLE";
const AUTHENTICATE_ON_USE = "on-use";
const AUTHENTICATION_ON_USE = "ON_USE";
const AUTHENTICATION_ON_INSTALL = "ON_INSTALL";

const HARNESSES = ["claude", "codex"] as const;
const CATALOGS = {
  claude: ".claude-plugin/marketplace.json",
  codex: ".agents/plugins/marketplace.json",
};
const json = (value: unknown) => `${JSON.stringify(value, undefined, 2)}\n`;
export function catalogs(registry: Registry) {
  const expected = new Map<string, BuiltFile>();
  const marketplace = registry.marketplace;

  for (const harness of HARNESSES) {
    const plugins = registry.plugins.filter((plugin) => plugin.harnesses.includes(harness));
    const source = (plugin: Plugin) => {
      const directory = `./dist/${harness}/plugins/${plugin.name}`;

      return harness === CLAUDE ? directory : { source: LOCAL, path: directory };
    };
    const catalog =
      harness === CLAUDE
        ? {
            name: marketplace.name,
            owner: { name: marketplace.owner },
            metadata: { description: marketplace.description },
            plugins: plugins.map((plugin) => {
              const name = `jdeurt-${plugin.name}`;

              return { name, source: source(plugin), description: plugin.description };
            }),
          }
        : {
            name: marketplace.name,
            interface: {
              displayName: marketplace.display_name ?? marketplace.owner,
            },
            plugins: plugins.map((plugin) => {
              const name = `jdeurt-${plugin.name}`;

              return {
                name,
                source: source(plugin),
                policy: {
                  installation: INSTALLATION_AVAILABLE,
                  authentication:
                    plugin.authentication === AUTHENTICATE_ON_USE ? AUTHENTICATION_ON_USE : AUTHENTICATION_ON_INSTALL,
                },
                category: plugin.category,
              };
            }),
          };
    expected.set(CATALOGS[harness], {
      contents: Buffer.from(json(catalog)),
      mode: 0o644,
    });
  }

  return expected;
}
