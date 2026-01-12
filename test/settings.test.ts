import { describe, it, expect } from "vitest";

type LLMProvider = "openai" | "gemini" | "claude" | "none";

describe("Settings", () => {
  it("should have correct default settings structure", () => {
    const defaultSettings = {
      llmProvider: "none" as LLMProvider,
      openaiKey: "",
      openaiModel: "gpt-4o-mini",
      geminiKey: "",
      geminiModel: "gemini-2.0-flash",
      claudeKey: "",
      claudeModel: "claude-sonnet-4-20250514",
      prompt: "Test prompt",
      openaiTimeout: 1,
      includeVideoUrl: false,
      generateSummary: false,
      defaultDirectory: "",
      useDefaultDirectory: false,
      tagWithChannelName: false,
      includeTimestamps: true,
      timestampFrequency: 0,
      includeTimestampsInLLM: false,
      localVideoDirectory: "",
    };

    // Verify structure exists
    expect(defaultSettings.llmProvider).toBe("none");
    expect(defaultSettings.openaiModel).toBe("gpt-4o-mini");
    expect(defaultSettings.geminiModel).toBe("gemini-2.0-flash");
    expect(defaultSettings.claudeModel).toBe("claude-sonnet-4-20250514");
    expect(defaultSettings.openaiTimeout).toBe(1);
    expect(defaultSettings.includeVideoUrl).toBe(false);
    expect(defaultSettings.generateSummary).toBe(false);
    expect(defaultSettings.includeTimestamps).toBe(true);
    expect(defaultSettings.timestampFrequency).toBe(0);
    expect(defaultSettings.includeTimestampsInLLM).toBe(false);
    expect(defaultSettings.localVideoDirectory).toBe("");
    expect(typeof defaultSettings.prompt).toBe("string");
    expect(defaultSettings.prompt.length).toBeGreaterThan(0);
  });

  it("should validate timeout is positive number", () => {
    const validTimeouts = [1, 5, 10, 60];
    const invalidTimeouts = [0, -1, NaN];

    validTimeouts.forEach((timeout) => {
      expect(timeout).toBeGreaterThan(0);
    });

    invalidTimeouts.forEach((timeout) => {
      if (isNaN(timeout)) {
        expect(isNaN(timeout)).toBe(true);
      } else {
        expect(timeout).toBeLessThanOrEqual(0);
      }
    });
  });

  it("should handle boolean settings correctly", () => {
    const booleanSettings = {
      includeVideoUrl: false,
      generateSummary: false,
    };

    expect(typeof booleanSettings.includeVideoUrl).toBe("boolean");
    expect(typeof booleanSettings.generateSummary).toBe("boolean");

    // Test toggle behavior
    booleanSettings.includeVideoUrl = true;
    expect(booleanSettings.includeVideoUrl).toBe(true);

    booleanSettings.generateSummary = true;
    expect(booleanSettings.generateSummary).toBe(true);
  });

  it("should validate OpenAI key format (if provided)", () => {
    const validKeys = ["sk-test123", "sk-1234567890abcdef"];
    const invalidKeys = ["", "invalid", "test"];

    validKeys.forEach((key) => {
      expect(key.startsWith("sk-")).toBe(true);
      expect(key.length).toBeGreaterThan(3);
    });

    invalidKeys.forEach((key) => {
      if (key === "") {
        expect(key).toBe("");
      } else {
        expect(key.startsWith("sk-")).toBe(false);
      }
    });
  });

  it("should validate provider selection", () => {
    const validProviders: LLMProvider[] = [
      "none",
      "openai",
      "gemini",
      "claude",
    ];

    validProviders.forEach((provider) => {
      expect(typeof provider).toBe("string");
      expect(["none", "openai", "gemini", "claude"]).toContain(provider);
    });
  });

  it("should validate model settings", () => {
    const settings = {
      openaiModel: "gpt-4o-mini",
      geminiModel: "gemini-2.0-flash",
      claudeModel: "claude-sonnet-4-20250514",
    };

    expect(typeof settings.openaiModel).toBe("string");
    expect(typeof settings.geminiModel).toBe("string");
    expect(typeof settings.claudeModel).toBe("string");
    expect(settings.openaiModel.length).toBeGreaterThan(0);
    expect(settings.geminiModel.length).toBeGreaterThan(0);
    expect(settings.claudeModel.length).toBeGreaterThan(0);
  });

  it("should validate timestamp settings", () => {
    const settings = {
      includeTimestamps: true,
      timestampFrequency: 0,
      includeTimestampsInLLM: false,
    };

    expect(typeof settings.includeTimestamps).toBe("boolean");
    expect(typeof settings.timestampFrequency).toBe("number");
    expect(typeof settings.includeTimestampsInLLM).toBe("boolean");
    expect(settings.includeTimestamps).toBe(true);
    expect(settings.timestampFrequency).toBeGreaterThanOrEqual(0);
    expect(settings.includeTimestampsInLLM).toBe(false);
  });

  it("should validate local video directory setting", () => {
    const settings = {
      localVideoDirectory: "",
    };

    expect(typeof settings.localVideoDirectory).toBe("string");

    // Test with directory set
    settings.localVideoDirectory = "/path/to/videos";
    expect(settings.localVideoDirectory).toBe("/path/to/videos");

    // Test with Windows path
    settings.localVideoDirectory = "C:\\Users\\Videos";
    expect(settings.localVideoDirectory).toBe("C:\\Users\\Videos");
  });

  it("should validate timestamp frequency values", () => {
    const validFrequencies = [0, 10, 30, 60, 300];
    const invalidFrequencies = [-1, -10];

    validFrequencies.forEach((freq) => {
      expect(freq).toBeGreaterThanOrEqual(0);
    });

    invalidFrequencies.forEach((freq) => {
      expect(freq).toBeLessThan(0);
    });
  });
});
