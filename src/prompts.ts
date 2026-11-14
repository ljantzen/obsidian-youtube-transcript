import type { SavedPrompt, YouTubeTranscriptPluginSettings } from "./types";
import { DEFAULT_PROMPT, normalizeSavedPrompt } from "./settings";

export const DEFAULT_PROMPT_ID = "default";

export interface PromptOption {
  id: string;
  name: string;
  body: string;
}

/**
 * Default entry + settings.savedPrompts, in display order. Single source of
 * truth for the settings-tab list, the modal dropdown, and resolution below.
 */
export function getPromptOptions(
  settings: YouTubeTranscriptPluginSettings,
): PromptOption[] {
  return [
    { id: DEFAULT_PROMPT_ID, name: "Default", body: DEFAULT_PROMPT },
    ...(settings.savedPrompts ?? []),
  ];
}

/**
 * Falls back to Default when id is missing or stale (e.g. the saved prompt
 * it pointed at was deleted).
 */
export function resolvePromptOption(
  settings: YouTubeTranscriptPluginSettings,
  id: string | null | undefined,
): PromptOption {
  const options = getPromptOptions(settings);
  return options.find((o) => o.id === id) ?? options[0];
}

export function resolveEffectivePromptText(
  settings: YouTubeTranscriptPluginSettings,
  id: string | null | undefined,
): string {
  return resolvePromptOption(settings, id).body;
}

export function generateSavedPromptId(existing: SavedPrompt[]): string {
  const existingIds = existing.map((p) => p.id);
  let n = 1;
  while (existingIds.includes(`saved-${n}`)) n++;
  return `saved-${n}`;
}

/**
 * True when the modal textarea text no longer matches the selected option's
 * stored body (trimmed compare, consistent with normalizeSavedPrompt).
 */
export function isPromptDirty(
  currentText: string,
  selected: { body: string },
): boolean {
  return currentText.trim() !== selected.body.trim();
}

/**
 * Mirrors resolveProviderDeletion/resolveDirectoryDeletion in src/utils.ts.
 */
export function resolveSavedPromptDeletion(
  savedPrompts: SavedPrompt[],
  lastSelectedPromptId: string,
  idToDelete: string,
): { savedPrompts: SavedPrompt[]; lastSelectedPromptId: string } {
  return {
    savedPrompts: savedPrompts.filter((p) => p.id !== idToDelete),
    lastSelectedPromptId:
      lastSelectedPromptId === idToDelete
        ? DEFAULT_PROMPT_ID
        : lastSelectedPromptId,
  };
}

/**
 * One-time migration: an existing customized `prompt` becomes a new saved
 * prompt (and the active selection); an unmodified/legacy/empty prompt is a
 * no-op beyond recording the Default selection. Pure + idempotent given the
 * same inputs, called once from main.ts's runSettingsMigrations().
 */
export function migrateLegacyPrompt(input: {
  legacyPrompt: string | undefined;
  savedPrompts: SavedPrompt[];
  lastSelectedPromptId: string | undefined;
}): {
  savedPrompts: SavedPrompt[];
  lastSelectedPromptId: string;
  changed: boolean;
} {
  const normalized = normalizeSavedPrompt(input.legacyPrompt);
  if (normalized === DEFAULT_PROMPT) {
    return {
      savedPrompts: input.savedPrompts,
      lastSelectedPromptId: input.lastSelectedPromptId ?? DEFAULT_PROMPT_ID,
      changed: input.lastSelectedPromptId === undefined,
    };
  }
  const migrated: SavedPrompt = {
    id: generateSavedPromptId(input.savedPrompts),
    name: "Migrated prompt",
    body: normalized,
  };
  return {
    savedPrompts: [...input.savedPrompts, migrated],
    lastSelectedPromptId: migrated.id,
    changed: true,
  };
}
