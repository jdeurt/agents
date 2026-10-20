import * as z from "zod/mini";
import type { Registry } from "./types.ts";
import { validateRegistry } from "./build-files.ts";

export const jsonRecord = z.record(z.string(), z.unknown());
const stringList = z.array(z.string());
const stringRecord = z.record(z.string(), z.string());
const importScripts = z.union([z.literal("all"), stringList]);
export const externalImport = z.strictObject({
  name: z.string(),
  repository: z.string(),
  kind: z.enum(["skill", "plugin"]),
  ref: z.optional(z.string()),
  path: z.string(),
  destination: z.string(),
  license: z.string(),
  scripts: z.optional(importScripts),
  hooks: z.optional(z.boolean()),
  local_mcp: z.optional(z.boolean()),
});

export function parseJsonRecord(source: string) {
  return jsonRecord.parse(JSON.parse(source));
}

const commandServer = z.strictObject({
  command: z.string(),
  args: z.optional(stringList),
  env: z.optional(stringRecord),
  cwd: z.optional(z.string()),
});
const httpServer = z.strictObject({
  transport: z.literal("http"),
  url: z.string(),
  headers: z.optional(stringRecord),
});
const server = z.union([commandServer, httpServer]);
const servers = z.record(z.string(), server);
const unsupportedPolicy = z.enum(["drop", "degrade", "fail"]);
const harnessDefault = z.looseObject({ onUnsupported: z.optional(unsupportedPolicy) });
const harnessDefaults = z.partialRecord(z.enum(["claude", "codex"]), harnessDefault);
const soubi = z.strictObject({
  mcpServers: z.optional(servers),
  assets: z.optional(stringList),
  harnessDefaults: z.optional(harnessDefaults),
});
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
  soubi: z.optional(soubi),
});
const marketplace = z.strictObject({
  name: z.string(),
  display_name: z.optional(z.string()),
  owner: z.string(),
  description: z.string(),
});
const registry = z.strictObject({
  marketplace,
  plugins: z.array(plugin),
});

export function parseRegistry(value: unknown): Registry {
  const parsed = registry.parse(value);
  validateRegistry(parsed);

  return parsed;
}
