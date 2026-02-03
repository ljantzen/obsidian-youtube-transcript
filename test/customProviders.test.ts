import { describe, it, expect, beforeEach } from "vitest";
import type {
  YouTubeTranscriptPluginSettings,
  CustomLLMProvider,
} from "../src/types";
import { DEFAULT_SETTINGS } from "../src/settings";

describe("Custom LLM Provider Settings", () => {
  let settings: YouTubeTranscriptPluginSettings;

  beforeEach(() => {
    // Create a fresh copy with empty customProviders array
    settings = { 
      ...DEFAULT_SETTINGS,
      customProviders: []
    };
  });

  it("should have empty customProviders array by default", () => {
    expect(settings.customProviders).toEqual([]);
  });

  it("should allow adding custom providers", () => {
    const customProvider: CustomLLMProvider = {
      id: "custom-1",
      name: "OpenRouter",
      endpoint: "https://openrouter.ai/api/v1/chat/completions",
      apiKey: "sk-test-key",
      model: "openai/gpt-4o-mini",
      timeout: 2,
    };

    settings.customProviders.push(customProvider);

    expect(settings.customProviders).toHaveLength(1);
    expect(settings.customProviders[0]).toEqual(customProvider);
  });

  it("should allow custom headers", () => {
    const customProvider: CustomLLMProvider = {
      id: "custom-1",
      name: "OpenRouter",
      endpoint: "https://openrouter.ai/api/v1/chat/completions",
      apiKey: "sk-test-key",
      model: "openai/gpt-4o-mini",
      timeout: 1,
      customHeaders: {
        "HTTP-Referer": "https://mysite.com",
        "X-Title": "My App",
      },
    };

    settings.customProviders.push(customProvider);

    expect(settings.customProviders[0].customHeaders).toEqual({
      "HTTP-Referer": "https://mysite.com",
      "X-Title": "My App",
    });
  });

  it("should allow multiple custom providers", () => {
    const provider1: CustomLLMProvider = {
      id: "custom-1",
      name: "OpenRouter",
      endpoint: "https://openrouter.ai/api/v1/chat/completions",
      apiKey: "sk-test-key-1",
      model: "openai/gpt-4o-mini",
      timeout: 1,
    };

    const provider2: CustomLLMProvider = {
      id: "custom-2",
      name: "Ollama",
      endpoint: "http://localhost:11434/v1/chat/completions",
      apiKey: "ollama",
      model: "llama3",
      timeout: 5,
    };

    settings.customProviders.push(provider1, provider2);

    expect(settings.customProviders).toHaveLength(2);
    expect(settings.customProviders[0].name).toBe("OpenRouter");
    expect(settings.customProviders[1].name).toBe("Ollama");
  });

  it("should allow selecting a custom provider as llmProvider", () => {
    const customProvider: CustomLLMProvider = {
      id: "custom-1",
      name: "OpenRouter",
      endpoint: "https://openrouter.ai/api/v1/chat/completions",
      apiKey: "sk-test-key",
      model: "openai/gpt-4o-mini",
      timeout: 1,
    };

    settings.customProviders.push(customProvider);
    settings.llmProvider = "custom-1";

    expect(settings.llmProvider).toBe("custom-1");
  });

  it("should allow removing custom providers", () => {
    const provider1: CustomLLMProvider = {
      id: "custom-1",
      name: "OpenRouter",
      endpoint: "https://openrouter.ai/api/v1/chat/completions",
      apiKey: "sk-test-key-1",
      model: "openai/gpt-4o-mini",
      timeout: 1,
    };

    const provider2: CustomLLMProvider = {
      id: "custom-2",
      name: "Ollama",
      endpoint: "http://localhost:11434/v1/chat/completions",
      apiKey: "ollama",
      model: "llama3",
      timeout: 5,
    };

    settings.customProviders.push(provider1, provider2);
    expect(settings.customProviders).toHaveLength(2);

    // Remove the first provider
    settings.customProviders = settings.customProviders.filter(
      (p) => p.id !== "custom-1",
    );

    expect(settings.customProviders).toHaveLength(1);
    expect(settings.customProviders[0].name).toBe("Ollama");
  });

  it("should handle provider without custom headers", () => {
    const customProvider: CustomLLMProvider = {
      id: "custom-1",
      name: "Local LLM",
      endpoint: "http://localhost:8080/v1/chat/completions",
      apiKey: "none",
      model: "gpt-3.5-turbo",
      timeout: 1,
    };

    settings.customProviders.push(customProvider);

    expect(settings.customProviders[0].customHeaders).toBeUndefined();
  });
});
