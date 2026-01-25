import type { YouTubeTranscriptPluginSettings } from "./types";
import type { ModelInfo } from "./llm/modelFetcher";

export const DEFAULT_PROMPT = `Please process the following YouTube video transcript. Your task is to:

1. Create an accurate and complete transcription with complete sentences
2. Remove all self-promotion, calls to action, and promotional content (e.g., "like and subscribe", "check out my channel", "visit my website", etc.)
3. Maintain the original meaning and context
4. Ensure proper grammar and sentence structure
5. Keep the content focused on the actual video content

Return only the cleaned transcript without any additional commentary or explanation.`;

export const DEFAULT_SETTINGS: YouTubeTranscriptPluginSettings = {
  llmProvider: "none",
  openaiKey: "",
  openaiModel: "gpt-4o-mini",
  geminiKey: "",
  geminiModel: "gemini-2.0-flash",
  claudeKey: "",
  claudeModel: "claude-sonnet-4-20250514",
  prompt: DEFAULT_PROMPT,
  openaiTimeout: 1, // Default 1 minute (60 seconds)
  includeVideoUrl: false,
  generateSummary: false,
  tagWithChannelName: false, // Default to false to maintain backward compatibility
  includeTimestamps: true, // Default to true - timestamps are useful for navigation
  timestampFrequency: 0, // 0 = every sentence, >0 = every N seconds
  includeTimestampsInLLM: false, // Default to false - LLM processing may remove timestamps
  localVideoDirectory: "", // Empty = use YouTube URLs, set to use local file:// URLs
  savedDirectories: [], // Empty array = no saved directories, users can add directories in settings
  defaultDirectory: null, // null = use current file's directory, or set to one of the savedDirectories paths
  fileFormat: "markdown", // Default to markdown for backward compatibility
  createNewFile: false, // Default to false - insert into current file by default
  useAttachmentFolderForPdf: false, // Default to false - use selected directory instead of attachment folder
  createPdfCoverNote: false, // Default to false - do not create cover note for PDFs by default
  pdfCoverNoteLocation: "", // Default to empty string - no specific location set
  pdfCoverNoteTemplate: "", // Default to empty string - use default template
  nestPdfUnderCoverNote: false, // Default to false - do not nest PDFs under cover notes
  pdfAttachmentFolderName: "", // Default to empty string - will use PDF filename without extension as folder name
  singleLineTranscript: false, // Default to false - use line breaks for readability
  preferredLanguage: "", // Default to empty string - auto-select (prefers English)
  forceLLMLanguage: false, // Default to false - LLM can output in any language
};

/**
 * Default OpenAI models shown in the dropdown before fetching from API
 */
export const DEFAULT_OPENAI_MODELS: ModelInfo[] = [
  { id: "gpt-4o-mini", displayName: "GPT-4o Mini (fast, cost-effective)" },
  { id: "gpt-4o", displayName: "GPT-4o (high quality)" },
  { id: "gpt-4-turbo", displayName: "GPT-4 Turbo" },
  { id: "gpt-4", displayName: "GPT-4" },
  { id: "gpt-3.5-turbo", displayName: "GPT-3.5 Turbo" },
];

/**
 * Default Gemini models shown in the dropdown before fetching from API
 */
export const DEFAULT_GEMINI_MODELS: ModelInfo[] = [
  { id: "gemini-3-pro", displayName: "Gemini 3 Pro" },
  { id: "gemini-3-flash", displayName: "Gemini 3 Flash" },
  { id: "gemini-flash-latest", displayName: "Gemini 2.0 Flash" },
  { id: "gemini-2.5-pro", displayName: "Gemini 2.5 Pro" },
  { id: "gemini-2.5-flash", displayName: "Gemini 2.5 Flash" },
  { id: "gemini-2.0-pro", displayName: "Gemini 2.0 Pro" },
  { id: "gemini-2.0-flash", displayName: "Gemini 2.0 Flash" },
];
