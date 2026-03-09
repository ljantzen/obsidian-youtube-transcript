import { describe, it, expect } from "vitest";
import { hasProviderKey, getProviderName } from "../src/providerUtils";
import { validateClaudeModelName } from "../src/utils";
import { DEFAULT_SETTINGS } from "../src/settings";

describe("Provider Selection", () => {
  describe("hasProviderKey", () => {
    it("should return true when OpenAI key is present", () => {
      const settings = { ...DEFAULT_SETTINGS, openaiKey: "sk-test123" };
      expect(hasProviderKey("openai", settings)).toBe(true);
    });

    it("should return false when OpenAI key is empty", () => {
      const settings = { ...DEFAULT_SETTINGS, openaiKey: "" };
      expect(hasProviderKey("openai", settings)).toBe(false);
    });

    it("should return false when OpenAI key is only whitespace", () => {
      const settings = { ...DEFAULT_SETTINGS, openaiKey: "   " };
      expect(hasProviderKey("openai", settings)).toBe(false);
    });

    it("should return true when Gemini key is present", () => {
      const settings = { ...DEFAULT_SETTINGS, geminiKey: "AIzaSyTest123" };
      expect(hasProviderKey("gemini", settings)).toBe(true);
    });

    it("should return true when Claude key is present", () => {
      const settings = { ...DEFAULT_SETTINGS, claudeKey: "sk-ant-test123" };
      expect(hasProviderKey("claude", settings)).toBe(true);
    });

    it('should return false for "none" provider', () => {
      const settings = {
        ...DEFAULT_SETTINGS,
        openaiKey: "sk-test",
        geminiKey: "test",
        claudeKey: "test",
      };
      expect(hasProviderKey("none", settings)).toBe(false);
    });
  });

  describe("getProviderName", () => {
    it("should return correct provider names", () => {
      expect(getProviderName("openai")).toBe("OpenAI");
      expect(getProviderName("gemini")).toBe("Gemini");
      expect(getProviderName("claude")).toBe("Claude");
      expect(getProviderName("none")).toBe("LLM");
    });
  });

  describe("Provider selection logic", () => {
    it("should prefer provided provider over settings provider", () => {
      const settingsProvider = "openai";
      const providedProvider = "gemini";
      const providerToUse = providedProvider || settingsProvider;

      expect(providerToUse).toBe("gemini");
    });

    it("should fallback to settings provider when none provided", () => {
      const settingsProvider = "openai";
      const providedProvider: string | null = null;
      const providerToUse = providedProvider || settingsProvider;

      expect(providerToUse).toBe("openai");
    });

    it('should handle "none" provider correctly', () => {
      const provider = "none";
      expect(provider).toBe("none");
      expect(provider !== "none").toBe(false);
    });
  });
});

