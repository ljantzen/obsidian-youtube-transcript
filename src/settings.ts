import type { YouTubeTranscriptPluginSettings } from "./types";
import type { ModelInfo } from "./llm/modelFetcher";
import { DEFAULT_FRONTMATTER_FIELDS } from "./utils/frontmatter";

export const DEFAULT_PROMPT = `Please clean up the following YouTube video transcript. It was generated automatically from speech, so it may lack punctuation, capitalization, and paragraph breaks, and it may contain misheard words.

Your task is to:

1. Keep the speaker's own words and phrasing. Do NOT paraphrase, summarize, condense, or reorder anything: every sentence, point, example, and explanation must remain in your output.
2. Add punctuation, capitalization, and paragraph breaks.
3. Fix obvious transcription errors (misheard words, misspelled names).
4. Remove filler words (e.g., "um", "uh") and false starts, but nothing else.
5. Remove self-promotion, calls to action, and promotional content (e.g., "like and subscribe", "check out my channel", "visit my website").

The result should read like an edited transcript of what was said, not like an article about it. Return only the cleaned transcript without any additional commentary or explanation.`;

/**
 * Earlier default prompts. A saved prompt that still matches one of these was
 * never customized, so it is upgraded to the current default on load.
 */
export const LEGACY_DEFAULT_PROMPTS: string[] = [
  `Please process the following YouTube video transcript. Your task is to:

1. Create an accurate and complete transcription with complete sentences
2. Remove all self-promotion, calls to action, and promotional content (e.g., "like and subscribe", "check out my channel", "visit my website", etc.)
3. Maintain the original meaning and context
4. Ensure proper grammar and sentence structure
5. Keep the content focused on the actual video content

Return only the cleaned transcript without any additional commentary or explanation.`,
];

/**
 * Returns the prompt to use for a saved value: the current default when the
 * saved prompt is empty or an unmodified earlier default, otherwise unchanged.
 */
export function normalizeSavedPrompt(prompt: string | undefined | null): string {
  if (!prompt || prompt.trim() === "") return DEFAULT_PROMPT;
  const trimmed = prompt.trim();
  if (LEGACY_DEFAULT_PROMPTS.some((legacy) => legacy.trim() === trimmed)) {
    return DEFAULT_PROMPT;
  }
  return prompt;
}

export const DEFAULT_SETTINGS: YouTubeTranscriptPluginSettings = {
  useLLMProcessing: false, // Default to false - use raw transcript by default
  llmProvider: "openai",
  customProviders: [], // Empty array - users can add custom providers in settings
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
  fileFormats: ["markdown"], // Default to markdown only
  createNewFile: false, // Default to false - insert into current file by default
  createCoverNote: false, // Default to false - do not create cover notes by default
  coverNoteLocation: "", // Default to empty string - no specific location set
  attachmentFolder: "", // Default to empty string - use video title as subfolder name
  defaultSrtFileName: "{VideoName}", // Default to video title
  srtUseReadingSpeed: false, // Default to false - use actual transcript segment timing
  srtReadingSpeedWpm: 180, // Default reading speed of 180 words per minute
  coverNoteTemplate: "", // Default to empty string - use default template
  defaultCoverNoteName: "{VideoName}", // Default to video title
  singleLineTranscript: false, // Default to false - use line breaks for readability
  preferredLanguage: "", // Default to empty string - auto-select (prefers English)
  forceLLMLanguage: false, // Default to false - LLM can output in any language
  defaultNoteName: "{VideoName}", // Default to video title
  checkForDuplicates: false, // Default to false - do not prevent duplicate transcripts
  duplicateCheckProperty: "url", // Default to "url" - the property the plugin writes by default
  allowClipboardAccess: true, // Default to true - enable clipboard prefill and clipboard command
  frontmatterFields: DEFAULT_FRONTMATTER_FIELDS, // Default to all fields enabled with their historical key names
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

/**
 * Default Claude models shown in the dropdown before fetching from API
 */
export const DEFAULT_CLAUDE_MODELS: ModelInfo[] = [
  { id: "claude-opus-5", displayName: "Claude Opus 5" },
  { id: "claude-sonnet-5", displayName: "Claude Sonnet 5" },
  { id: "claude-haiku-4-5", displayName: "Claude Haiku 4.5" },
  { id: "claude-opus-4-8", displayName: "Claude Opus 4.8" },
];
