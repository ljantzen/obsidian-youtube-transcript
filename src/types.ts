export type LLMProvider = "openai" | "gemini" | "claude" | string;

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
  fileFormat: "markdown" | "pdf"; // File format for saved transcripts
  createNewFile: boolean; // Whether to create a new file by default (can be overridden in the modal)
  createPdfCoverNote: boolean; // When enabled, a cover note will be created for PDF files
  pdfCoverNoteLocation: string; // Location/path for PDF cover notes
  pdfCoverNoteTemplate: string; // Path to template file for PDF cover notes (empty = use default template)
  pdfAttachmentFolderName: string; // Name of the folder to nest PDFs under when useAttachmentFolderForPdf and createPdfCoverNote are enabled
  singleLineTranscript: boolean; // When enabled, transcript will be kept on a single line without line breaks
  preferredLanguage: string; // Preferred transcript language code (e.g., "en", "es", "fr"). Empty = auto-select (prefers English)
  forceLLMLanguage: boolean; // When enabled, LLM output will be forced to match the transcript language
  defaultNoteName: string; // Template for note names. Supports {VideoName}, {ChannelName}. Default: "{VideoName}"
  defaultCoverNoteName: string; // Template for cover note names. Supports {VideoName}, {ChannelName}, {PdfDirectory}. Default: "{VideoName}"
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
