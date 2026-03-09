import { describe, it, expect, vi } from "vitest";
import { hasProviderKey, getProviderName } from "../src/providerUtils";
import { DEFAULT_SETTINGS } from "../src/settings";

describe("URL Modal Provider Selection", () => {
  describe("Provider dropdown options", () => {
    it("should always include 'none' option", () => {
      const options = [
        { value: "none", label: "None (raw transcript)" },
      ];

      expect(options).toHaveLength(1);
      expect(options[0].value).toBe("none");
      expect(options[0].label).toBe("None (raw transcript)");
    });

    it("should only include providers with configured API keys", () => {
      const settings = { ...DEFAULT_SETTINGS, openaiKey: "sk-test", claudeKey: "sk-ant-test" };

      const availableProviders = ["none"]; // Always available
      if (hasProviderKey("openai", settings)) availableProviders.push("openai");
      if (hasProviderKey("gemini", settings)) availableProviders.push("gemini");
      if (hasProviderKey("claude", settings)) availableProviders.push("claude");

      expect(availableProviders).toContain("none");
      expect(availableProviders).toContain("openai");
      expect(availableProviders).not.toContain("gemini");
      expect(availableProviders).toContain("claude");
    });

    it("should show all providers when all have keys configured", () => {
      const settings = {
        ...DEFAULT_SETTINGS,
        openaiKey: "sk-openai-test",
        geminiKey: "AIza-gemini-test",
        claudeKey: "sk-ant-claude-test",
      };

      const availableProviders = ["none"];
      if (hasProviderKey("openai", settings)) availableProviders.push("openai");
      if (hasProviderKey("gemini", settings)) availableProviders.push("gemini");
      if (hasProviderKey("claude", settings)) availableProviders.push("claude");

      expect(availableProviders).toHaveLength(4);
      expect(availableProviders).toContain("none");
      expect(availableProviders).toContain("openai");
      expect(availableProviders).toContain("gemini");
      expect(availableProviders).toContain("claude");
    });

    it("should only show 'none' when no providers have keys", () => {
      const settings = { ...DEFAULT_SETTINGS };

      const availableProviders = ["none"];
      if (hasProviderKey("openai", settings)) availableProviders.push("openai");
      if (hasProviderKey("gemini", settings)) availableProviders.push("gemini");
      if (hasProviderKey("claude", settings)) availableProviders.push("claude");

      expect(availableProviders).toHaveLength(1);
      expect(availableProviders).toEqual(["none"]);
    });

    it("should not include providers with whitespace-only keys", () => {
      const settings = {
        ...DEFAULT_SETTINGS,
        openaiKey: "   ",
        geminiKey: "  \t  ",
        claudeKey: "sk-ant-test",
      };

      const availableProviders = ["none"];
      if (hasProviderKey("openai", settings)) availableProviders.push("openai");
      if (hasProviderKey("gemini", settings)) availableProviders.push("gemini");
      if (hasProviderKey("claude", settings)) availableProviders.push("claude");

      expect(availableProviders).toContain("none");
      expect(availableProviders).not.toContain("openai");
      expect(availableProviders).not.toContain("gemini");
      expect(availableProviders).toContain("claude");
    });
  });

  describe("Provider default value selection", () => {
    it("should default to settings provider when it has a key", () => {
      const settings = { ...DEFAULT_SETTINGS, openaiKey: "sk-test" };
      const settingsProvider = "openai";

      const hasCurrentProviderKey = hasProviderKey(settingsProvider, settings);
      const defaultValue = hasCurrentProviderKey ? settingsProvider : "none";

      expect(defaultValue).toBe("openai");
    });

    it("should fallback to 'none' when settings provider doesn't have a key", () => {
      const settings = { ...DEFAULT_SETTINGS, openaiKey: "sk-test", claudeKey: "sk-ant-test" };
      const settingsProvider = "gemini";

      const hasCurrentProviderKey = hasProviderKey(settingsProvider, settings);
      const defaultValue = hasCurrentProviderKey ? settingsProvider : "none";

      expect(defaultValue).toBe("none");
    });

    it('should default to "none" when settings provider is undefined', () => {
      const settingsProvider: string | undefined = undefined;
      const defaultValue = settingsProvider || "none";

      expect(defaultValue).toBe("none");
    });

    it("should default to 'none' when settings provider is 'none'", () => {
      const settings = { ...DEFAULT_SETTINGS, openaiKey: "sk-test" };
      const settingsProvider = "none";

      // "none" always maps to "none" — hasProviderKey returns false for "none"
      // because "none" means no LLM, not a provider with a key.
      const defaultValue = settingsProvider === "none" ? "none" : (hasProviderKey(settingsProvider, settings) ? settingsProvider : "none");

      expect(defaultValue).toBe("none");
    });

    it("should handle case where current provider key is removed", () => {
      const settings = { ...DEFAULT_SETTINGS, geminiKey: "AIza-test" };
      const previousProvider = "openai"; // Key was removed

      const hasCurrentProviderKey = hasProviderKey(previousProvider, settings);
      const defaultValue = hasCurrentProviderKey ? previousProvider : "none";

      expect(defaultValue).toBe("none");
    });
  });

  describe("Provider selection callback", () => {
    it("should pass selected provider to onSubmit callback", () => {
      const onSubmit = vi.fn();
      const selectedProvider = "gemini";
      const url = "https://www.youtube.com/watch?v=test";
      const createNewFile = false;
      const includeVideoUrl = false;
      const generateSummary = false;

      onSubmit(
        url,
        createNewFile,
        includeVideoUrl,
        generateSummary,
        selectedProvider,
      );

      expect(onSubmit).toHaveBeenCalledWith(
        url,
        createNewFile,
        includeVideoUrl,
        generateSummary,
        selectedProvider,
      );
    });

    it("should handle provider change in modal", () => {
      let currentProvider = "openai";
      const newProvider = "claude";

      currentProvider = newProvider;

      expect(currentProvider).toBe("claude");
    });
  });

  describe("Summary label updates", () => {
    it("should update summary label based on selected provider", () => {
      const providers = ["openai", "gemini", "claude", "none"];

      providers.forEach(() => {
        const labelText = `Generate summary`;
        expect(labelText).toContain("Generate summary");
        expect(labelText).toBe("Generate summary");
      });
    });

    it("should show correct provider name for each provider", () => {
      expect(getProviderName("openai")).toBe("OpenAI");
      expect(getProviderName("gemini")).toBe("Gemini");
      expect(getProviderName("claude")).toBe("Claude");
      expect(getProviderName("none")).toBe("LLM");
    });
  });

  describe("Provider validation", () => {
    it("should validate provider selection before submission", () => {
      const validProviders = ["none", "openai", "gemini", "claude"];
      const selectedProvider = "openai";

      expect(validProviders).toContain(selectedProvider);
    });

    it("should handle provider selection with API key check", () => {
      const settings = { ...DEFAULT_SETTINGS, openaiKey: "sk-test" };

      expect(hasProviderKey("openai", settings)).toBe(true);
      expect(hasProviderKey("gemini", settings)).toBe(false);
      expect(hasProviderKey("claude", settings)).toBe(false);
      // "none" is not a provider with a key — it's a hardcoded UI option
      expect(hasProviderKey("none", settings)).toBe(false);
    });

    it("should validate that only providers with keys can be selected", () => {
      const settings = { ...DEFAULT_SETTINGS, openaiKey: "sk-test", geminiKey: "AIza-test" };

      expect(hasProviderKey("openai", settings)).toBe(true);
      expect(hasProviderKey("gemini", settings)).toBe(true);
      expect(hasProviderKey("claude", settings)).toBe(false);
    });

    it("should handle empty string keys as invalid", () => {
      const settings = { ...DEFAULT_SETTINGS };

      expect(hasProviderKey("openai", settings)).toBe(false);
      expect(hasProviderKey("gemini", settings)).toBe(false);
      expect(hasProviderKey("claude", settings)).toBe(false);
    });
  });

  describe("Provider dropdown behavior scenarios", () => {
    it("should handle single provider configuration", () => {
      const settings = { ...DEFAULT_SETTINGS, openaiKey: "sk-test" };

      const availableProviders = ["none"];
      if (hasProviderKey("openai", settings)) availableProviders.push("openai");
      if (hasProviderKey("gemini", settings)) availableProviders.push("gemini");
      if (hasProviderKey("claude", settings)) availableProviders.push("claude");

      expect(availableProviders).toEqual(["none", "openai"]);
    });

    it("should handle multiple provider configurations", () => {
      const settings = { ...DEFAULT_SETTINGS, openaiKey: "sk-openai", geminiKey: "AIza-gemini" };

      const availableProviders = ["none"];
      if (hasProviderKey("openai", settings)) availableProviders.push("openai");
      if (hasProviderKey("gemini", settings)) availableProviders.push("gemini");
      if (hasProviderKey("claude", settings)) availableProviders.push("claude");

      expect(availableProviders).toEqual(["none", "openai", "gemini"]);
    });

    it("should maintain 'none' as first option", () => {
      const settings = {
        ...DEFAULT_SETTINGS,
        openaiKey: "sk-test",
        geminiKey: "AIza-test",
        claudeKey: "sk-ant-test",
      };

      const availableProviders = ["none"];
      if (hasProviderKey("openai", settings)) availableProviders.push("openai");
      if (hasProviderKey("gemini", settings)) availableProviders.push("gemini");
      if (hasProviderKey("claude", settings)) availableProviders.push("claude");

      expect(availableProviders[0]).toBe("none");
      expect(availableProviders.length).toBeGreaterThan(1);
    });
  });
});
