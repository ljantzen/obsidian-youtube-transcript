import { describe, it, expect } from "vitest";
import { extractVideoId } from "../src/utils";
import { DEFAULT_SETTINGS } from "../src/settings";
import type { YouTubeTranscriptPluginSettings, TranscriptSegment, CustomLLMProvider } from "../src/types";

// The core logic of findDuplicateNote extracted for unit testing:
// Checks whether a frontmatter property value refers to the same video as videoId.
function matchesDuplicateVideo(
  propValue: unknown,
  videoId: string,
): boolean {
  return typeof propValue === "string" && extractVideoId(propValue) === videoId;
}

// The early-guard logic from processTranscript
function shouldRequireActiveFile(params: {
  createNewFile: boolean;
  hasActiveFile: boolean;
  selectedDirectory: string | null;
  fileFormat: "markdown" | "pdf" | "srt";
  createPdfCoverNote: boolean;
  pdfCoverNoteLocation: string;
}): boolean {
  if (!params.createNewFile) return false;
  const hasPdfCoverNoteDirectory =
    params.fileFormat === "pdf" &&
    params.createPdfCoverNote &&
    !!params.pdfCoverNoteLocation?.trim();
  return !params.hasActiveFile && !params.selectedDirectory && !hasPdfCoverNoteDirectory;
}

// The hasProviderKey logic for custom providers
function hasProviderKey(
  provider: string,
  settings: Pick<YouTubeTranscriptPluginSettings, "openaiKey" | "geminiKey" | "claudeKey" | "customProviders">,
): boolean {
  switch (provider) {
    case "openai":
      return !!(settings.openaiKey && settings.openaiKey.trim() !== "");
    case "gemini":
      return !!(settings.geminiKey && settings.geminiKey.trim() !== "");
    case "claude":
      return !!(settings.claudeKey && settings.claudeKey.trim() !== "");
    default: {
      const customProvider = settings.customProviders?.find((p) => p.id === provider);
      return !!(customProvider && customProvider.apiKey && customProvider.apiKey.trim() !== "");
    }
  }
}

describe("Duplicate check settings", () => {
  it("checkForDuplicates defaults to false", () => {
    expect(DEFAULT_SETTINGS.checkForDuplicates).toBe(false);
  });

  it("duplicateCheckProperty defaults to 'url'", () => {
    expect(DEFAULT_SETTINGS.duplicateCheckProperty).toBe("url");
  });

  it("settings include both new fields", () => {
    const settings: YouTubeTranscriptPluginSettings = {
      ...DEFAULT_SETTINGS,
      checkForDuplicates: true,
      duplicateCheckProperty: "source",
    };
    expect(settings.checkForDuplicates).toBe(true);
    expect(settings.duplicateCheckProperty).toBe("source");
  });
});

