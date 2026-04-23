import type { TFile } from "obsidian";

export type LLMProvider = "openai" | "gemini" | "claude" | string;

export interface TranscriptSegment {
  text: string;
  startTime: number; // in seconds
  duration?: number; // in seconds, if available from source
}

export interface CustomLLMProvider {
  id: string;
  name: string;
  endpoint: string;
  apiKey: string;
  model: string;
  timeout: number; // Timeout in minutes
  customHeaders?: Record<string, string>; // Optional custom headers (e.g., HTTP-Referer, X-Title for OpenRouter)
}

export interface YouTubeTranscriptPluginSettings {
  useLLMProcessing: boolean; // Whether to use LLM processing for transcripts
  llmProvider: LLMProvider;
  customProviders: CustomLLMProvider[]; // Array of custom LLM providers
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
  tagWithChannelName: boolean; // Whether to tag notes with the YouTube channel name
  includeTimestamps: boolean; // Whether to include timestamps in transcripts
  timestampFrequency: number; // How often to show timestamps (in seconds). 0 = every sentence, >0 = every N seconds
  includeTimestampsInLLM: boolean; // Whether to include timestamps in LLM-processed transcripts
  localVideoDirectory: string; // Filesystem directory where local video files are stored (empty = use YouTube URLs)
  savedDirectories: string[]; // List of user-configurable directories for storing transcript files
  defaultDirectory: string | null; // Default directory from savedDirectories to use when creating new files (null = use current file's directory)
  fileFormats: ("markdown" | "pdf" | "srt")[]; // Available file formats for saved transcripts
  createNewFile: boolean; // Whether to create a new file by default (can be overridden in the modal)
  createCoverNote: boolean; // When enabled, a markdown cover note will be created for PDF and/or SRT files
  coverNoteLocation: string; // Location/path where cover notes should be created (supports {ChannelName}, {VideoName})
  attachmentFolder: string; // Subfolder name for PDF/SRT files nested under cover note location (empty = use video title)
  defaultSrtFileName: string; // Template for SRT file names. Supports {VideoName}, {ChannelName}. Default: "{VideoName}"
  coverNoteTemplate: string; // Path to template file for cover notes (empty = use default template)
  defaultCoverNoteName: string; // Template for cover note file names. Supports {VideoName}, {ChannelName}. Default: "{VideoName}"
  singleLineTranscript: boolean; // When enabled, transcript will be kept on a single line without line breaks
  preferredLanguage: string; // Preferred transcript language code (e.g., "en", "es", "fr"). Empty = auto-select (prefers English)
  forceLLMLanguage: boolean; // When enabled, LLM output will be forced to match the transcript language
  defaultNoteName: string; // Template for note names. Supports {VideoName}, {ChannelName}. Default: "{VideoName}"
  checkForDuplicates: boolean; // When enabled, prevents creating a new note if one already exists for the same video
  duplicateCheckProperty: string; // The frontmatter property to check for duplicate detection (e.g., "url")
}

export interface CaptionTrack {
  languageCode: string;
  baseUrl: string;
}

export interface VideoDetails {
  [key: string]: unknown; // Allow any fields from YouTube API
  title?: string;
  author?: string;
  videoId?: string;
  lengthSeconds?: string;
  viewCount?: string;
  publishDate?: string;
  description?: string;
  channelId?: string;
  isLiveContent?: boolean;
  isPrivate?: boolean;
  isUnlisted?: boolean;
  keywords?: string[];
  shortDescription?: string;
  thumbnail?: {
    thumbnails?: Array<{
      url?: string;
      width?: number;
      height?: number;
    }>;
  };
}

export interface TranscriptResult {
  transcript: string;
  title: string;
  summary: string | null;
  channelName: string | null;
  videoDetails: VideoDetails | null;
  segments: TranscriptSegment[];
}

export type FileFormat = "markdown" | "pdf" | "srt";

export interface ProcessTranscriptOptions {
  url: string;
  createNewFile: boolean;
  includeVideoUrl: boolean;
  generateSummary: boolean;
  useLLM: boolean;
  llmProvider: LLMProvider;
  selectedDirectory: string | null;
  tagWithChannelName: boolean;
  fileFormat: FileFormat;
  languageCode: string | null;
  disableCoverNote?: boolean;
  fileFormats?: FileFormat[];
}

export interface TranscriptFileOptions {
  activeFile: TFile | null;
  videoTitle: string;
  transcript: string;
  videoUrl: string;
  summary: string | null;
  includeVideoUrl: boolean;
  selectedDirectory: string | null;
  channelName: string | null;
  tagWithChannelName: boolean;
  fileFormat: FileFormat;
  videoDetails: VideoDetails | null;
  segments?: TranscriptSegment[];
  disableCoverNote?: boolean;
  fileFormats?: FileFormat[];
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
