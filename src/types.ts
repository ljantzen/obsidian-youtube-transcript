export type LLMProvider = "openai" | "gemini" | "claude" | "none";

export interface YouTubeTranscriptPluginSettings {
  llmProvider: LLMProvider;
  openaiKey: string;
  openaiModel: string;
  geminiKey: string;
  geminiModel: string;
  claudeKey: string;
  claudeModel: string;
  prompt: string;
  openaiTimeout: number; // Timeout in minutes
  includeVideoUrl: boolean;
  generateSummary: boolean;
  defaultDirectory: string; // Default directory for new transcript files (empty = use current file's directory)
  useDefaultDirectory: boolean; // Whether to use the default directory
}

export interface CaptionTrack {
  languageCode: string;
  baseUrl: string;
}

export interface TranscriptResult {
  transcript: string;
  title: string;
  summary: string | null;
}

export interface LLMResponse {
  transcript: string;
  summary: string | null;
}

export type StatusCallback = (status: string | null) => void;

export interface RetryModalConstructor {
  new (app: unknown, errorMessage: string, providerName: string): {
    waitForResponse(): Promise<boolean | null>;
  };
}
