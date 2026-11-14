import { describe, it, expect } from "vitest";
import { DEFAULT_PROMPT, LEGACY_DEFAULT_PROMPTS } from "../src/settings";
import {
  DEFAULT_PROMPT_ID,
  getPromptOptions,
  resolvePromptOption,
  resolveEffectivePromptText,
  generateSavedPromptId,
  isPromptDirty,
  resolveSavedPromptDeletion,
  migrateLegacyPrompt,
} from "../src/prompts";
import type { SavedPrompt, YouTubeTranscriptPluginSettings } from "../src/types";

function makeSettings(
  savedPrompts: SavedPrompt[] = [],
): Pick<YouTubeTranscriptPluginSettings, "savedPrompts"> {
  return { savedPrompts };
}

describe("getPromptOptions", () => {
  it("always includes Default first with the current DEFAULT_PROMPT body", () => {
    const options = getPromptOptions(makeSettings() as YouTubeTranscriptPluginSettings);
    expect(options[0]).toEqual({ id: DEFAULT_PROMPT_ID, name: "Default", body: DEFAULT_PROMPT });
  });

  it("appends saved prompts in order after Default", () => {
    const saved: SavedPrompt[] = [
      { id: "saved-1", name: "A", body: "Prompt A" },
      { id: "saved-2", name: "B", body: "Prompt B" },
    ];
    const options = getPromptOptions(makeSettings(saved) as YouTubeTranscriptPluginSettings);
    expect(options.map((o) => o.id)).toEqual([DEFAULT_PROMPT_ID, "saved-1", "saved-2"]);
  });
});

describe("resolvePromptOption / resolveEffectivePromptText", () => {
  const saved: SavedPrompt[] = [{ id: "saved-1", name: "A", body: "Prompt A" }];
  const settings = makeSettings(saved) as YouTubeTranscriptPluginSettings;

  it("resolves an exact id match", () => {
    expect(resolvePromptOption(settings, "saved-1").body).toBe("Prompt A");
    expect(resolveEffectivePromptText(settings, "saved-1")).toBe("Prompt A");
  });

  it("falls back to Default when id is undefined", () => {
    expect(resolveEffectivePromptText(settings, undefined)).toBe(DEFAULT_PROMPT);
  });

  it("falls back to Default when id is unknown or stale (e.g. deleted)", () => {
    expect(resolveEffectivePromptText(settings, "saved-999")).toBe(DEFAULT_PROMPT);
  });
});

describe("generateSavedPromptId", () => {
  it("starts at saved-1 when no prompts exist", () => {
    expect(generateSavedPromptId([])).toBe("saved-1");
  });

  it("skips ids that already exist", () => {
    const existing: SavedPrompt[] = [
      { id: "saved-1", name: "A", body: "x" },
      { id: "saved-2", name: "B", body: "y" },
    ];
    expect(generateSavedPromptId(existing)).toBe("saved-3");
  });
});

describe("isPromptDirty", () => {
  it("is dirty when the text differs from the selected prompt's body", () => {
    expect(isPromptDirty("edited text", { body: "original text" })).toBe(true);
  });

  it("is not dirty on a fresh, unedited selection", () => {
    expect(isPromptDirty("same text", { body: "same text" })).toBe(false);
  });

  it("is not dirty for whitespace-only differences", () => {
    expect(isPromptDirty("  same text  ", { body: "same text" })).toBe(false);
  });
});

describe("resolveSavedPromptDeletion", () => {
  const saved: SavedPrompt[] = [
    { id: "saved-1", name: "A", body: "x" },
    { id: "saved-2", name: "B", body: "y" },
  ];

  it("removes the deleted entry", () => {
    const result = resolveSavedPromptDeletion(saved, "saved-2", "saved-1");
    expect(result.savedPrompts.map((p) => p.id)).toEqual(["saved-2"]);
  });

  it("resets lastSelectedPromptId to Default when the deleted id was selected", () => {
    const result = resolveSavedPromptDeletion(saved, "saved-1", "saved-1");
    expect(result.lastSelectedPromptId).toBe(DEFAULT_PROMPT_ID);
  });

  it("leaves lastSelectedPromptId untouched when a different id was deleted", () => {
    const result = resolveSavedPromptDeletion(saved, "saved-2", "saved-1");
    expect(result.lastSelectedPromptId).toBe("saved-2");
  });
});

describe("migrateLegacyPrompt", () => {
  it("is a no-op (beyond recording Default) for an unmodified current default", () => {
    const result = migrateLegacyPrompt({
      legacyPrompt: DEFAULT_PROMPT,
      savedPrompts: [],
      lastSelectedPromptId: undefined,
    });
    expect(result.savedPrompts).toEqual([]);
    expect(result.lastSelectedPromptId).toBe(DEFAULT_PROMPT_ID);
    expect(result.changed).toBe(true);
  });

  it("is a no-op for an unmodified earlier (legacy) default", () => {
    const result = migrateLegacyPrompt({
      legacyPrompt: LEGACY_DEFAULT_PROMPTS[0],
      savedPrompts: [],
      lastSelectedPromptId: undefined,
    });
    expect(result.savedPrompts).toEqual([]);
    expect(result.lastSelectedPromptId).toBe(DEFAULT_PROMPT_ID);
  });

  it("preserves a genuinely customized prompt as a new saved prompt and selects it", () => {
    const custom = `${DEFAULT_PROMPT}\nAlso: keep it terse.`;
    const result = migrateLegacyPrompt({
      legacyPrompt: custom,
      savedPrompts: [],
      lastSelectedPromptId: undefined,
    });
    expect(result.savedPrompts).toHaveLength(1);
    expect(result.savedPrompts[0]).toEqual({ id: "saved-1", name: "Migrated prompt", body: custom });
    expect(result.lastSelectedPromptId).toBe("saved-1");
    expect(result.changed).toBe(true);
  });

  it("is idempotent once lastSelectedPromptId is already set", () => {
    const result = migrateLegacyPrompt({
      legacyPrompt: DEFAULT_PROMPT,
      savedPrompts: [],
      lastSelectedPromptId: DEFAULT_PROMPT_ID,
    });
    expect(result.changed).toBe(false);
  });

  it("does not duplicate an already-migrated custom prompt on re-run", () => {
    const custom = `${DEFAULT_PROMPT}\nAlso: keep it terse.`;
    const first = migrateLegacyPrompt({
      legacyPrompt: custom,
      savedPrompts: [],
      lastSelectedPromptId: undefined,
    });
    // Simulates main.ts always pinning settings.prompt to DEFAULT_PROMPT after migrating,
    // and the migration guard only ever running once (loadedData?.savedPrompts === undefined).
    const second = migrateLegacyPrompt({
      legacyPrompt: DEFAULT_PROMPT,
      savedPrompts: first.savedPrompts,
      lastSelectedPromptId: first.lastSelectedPromptId,
    });
    expect(second.savedPrompts).toHaveLength(1);
    expect(second.changed).toBe(false);
  });
});
