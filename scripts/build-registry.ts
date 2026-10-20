import * as values from "./build-files-values.ts";
import type { Registry } from "./types.ts";
const HARNESSES = new Set([values.CLAUDE, values.CODEX]);
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
    const message2 = `${label} must be a table`;
    throw new Error(message2);
  }

  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      const message3 = `${label}: unknown field ${key}`;
      throw new Error(message3);
    }
  }
}

function requireOptionalPluginField(plugin: Registry["plugins"][number], key: string) {
  const label = `plugin.${key}`;
  requireText(plugin[key], label);
}

function validateSoubiFields(plugin: Registry["plugins"][number]) {
  const label = `${plugin.name}.soubi`;
  fields(plugin.soubi, [values.MCPSERVERS, values.ASSETS, values.HARNESSDEFAULTS], label);
}

function validateRegistryFields(registry: Registry) {
  const marketplace = registry.marketplace;
  const names = new Set<string>();
  fields(
    registry.marketplace,
    [values.NAME_2, values.DISPLAY_NAME, values.OWNER, values.DESCRIPTION],
    values.MARKETPLACE
  );

  for (const key of [values.NAME_2, values.OWNER, values.DESCRIPTION]) {
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
        values.NAME_2,
        values.VERSION_2,
        values.DESCRIPTION,
        values.HARNESSES_2,
        values.CATEGORY,
        values.AUTHENTICATION,
        values.SOUBI,
        values.NATIVE,
        values.AUTHOR,
        values.LICENSE,
      ],
      values.PLUGIN
    );

    for (const key of [values.NAME_2, values.VERSION_2, values.DESCRIPTION, values.CATEGORY]) {
      const text2 = `plugin.${key}`;
      requireText(plugin[key], text2);
    }

    if (!NAME.test(plugin.name)) {
      const message13 = `Invalid plugin name: ${plugin.name}`;
      throw new Error(message13);
    }

    if (names.has(plugin.name)) {
      const message14 = `Duplicate plugin: ${plugin.name}`;
      throw new Error(message14);
    }

    names.add(plugin.name);

    if (!VERSION.test(plugin.version)) {
      const message15 = `Invalid version for ${plugin.name}: ${plugin.version}`;
      throw new Error(message15);
    }

    if (plugin.authentication !== undefined && ![values.ON_INSTALL, values.ON_USE].includes(plugin.authentication)) {
      const message16 = `${plugin.name}: authentication must be on-install or on-use`;
      throw new Error(message16);
    }

    if (
      !Array.isArray(plugin.harnesses) ||
      plugin.harnesses.length === 0 ||
      new Set(plugin.harnesses).size !== plugin.harnesses.length
    ) {
      const message17 = `${plugin.name}: harnesses must be a non-empty array without duplicates`;
      throw new Error(message17);
    }

    for (const harness of plugin.harnesses) {
      if (!HARNESSES.has(harness)) {
        const message18 = `${plugin.name}: unsupported harness ${harness}`;
        throw new Error(message18);
      }
    }

    for (const key of [values.AUTHOR, values.LICENSE]) {
      if (plugin[key] === undefined) {
        continue;
      }

      requireOptionalPluginField(plugin, key);
    }

    if (!plugin.soubi) {
      continue;
    }

    validateSoubiFields(plugin);
  }
}

export function validateRegistry(registry: Registry) {
  fields(registry, [values.MARKETPLACE, values.PLUGINS], values.REGISTRY);
  validateRegistryFields(registry);
}
