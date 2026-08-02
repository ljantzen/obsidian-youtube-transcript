/**
 * Configuration and generation logic for note frontmatter.
 * Lets users enable/disable individual fields and rename their keys (see #127).
 */

import type {
  FrontmatterFieldConfig,
  FrontmatterFieldId,
  FrontmatterFieldsSettings,
} from "../types";

// Fixed emission order for frontmatter fields
export const FRONTMATTER_FIELD_ORDER: FrontmatterFieldId[] = [
  "title",
  "url",
  "videoId",
  "channel",
  "channelId",
  "duration",
  "views",
  "published",
  "description",
  "isLive",
  "isPrivate",
  "isUnlisted",
];

// Human-readable labels for the settings UI
export const FRONTMATTER_FIELD_LABELS: Record<FrontmatterFieldId, string> = {
  title: "Title",
  url: "URL",
  videoId: "Video ID",
  channel: "Channel",
  channelId: "Channel ID",
  duration: "Duration",
  views: "Views",
  published: "Published date",
  description: "Description",
  isLive: "Is live",
  isPrivate: "Is private",
  isUnlisted: "Is unlisted",
};

// Default enabled state and key name for each field, matching the plugin's
// pre-#127 hardcoded frontmatter output so upgrades don't change existing notes
export const DEFAULT_FRONTMATTER_FIELDS: FrontmatterFieldsSettings = {
  title: { enabled: true, key: "title" },
  url: { enabled: true, key: "url" },
  videoId: { enabled: true, key: "videoId" },
  channel: { enabled: true, key: "channel" },
  channelId: { enabled: true, key: "channelId" },
  duration: { enabled: true, key: "duration" },
  views: { enabled: true, key: "views" },
  published: { enabled: true, key: "published" },
  description: { enabled: true, key: "description" },
  isLive: { enabled: true, key: "isLive" },
  isPrivate: { enabled: true, key: "isPrivate" },
  isUnlisted: { enabled: true, key: "isUnlisted" },
};

/**
 * Merge saved (possibly partial or outdated) frontmatter field settings with the
 * current defaults. Always returns a fresh object so callers never share a
 * reference with DEFAULT_FRONTMATTER_FIELDS (which would let a mutation leak
 * into every other settings instance for the lifetime of the plugin module).
 */
export function mergeFrontmatterFields(
  loaded?: Partial<
    Record<FrontmatterFieldId, Partial<FrontmatterFieldConfig>>
  > | null,
): FrontmatterFieldsSettings {
  const result = {} as FrontmatterFieldsSettings;
  for (const id of FRONTMATTER_FIELD_ORDER) {
    const defaults = DEFAULT_FRONTMATTER_FIELDS[id];
    const override = loaded?.[id];
    result[id] = {
      enabled: override?.enabled ?? defaults.enabled,
      key: override?.key?.trim() || defaults.key,
    };
  }
  return result;
}

// Booleans are meaningful even when false (e.g. isPrivate: false); everything
// else (strings in practice) is treated as absent when null/undefined/empty,
// matching the plugin's historical truthy-check behavior for these fields.
function isEmptyFrontmatterValue(value: unknown): boolean {
  if (typeof value === "boolean") return false;
  return value === null || value === undefined || value === "";
}

function stringifyFrontmatterValue(value: unknown): string {
  if (typeof value === "string") {
    return value.includes("\n")
      ? `"${value.replace(/"/g, '\\"')}"`
      : `"${value}"`;
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

/**
 * Build the full frontmatter block (including the "---" delimiters) for the
 * given field values, honoring each field's enabled/disabled state and custom
 * key name. Returns an empty array if no field ends up with a value, so
 * callers can skip emitting an empty "---\n---" block.
 *
 * If two enabled fields resolve to the same key (e.g. via a custom rename),
 * the later field in FRONTMATTER_FIELD_ORDER wins rather than emitting a
 * duplicate (invalid) YAML key.
 */
export function buildFrontmatterLines(
  values: Partial<Record<FrontmatterFieldId, unknown>>,
  fields: FrontmatterFieldsSettings,
): string[] {
  const entries = new Map<string, string>();
  for (const id of FRONTMATTER_FIELD_ORDER) {
    const config = fields[id] ?? DEFAULT_FRONTMATTER_FIELDS[id];
    if (!config.enabled) continue;
    const value = values[id];
    if (isEmptyFrontmatterValue(value)) continue;
    const key = config.key.trim() || DEFAULT_FRONTMATTER_FIELDS[id].key;
    entries.set(key, stringifyFrontmatterValue(value));
  }
  if (entries.size === 0) return [];
  const lines = ["---"];
  for (const [key, value] of entries) {
    lines.push(`${key}: ${value}`);
  }
  lines.push("---");
  return lines;
}
