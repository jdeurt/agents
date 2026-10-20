import * as values from "./build-files-values.ts";
import type { Registry } from "./types.ts";

const HARNESSES = new Set(["claude", "codex"]);
const NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

function requiredTextError(label: string) {
  const message = `${label} must be a non-empty string`;

  return new Error(message);
}

function requireText(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw requiredTextError(label);
  }
}

function fields(value: unknown, allowed: string[], label: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    const invalidTableMessage = `${label} must be a table`;

    throw new Error(invalidTableMessage);
  }

  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      const unknownFieldMessage = `${label}: unknown field ${key}`;

      throw new Error(unknownFieldMessage);
    }
  }
}

function validateRegistryFields(registry: Registry) {
  const marketplace = registry.marketplace;
  const names = new Set<string>();

  fields(registry.marketplace, ["name", values.DISPLAY_NAME, "owner", values.DESCRIPTION], values.MARKETPLACE);

  for (const key of ["name", "owner", values.DESCRIPTION]) {
    const text = `marketplace.${key}`;

    requireText(marketplace[key], text);
  }

  if (marketplace.display_name !== undefined) {
    requireText(marketplace.display_name, values.MARKETPLACE_DISPLAY_NAME);
  }

  if (!NAME.test(marketplace.name)) {
    throw new Error(values.MARKETPLACE_NAME_MUST_USE_LOWERCASE_KEBAB_CASE);
  }

  if (!Array.isArray(registry.plugins)) {
    throw new TypeError(values.PLUGINS_MUST_BE_AN_ARRAY);
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
        values.AUTHENTICATION,
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
      const invalidNameMessage = `Invalid plugin name: ${plugin.name}`;

      throw new Error(invalidNameMessage);
    }

    if (names.has(plugin.name)) {
      const duplicatePluginMessage = `Duplicate plugin: ${plugin.name}`;

      throw new Error(duplicatePluginMessage);
    }

    names.add(plugin.name);

    if (!VERSION.test(plugin.version)) {
      const invalidVersionMessage = `Invalid version for ${plugin.name}: ${plugin.version}`;

      throw new Error(invalidVersionMessage);
    }

    if (plugin.authentication !== undefined && !["on-install", "on-use"].includes(plugin.authentication)) {
      const invalidAuthenticationMessage = `${plugin.name}: authentication must be on-install or on-use`;

      throw new Error(invalidAuthenticationMessage);
    }

    if (
      !Array.isArray(plugin.harnesses) ||
      plugin.harnesses.length === 0 ||
      new Set(plugin.harnesses).size !== plugin.harnesses.length
    ) {
      const invalidHarnessesMessage = `${plugin.name}: harnesses must be a non-empty array without duplicates`;

      throw new Error(invalidHarnessesMessage);
    }

    for (const harness of plugin.harnesses) {
      if (!HARNESSES.has(harness)) {
        const unsupportedHarnessMessage = `${plugin.name}: unsupported harness ${harness}`;

        throw new Error(unsupportedHarnessMessage);
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

    fields(plugin.soubi, ["mcpServers", "assets", values.HARNESSDEFAULTS], `${plugin.name}.soubi`);
  }
}

export function validateRegistry(registry: Registry) {
  fields(registry, [values.MARKETPLACE, "plugins"], "registry");
  validateRegistryFields(registry);
}
