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
  tagWithChannelName: boolean; // Whether to tag notes with the YouTube channel name
  includeTimestamps: boolean; // Whether to include timestamps in transcripts
  timestampFrequency: number; // How often to show timestamps (in seconds). 0 = every sentence, >0 = every N seconds
  includeTimestampsInLLM: boolean; // Whether to include timestamps in LLM-processed transcripts
  localVideoDirectory: string; // Filesystem directory where local video files are stored (empty = use YouTube URLs)
}

export interface CaptionTrack {
  languageCode: string;
  baseUrl: string;
}

export interface TranscriptResult {
  transcript: string;
  title: string;
  summary: string | null;
  channelName: string | null;
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
