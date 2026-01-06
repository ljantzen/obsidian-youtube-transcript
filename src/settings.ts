import type { YouTubeTranscriptPluginSettings } from "./types";

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
};
