import type { LLMProvider, CustomLLMProvider } from "./types";

export function hasProviderKey(
  provider: LLMProvider | string,
  settings: {
    openaiKey: string;
    geminiKey: string;
    claudeKey: string;
    customProviders?: CustomLLMProvider[];
  },
): boolean {
  switch (provider) {
    case "openai":
      return !!(settings.openaiKey && settings.openaiKey.trim() !== "");
    case "gemini":
      return !!(settings.geminiKey && settings.geminiKey.trim() !== "");
    case "claude":
      return !!(settings.claudeKey && settings.claudeKey.trim() !== "");
    default: {
      const customProvider = settings.customProviders?.find(
        (p) => p.id === provider,
      );
      return !!(
        customProvider &&
        customProvider.apiKey &&
        customProvider.apiKey.trim() !== ""
      );
    }
  }
}

export function getProviderName(provider: LLMProvider): string {
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
}
