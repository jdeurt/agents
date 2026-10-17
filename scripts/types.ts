import type { McpServerConfig, PluginConfig } from "soubi";

export interface Plugin {
  name: string;
  version: string;
  description: string;
  category: string;
  harnesses: ("claude" | "codex")[];
  authentication?: "on-install" | "on-use";
  native?: boolean;
  author?: string;
  license?: string;
  soubi?: {
    mcpServers?: Record<string, McpServerConfig>;
    assets?: string[];
    harnessDefaults?: PluginConfig["harnessDefaults"];
  };
}
export interface ExternalImport {
  name: string;
  repository: string;
  kind: "skill" | "plugin";
  ref?: string;
  path: string;
  destination: string;
  license: string;
  scripts?: "all" | string[];
  hooks?: boolean;
  local_mcp?: boolean;
}
export interface Registry {
  marketplace: {
    name: string;
    display_name?: string;
    owner: string;
    description: string;
  };
  plugins: Plugin[];
}
