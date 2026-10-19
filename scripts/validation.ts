import * as z from "zod/mini";
import { validateRegistry } from "./build-files.ts";
import type { Registry } from "./types.ts";

export const jsonRecord = z.record(z.string(), z.unknown());
export const externalImport = z.strictObject({
  name: z.string(),
  repository: z.string(),
  kind: z.enum(["skill", "plugin"]),
  ref: z.optional(z.string()),
  path: z.string(),
  destination: z.string(),
  license: z.string(),
  scripts: z.optional(z.union([z.literal("all"), z.array(z.string())])),
  hooks: z.optional(z.boolean()),
  local_mcp: z.optional(z.boolean()),
});

export function parseJsonRecord(source: string) {
  return jsonRecord.parse(JSON.parse(source));
}

const server = z.union([
  z.strictObject({
    command: z.string(),
    args: z.optional(z.array(z.string())),
    env: z.optional(z.record(z.string(), z.string())),
    cwd: z.optional(z.string()),
  }),
  z.strictObject({
    transport: z.literal("http"),
    url: z.string(),
    headers: z.optional(z.record(z.string(), z.string())),
  }),
]);
const plugin = z.strictObject({
  name: z.string(),
  version: z.string(),
  description: z.string(),
  category: z.string(),
  harnesses: z.array(z.enum(["claude", "codex"])),
  authentication: z.optional(z.enum(["on-install", "on-use"])),
  native: z.optional(z.boolean()),
  author: z.optional(z.string()),
  license: z.optional(z.string()),
  soubi: z.optional(
    z.strictObject({
      mcpServers: z.optional(z.record(z.string(), server)),
      assets: z.optional(z.array(z.string())),
      harnessDefaults: z.optional(
        z.partialRecord(
          z.enum(["claude", "codex"]),
          z.looseObject({ onUnsupported: z.optional(z.enum(["drop", "degrade", "fail"])) })
        )
      ),
    })
  ),
});
const registry = z.strictObject({
  marketplace: z.strictObject({
    name: z.string(),
    display_name: z.optional(z.string()),
    owner: z.string(),
    description: z.string(),
  }),
  plugins: z.array(plugin),
});

export function parseRegistry(value: unknown): Registry {
  const parsed = registry.parse(value);
  validateRegistry(parsed);

  return parsed;
}