describe("Duplicate video matching logic", () => {
  describe("when property value is a YouTube URL", () => {
    it("matches when URLs resolve to the same video ID", () => {
      expect(matchesDuplicateVideo(
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "dQw4w9WgXcQ",
      )).toBe(true);
    });

    it("matches youtu.be short URL against watch URL video ID", () => {
      expect(matchesDuplicateVideo(
        "https://youtu.be/dQw4w9WgXcQ",
        "dQw4w9WgXcQ",
      )).toBe(true);
    });

    it("matches URL with extra query parameters", () => {
      expect(matchesDuplicateVideo(
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s",
        "dQw4w9WgXcQ",
      )).toBe(true);
    });

    it("does not match a different video ID", () => {
      expect(matchesDuplicateVideo(
        "https://www.youtube.com/watch?v=aaaaaaaaaaA",
        "dQw4w9WgXcQ",
      )).toBe(false);
    });
  });

  describe("when property value is a bare video ID", () => {
    it("matches when the stored value is just the video ID", () => {
      expect(matchesDuplicateVideo("dQw4w9WgXcQ", "dQw4w9WgXcQ")).toBe(true);
    });

    it("does not match a different bare video ID", () => {
      expect(matchesDuplicateVideo("aaaaaaaaaaA", "dQw4w9WgXcQ")).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("returns false when property value is not a string", () => {
      expect(matchesDuplicateVideo(42, "dQw4w9WgXcQ")).toBe(false);
      expect(matchesDuplicateVideo(null, "dQw4w9WgXcQ")).toBe(false);
      expect(matchesDuplicateVideo(undefined, "dQw4w9WgXcQ")).toBe(false);
      expect(matchesDuplicateVideo(true, "dQw4w9WgXcQ")).toBe(false);
    });

    it("returns false when string does not contain a video ID", () => {
      expect(matchesDuplicateVideo("not a url", "dQw4w9WgXcQ")).toBe(false);
      expect(matchesDuplicateVideo("", "dQw4w9WgXcQ")).toBe(false);
    });
  });
});

describe("PDF cover note directory — active file guard", () => {
  const base = {
    createNewFile: true,
    hasActiveFile: false,
    selectedDirectory: null,
    fileFormat: "pdf" as const,
    createPdfCoverNote: true,
    pdfCoverNoteLocation: "Transcripts/PDF",
  };

  it("does not require active file when pdfCoverNoteLocation is set", () => {
    expect(shouldRequireActiveFile(base)).toBe(false);
  });

  it("requires active file when pdfCoverNoteLocation is empty", () => {
    expect(shouldRequireActiveFile({ ...base, pdfCoverNoteLocation: "" })).toBe(true);
  });

  it("requires active file when pdfCoverNoteLocation is whitespace only", () => {
    expect(shouldRequireActiveFile({ ...base, pdfCoverNoteLocation: "   " })).toBe(true);
  });

  it("requires active file when createPdfCoverNote is false", () => {
    expect(shouldRequireActiveFile({ ...base, createPdfCoverNote: false })).toBe(true);
  });

  it("requires active file when fileFormat is not pdf", () => {
    expect(shouldRequireActiveFile({ ...base, fileFormat: "markdown" })).toBe(true);
    expect(shouldRequireActiveFile({ ...base, fileFormat: "srt" })).toBe(true);
  });

  it("does not require active file when selectedDirectory is set", () => {
    expect(shouldRequireActiveFile({
      ...base,
      pdfCoverNoteLocation: "",
      selectedDirectory: "Transcripts",
    })).toBe(false);
  });

  it("does not require active file when hasActiveFile is true", () => {
    expect(shouldRequireActiveFile({
      ...base,
      pdfCoverNoteLocation: "",
      hasActiveFile: true,
    })).toBe(false);
  });

  it("returns false entirely when createNewFile is false", () => {
    expect(shouldRequireActiveFile({ ...base, createNewFile: false })).toBe(false);
  });
});

describe("hasProviderKey — custom provider support", () => {
  const baseSettings = {
    openaiKey: "",
    geminiKey: "",
    claudeKey: "",
    customProviders: [] as CustomLLMProvider[],
  };

  describe("standard providers", () => {
    it("returns true for openai with valid key", () => {
      expect(hasProviderKey("openai", { ...baseSettings, openaiKey: "sk-test" })).toBe(true);
    });

    it("returns false for openai with empty key", () => {
      expect(hasProviderKey("openai", baseSettings)).toBe(false);
    });

    it("returns false for openai with whitespace key", () => {
      expect(hasProviderKey("openai", { ...baseSettings, openaiKey: "   " })).toBe(false);
    });
  });

  describe("custom providers", () => {
    const openRouterProvider = {
      id: "openrouter",
      name: "OpenRouter",
      endpoint: "https://openrouter.ai/api/v1/chat/completions",
      apiKey: "sk-or-test",
      model: "openai/gpt-4o-mini",
      timeout: 2,
    };

    it("returns true for custom provider with valid API key", () => {
      expect(hasProviderKey("openrouter", {
        ...baseSettings,
        customProviders: [openRouterProvider],
      })).toBe(true);
    });

    it("returns false for custom provider with empty API key", () => {
      expect(hasProviderKey("openrouter", {
        ...baseSettings,
        customProviders: [{ ...openRouterProvider, apiKey: "" }],
      })).toBe(false);
    });

    it("returns false for custom provider with whitespace-only API key", () => {
      expect(hasProviderKey("openrouter", {
        ...baseSettings,
        customProviders: [{ ...openRouterProvider, apiKey: "   " }],
      })).toBe(false);
    });

    it("returns false for unknown provider ID not in customProviders", () => {
      expect(hasProviderKey("unknown-provider", {
        ...baseSettings,
        customProviders: [openRouterProvider],
      })).toBe(false);
    });

    it("returns false when customProviders is empty", () => {
      expect(hasProviderKey("openrouter", baseSettings)).toBe(false);
    });

    it("finds the correct provider by ID when multiple are configured", () => {
      const settings = {
        ...baseSettings,
        customProviders: [
          openRouterProvider,
          { ...openRouterProvider, id: "ollama", apiKey: "" },
        ],
      };
      expect(hasProviderKey("openrouter", settings)).toBe(true);
      expect(hasProviderKey("ollama", settings)).toBe(false);
    });
  });

  describe("hasAnyProviderKey with custom providers", () => {
    it("is true when only a custom provider is configured", () => {
      const settings = {
        ...baseSettings,
        customProviders: [{
          id: "openrouter",
          name: "OpenRouter",
          endpoint: "https://openrouter.ai/api/v1/chat/completions",
          apiKey: "sk-or-test",
          model: "openai/gpt-4o-mini",
          timeout: 2,
        }],
      };
      const hasAny =
        hasProviderKey("openai", settings) ||
        hasProviderKey("gemini", settings) ||
        hasProviderKey("claude", settings) ||
        settings.customProviders.some((p) => hasProviderKey(p.id, settings));

      expect(hasAny).toBe(true);
    });

    it("is false when no providers are configured at all", () => {
      const hasAny =
        hasProviderKey("openai", baseSettings) ||
        hasProviderKey("gemini", baseSettings) ||
        hasProviderKey("claude", baseSettings) ||
        baseSettings.customProviders.some((p) => hasProviderKey(p.id, baseSettings));

      expect(hasAny).toBe(false);
    });
  });
});

describe("SRT segment typing", () => {
  it("TranscriptSegment duration field is optional", () => {
    const withDuration: TranscriptSegment = { startTime: 1, text: "Hi", duration: 2 };
    const withoutDuration: TranscriptSegment = { startTime: 1, text: "Hi" };
    expect(withDuration.duration).toBe(2);
    expect(withoutDuration.duration).toBeUndefined();
  });
});
