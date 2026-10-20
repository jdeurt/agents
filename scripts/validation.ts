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
  ref: z.exactOptional(z.string()),
  path: z.string(),
  destination: z.string(),
  license: z.string(),
  scripts: z.exactOptional(importScripts),
  hooks: z.exactOptional(z.boolean()),
  local_mcp: z.exactOptional(z.boolean()),
});

/**
Parse JSON and require an object with string keys.
@param source - Untrusted serialized JSON object.
@returns The validated record of unknown values.
*/
export function parseJsonRecord(source: string) {
  return jsonRecord.parse(JSON.parse(source));
}

const commandServer = z.strictObject({
  command: z.string(),
  args: z.exactOptional(stringList),
  env: z.exactOptional(stringRecord),
  cwd: z.exactOptional(z.string()),
});
const httpServer = z.strictObject({
  transport: z.literal("http"),
  url: z.string(),
  headers: z.exactOptional(stringRecord),
});
const server = z.union([commandServer, httpServer]);
const servers = z.record(z.string(), server);
const unsupportedPolicy = z.enum(["drop", "degrade", "fail"]);
const harnessDefault = z.looseObject({ onUnsupported: z.exactOptional(unsupportedPolicy) });
const harnessDefaults = z.partialRecord(z.enum(["claude", "codex"]), harnessDefault);
const soubi = z.strictObject({
  mcpServers: z.exactOptional(servers),
  assets: z.exactOptional(stringList),
  harnessDefaults: z.exactOptional(harnessDefaults),
});
const plugin = z.strictObject({
  name: z.string(),
  version: z.string(),
  description: z.string(),
  category: z.string(),
  harnesses: z.array(z.enum(["claude", "codex"])),
  authentication: z.exactOptional(z.enum(["on-install", "on-use"])),
  native: z.exactOptional(z.boolean()),
  author: z.exactOptional(z.string()),
  license: z.exactOptional(z.string()),
  soubi: z.exactOptional(soubi),
});
const marketplace = z.strictObject({
  name: z.string(),
  display_name: z.exactOptional(z.string()),
  owner: z.string(),
  description: z.string(),
});
const registry = z.strictObject({
  marketplace,
  plugins: z.array(plugin),
});

/**
Validate marketplace structure and registry consistency.
@param value - Untrusted marketplace configuration value.
@returns The validated marketplace registry.
*/
export function parseRegistry(value: unknown): Registry {
  const parsed = registry.parse(value);

  validateRegistry(parsed);

  return parsed;
}