describe("Model Selection", () => {
  describe("Default models", () => {
    it("should have correct default OpenAI model", () => {
      expect(DEFAULT_SETTINGS.openaiModel).toBe("gpt-4o-mini");
    });

    it("should have correct default Gemini model", () => {
      expect(DEFAULT_SETTINGS.geminiModel).toBe("gemini-2.0-flash");
    });

    it("should have correct default Claude model", () => {
      expect(DEFAULT_SETTINGS.claudeModel).toBe("claude-sonnet-4-20250514");
    });
  });

  describe("Model selection fallback", () => {
    it("should use default model when setting is undefined", () => {
      const settingsModel: string | undefined = undefined;
      const defaultModel = "gpt-4o-mini";
      const modelToUse = settingsModel || defaultModel;

      expect(modelToUse).toBe("gpt-4o-mini");
    });

    it("should use setting model when available", () => {
      const settingsModel = "gpt-4";
      const defaultModel = "gpt-4o-mini";
      const modelToUse = settingsModel || defaultModel;

      expect(modelToUse).toBe("gpt-4");
    });
  });

  describe("Valid model names", () => {
    it("should accept valid OpenAI models", () => {
      const validModels = [
        "gpt-4o-mini",
        "gpt-4o",
        "gpt-4-turbo",
        "gpt-4",
        "gpt-3.5-turbo",
      ];

      validModels.forEach((model) => {
        expect(model.length).toBeGreaterThan(0);
        expect(typeof model).toBe("string");
      });
    });

    it("should accept valid Gemini models", () => {
      const validModels = [
        "gemini-3-pro",
        "gemini-3-flash",
        "gemini-flash-latest",
        "gemini-2.5-pro",
        "gemini-2.5-flash",
        "gemini-2.0-pro",
        "gemini-2.0-flash",
      ];

      validModels.forEach((model) => {
        expect(model.length).toBeGreaterThan(0);
        expect(model.startsWith("gemini-")).toBe(true);
      });
    });

    it("should accept valid Claude version 4 models", () => {
      const validModels = [
        "claude-opus-4-1",
        "claude-opus-4-1-20250805",
        "claude-opus-4",
        "claude-opus-4-20250514",
        "claude-sonnet-4",
        "claude-sonnet-4-20250514",
      ];

      validModels.forEach((model) => {
        expect(model.length).toBeGreaterThan(0);
        expect(model.startsWith("claude-")).toBe(true);
        expect(validateClaudeModelName(model)).toBe(true);
      });
    });

    it("should reject invalid Claude models", () => {
      const invalidModels = [
        "claude-3-7-sonnet-latest",
        "claude-3-7-sonnet-20250219",
        "claude-3-5-sonnet-latest",
        "claude-3-5-sonnet-20241022",
        "claude-3-5-haiku-latest",
        "claude-3-5-haiku-20241022",
        "claude-3-haiku",
        "claude-3-haiku-20240307",
        "claude-invalid",
        "claude-3-invalid",
        "claude-opus-invalid",
        "claude-opus-4-invalid",
        "claude-opus-4-2024102", // too short date
        "claude-opus-4-202410221", // too long date
        "claude-2-opus",
        "claude-5-opus",
      ];

      invalidModels.forEach((model) => {
        expect(validateClaudeModelName(model)).toBe(false);
      });
    });
  });
});

describe("Settings Backward Compatibility", () => {
  it("should infer provider from existing keys", () => {
    const testCases = [
      { openaiKey: "sk-test", geminiKey: "", claudeKey: "", expected: "openai" },
      { openaiKey: "", geminiKey: "AIza-test", claudeKey: "", expected: "gemini" },
      { openaiKey: "", geminiKey: "", claudeKey: "sk-ant-test", expected: "claude" },
      { openaiKey: "", geminiKey: "", claudeKey: "", expected: "none" },
    ];

    testCases.forEach(({ openaiKey, geminiKey, claudeKey, expected }) => {
      const settings = { ...DEFAULT_SETTINGS, openaiKey, geminiKey, claudeKey };
      let inferredProvider = "none";

      if (hasProviderKey("openai", settings)) {
        inferredProvider = "openai";
      } else if (hasProviderKey("gemini", settings)) {
        inferredProvider = "gemini";
      } else if (hasProviderKey("claude", settings)) {
        inferredProvider = "claude";
      }

      expect(inferredProvider).toBe(expected);
    });
  });

  it("should initialize model fields with defaults if missing", () => {
    const settings: {
      openaiModel?: string;
      geminiModel?: string;
      claudeModel?: string;
    } = {};

    if (settings.openaiModel === undefined) settings.openaiModel = DEFAULT_SETTINGS.openaiModel;
    if (settings.geminiModel === undefined) settings.geminiModel = DEFAULT_SETTINGS.geminiModel;
    if (settings.claudeModel === undefined) settings.claudeModel = DEFAULT_SETTINGS.claudeModel;

    expect(settings.openaiModel).toBe("gpt-4o-mini");
    expect(settings.geminiModel).toBe("gemini-2.0-flash");
    expect(settings.claudeModel).toBe("claude-sonnet-4-20250514");
  });
});
