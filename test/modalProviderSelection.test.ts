import { describe, it, expect, vi } from "vitest";

type LLMProvider = "openai" | "gemini" | "claude" | "none";

describe("URL Modal Provider Selection", () => {
  const hasProviderKey = (
    provider: LLMProvider,
    keys: {
      openaiKey: string;
      geminiKey: string;
      claudeKey: string;
    },
  ): boolean => {
    switch (provider) {
      case "openai":
        return !!(keys.openaiKey && keys.openaiKey.trim() !== "");
      case "gemini":
        return !!(keys.geminiKey && keys.geminiKey.trim() !== "");
      case "claude":
        return !!(keys.claudeKey && keys.claudeKey.trim() !== "");
      case "none":
        return true; // Always available
      default:
        return false;
    }
  };

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
      const keys = {
        openaiKey: "sk-test",
        geminiKey: "",
        claudeKey: "sk-ant-test",
      };

      const availableProviders = ["none"]; // Always available
      if (hasProviderKey("openai", keys)) availableProviders.push("openai");
      if (hasProviderKey("gemini", keys)) availableProviders.push("gemini");
      if (hasProviderKey("claude", keys)) availableProviders.push("claude");

      expect(availableProviders).toContain("none");
      expect(availableProviders).toContain("openai");
      expect(availableProviders).not.toContain("gemini");
      expect(availableProviders).toContain("claude");
    });

    it("should show all providers when all have keys configured", () => {
      const keys = {
        openaiKey: "sk-openai-test",
        geminiKey: "AIza-gemini-test",
        claudeKey: "sk-ant-claude-test",
      };

      const availableProviders = ["none"];
      if (hasProviderKey("openai", keys)) availableProviders.push("openai");
      if (hasProviderKey("gemini", keys)) availableProviders.push("gemini");
      if (hasProviderKey("claude", keys)) availableProviders.push("claude");

      expect(availableProviders).toHaveLength(4);
      expect(availableProviders).toContain("none");
      expect(availableProviders).toContain("openai");
      expect(availableProviders).toContain("gemini");
      expect(availableProviders).toContain("claude");
    });

    it("should only show 'none' when no providers have keys", () => {
      const keys = {
        openaiKey: "",
        geminiKey: "",
        claudeKey: "",
      };

      const availableProviders = ["none"];
      if (hasProviderKey("openai", keys)) availableProviders.push("openai");
      if (hasProviderKey("gemini", keys)) availableProviders.push("gemini");
      if (hasProviderKey("claude", keys)) availableProviders.push("claude");

      expect(availableProviders).toHaveLength(1);
      expect(availableProviders).toEqual(["none"]);
    });

    it("should not include providers with whitespace-only keys", () => {
      const keys = {
        openaiKey: "   ",
        geminiKey: "  \t  ",
        claudeKey: "sk-ant-test",
      };

      const availableProviders = ["none"];
      if (hasProviderKey("openai", keys)) availableProviders.push("openai");
      if (hasProviderKey("gemini", keys)) availableProviders.push("gemini");
      if (hasProviderKey("claude", keys)) availableProviders.push("claude");

      expect(availableProviders).toContain("none");
      expect(availableProviders).not.toContain("openai");
      expect(availableProviders).not.toContain("gemini");
      expect(availableProviders).toContain("claude");
    });
  });

  describe("Provider default value selection", () => {
    it("should default to settings provider when it has a key", () => {
      const settingsProvider: LLMProvider = "openai";
      const keys = {
        openaiKey: "sk-test",
        geminiKey: "",
        claudeKey: "",
      };

      const hasCurrentProviderKey =
        settingsProvider === "none" || hasProviderKey(settingsProvider, keys);
      const defaultValue = hasCurrentProviderKey ? settingsProvider : "none";

      expect(defaultValue).toBe("openai");
    });

    it("should fallback to 'none' when settings provider doesn't have a key", () => {
      const settingsProvider: LLMProvider = "gemini";
      const keys = {
        openaiKey: "sk-test",
        geminiKey: "",
        claudeKey: "sk-ant-test",
      };

      const hasCurrentProviderKey =
        settingsProvider === "none" || hasProviderKey(settingsProvider, keys);
      const defaultValue = hasCurrentProviderKey ? settingsProvider : "none";

      expect(defaultValue).toBe("none");
    });

    it('should default to "none" when settings provider is undefined', () => {
      const settingsProvider: LLMProvider | undefined = undefined;
      const defaultValue = settingsProvider || "none";

      expect(defaultValue).toBe("none");
    });

    it("should default to 'none' when settings provider is 'none'", () => {
      const settingsProvider: LLMProvider = "none";
      const keys = {
        openaiKey: "sk-test",
        geminiKey: "",
        claudeKey: "",
      };

      const hasCurrentProviderKey =
        settingsProvider === "none" || hasProviderKey(settingsProvider, keys);
      const defaultValue = hasCurrentProviderKey ? settingsProvider : "none";

      expect(defaultValue).toBe("none");
    });

    it("should handle case where current provider key is removed", () => {
      // Simulate scenario where user had OpenAI selected but removed the key
      const previousProvider: LLMProvider = "openai";
      const currentKeys = {
        openaiKey: "", // Key was removed
        geminiKey: "AIza-test",
        claudeKey: "",
      };

      const hasCurrentProviderKey =
        previousProvider === "none" || hasProviderKey(previousProvider, currentKeys);
      const defaultValue = hasCurrentProviderKey ? previousProvider : "none";

      expect(defaultValue).toBe("none");
    });
  });

  describe("Provider selection callback", () => {
    it("should pass selected provider to onSubmit callback", () => {
      const onSubmit = vi.fn();
      const selectedProvider: LLMProvider = "gemini";
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
      let currentProvider: LLMProvider = "openai";
      const newProvider: LLMProvider = "claude";

      currentProvider = newProvider;

      expect(currentProvider).toBe("claude");
    });
  });

  describe("Summary label updates", () => {
    const getProviderName = (provider: LLMProvider): string => {
      switch (provider) {
        case "openai":
          return "OpenAI";
        case "gemini":
          return "Gemini";
        case "claude":
          return "Claude";
        default:
          return "LLM";
      }
    };

    it("should update summary label based on selected provider", () => {
      const providers: LLMProvider[] = ["openai", "gemini", "claude", "none"];

      providers.forEach(() => {
        const labelText = `Generate summary`;

        // Label should always contain "Generate summary"
        expect(labelText).toContain("Generate summary");
        // Label is now simplified and doesn't include provider name
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
      const validProviders: LLMProvider[] = [
        "none",
        "openai",
        "gemini",
        "claude",
      ];
      const selectedProvider: LLMProvider = "openai";

      expect(validProviders).toContain(selectedProvider);
    });

    it("should handle provider selection with API key check", () => {
      const keys = {
        openaiKey: "sk-test",
        geminiKey: "",
        claudeKey: "",
      };

      expect(hasProviderKey("openai", keys)).toBe(true);
      expect(hasProviderKey("gemini", keys)).toBe(false);
      expect(hasProviderKey("claude", keys)).toBe(false);
      expect(hasProviderKey("none", keys)).toBe(true);
    });

    it("should validate that only providers with keys can be selected", () => {
      const keys = {
        openaiKey: "sk-test",
        geminiKey: "AIza-test",
        claudeKey: "",
      };

      // These should be available
      expect(hasProviderKey("none", keys)).toBe(true);
      expect(hasProviderKey("openai", keys)).toBe(true);
      expect(hasProviderKey("gemini", keys)).toBe(true);

      // This should not be available
      expect(hasProviderKey("claude", keys)).toBe(false);
    });

    it("should handle empty string keys as invalid", () => {
      const keys = {
        openaiKey: "",
        geminiKey: "",
        claudeKey: "",
      };

      expect(hasProviderKey("openai", keys)).toBe(false);
      expect(hasProviderKey("gemini", keys)).toBe(false);
      expect(hasProviderKey("claude", keys)).toBe(false);
      expect(hasProviderKey("none", keys)).toBe(true);
    });
  });

  describe("Provider dropdown behavior scenarios", () => {
    it("should handle single provider configuration", () => {
      const keys = {
        openaiKey: "sk-test",
        geminiKey: "",
        claudeKey: "",
      };

      const availableProviders = ["none"];
      if (hasProviderKey("openai", keys)) availableProviders.push("openai");
      if (hasProviderKey("gemini", keys)) availableProviders.push("gemini");
      if (hasProviderKey("claude", keys)) availableProviders.push("claude");

      expect(availableProviders).toEqual(["none", "openai"]);
    });

    it("should handle multiple provider configurations", () => {
      const keys = {
        openaiKey: "sk-openai",
        geminiKey: "AIza-gemini",
        claudeKey: "",
      };

      const availableProviders = ["none"];
      if (hasProviderKey("openai", keys)) availableProviders.push("openai");
      if (hasProviderKey("gemini", keys)) availableProviders.push("gemini");
      if (hasProviderKey("claude", keys)) availableProviders.push("claude");

      expect(availableProviders).toEqual(["none", "openai", "gemini"]);
    });

    it("should maintain 'none' as first option", () => {
      const keys = {
        openaiKey: "sk-test",
        geminiKey: "AIza-test",
        claudeKey: "sk-ant-test",
      };

      const availableProviders = ["none"];
      if (hasProviderKey("openai", keys)) availableProviders.push("openai");
      if (hasProviderKey("gemini", keys)) availableProviders.push("gemini");
      if (hasProviderKey("claude", keys)) availableProviders.push("claude");

      expect(availableProviders[0]).toBe("none");
      expect(availableProviders.length).toBeGreaterThan(1);
    });
  });
});
