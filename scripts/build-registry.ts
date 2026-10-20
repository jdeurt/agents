import * as values from "./build-files-values.ts";
import type { Registry } from "./types.ts";

const HARNESSES = new Set(["claude", "codex"]);
const NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

/**
Require a string that is not empty after trimming whitespace.
@param value - Field value to validate.
@param label - Field name to include in an error message.
*/
function requireText(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} must be a non-empty string`);
  }
}

/**
Require a table and reject fields outside its permitted field names.
@param value - Registry value to validate as a table.
@param allowed - Field names permitted in the table.
@param label - Table name to include in an error message.
*/
function fields(value: unknown, allowed: string[], label: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be a table`);
  }

  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      throw new Error(`${label}: unknown field ${key}`);
    }
  }
}

/**
Validate marketplace metadata, plugin identities, versions, and supported harnesses.
@param registry - Parsed registry whose marketplace and plugin fields must be checked.
*/
function validateRegistryFields(registry: Registry) {
  const marketplace = registry.marketplace;
  const names = new Set<string>();

  fields(registry.marketplace, ["name", "display_name", "owner", values.DESCRIPTION], values.MARKETPLACE);

  for (const key of ["name", "owner", values.DESCRIPTION]) {
    requireText(marketplace[key], `marketplace.${key}`);
  }

  if (marketplace.display_name !== undefined) {
    requireText(marketplace.display_name, "marketplace.display_name");
  }

  if (!NAME.test(marketplace.name)) {
    throw new Error("marketplace.name must use lowercase kebab-case");
  }

  if (!Array.isArray(registry.plugins)) {
    throw new TypeError("plugins must be an array");
  }

  for (const plugin of registry.plugins) {
    fields(
      plugin,
      [
        "name",
        "version",
        values.DESCRIPTION,
        "harnesses",
        "category",
        "authentication",
        "soubi",
        "native",
        "author",
        "license",
      ],
      "plugin"
    );

    for (const key of ["name", "version", values.DESCRIPTION, "category"]) {
      requireText(plugin[key], `plugin.${key}`);
    }

    if (!NAME.test(plugin.name)) {
      throw new Error(`Invalid plugin name: ${plugin.name}`);
    }

    if (names.has(plugin.name)) {
      throw new Error(`Duplicate plugin: ${plugin.name}`);
    }

    names.add(plugin.name);

    if (!VERSION.test(plugin.version)) {
      throw new Error(`Invalid version for ${plugin.name}: ${plugin.version}`);
    }

    if (plugin.authentication !== undefined && !["on-install", "on-use"].includes(plugin.authentication)) {
      throw new Error(`${plugin.name}: authentication must be on-install or on-use`);
    }

    if (
      !Array.isArray(plugin.harnesses) ||
      plugin.harnesses.length === 0 ||
      new Set(plugin.harnesses).size !== plugin.harnesses.length
    ) {
      throw new Error(`${plugin.name}: harnesses must be a non-empty array without duplicates`);
    }

    for (const harness of plugin.harnesses) {
      if (!HARNESSES.has(harness)) {
        throw new Error(`${plugin.name}: unsupported harness ${harness}`);
      }
    }

    for (const key of ["author", "license"]) {
      if (plugin[key] === undefined) {
        continue;
      }

      requireText(plugin[key], `plugin.${key}`);
    }

    if (!plugin.soubi) {
      continue;
    }

    fields(plugin.soubi, ["mcpServers", "assets", "harnessDefaults"], `${plugin.name}.soubi`);
  }
}

/**
Reject unsupported registry fields and invalid marketplace or plugin metadata.
@param registry - Parsed marketplace registry to validate.
*/
export function validateRegistry(registry: Registry) {
  fields(registry, [values.MARKETPLACE, "plugins"], "registry");
  validateRegistryFields(registry);
}
