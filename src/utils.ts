import type { CustomLLMProvider, LLMProvider } from "./types";

export function extractVideoId(url: string): string | null {
  const patterns = [
    // Standard, mobile, and music YouTube domains
    /(?:(?:www\.|m\.|mobile\.|music\.)?youtube\.com\/watch\?v=|youtu\.be\/|(?:www\.|m\.|mobile\.|music\.)?youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/, // Direct video ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
}

export function extractAllVideoUrls(text: string): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const token of text.split(/\s+/)) {
    const trimmed = token.trim();
    if (!trimmed) continue;
    const videoId = extractVideoId(trimmed);
    if (videoId && !seen.has(videoId)) {
      seen.add(videoId);
      urls.push(trimmed);
    }
  }
  return urls;
}

export function sanitizeFilename(filename: string): string {
  // Remove or replace invalid filename characters
  return filename
    .replace(/[<>:"/\\|?*]/g, "") // Remove invalid characters
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim()
    .substring(0, 100); // Limit length
}

export function decodeHtmlEntities(text: string): string {
  // Use DOMParser to safely decode HTML entities
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "text/html");
  return doc.documentElement.textContent || text;
}

export function validateClaudeModelName(modelName: string): boolean {
  // Matches the general Claude model ID shape rather than pinning a major
  // version, so newer generations (e.g. claude-opus-5) validate without a
  // code change:
  //   claude-<family>-<major>[-<minor>][-<date>]
  // - claude-opus-4, claude-opus-4-1, claude-opus-4-1-20250805
  // - claude-opus-5, claude-sonnet-5
  // - claude-sonnet-4, claude-sonnet-4-20250514
  // - claude-haiku-4, claude-haiku-4-5, claude-haiku-4-5-20251001
  // Major/minor version are 1-2 digits; date is exactly 8 digits.
  const validPattern = /^claude-(opus|sonnet|haiku)-[0-9]{1,2}(-[0-9]{1,2})?(-[0-9]{8})?$/;
  return validPattern.test(modelName);
}

export function normalizeUrl(url: string): string {
  const videoId = extractVideoId(url);
  return videoId ? `https://www.youtube.com/watch?v=${videoId}` : url;
}

/**
 * Normalizes a vault-relative path: trims, strips leading/trailing slashes,
 * and converts backslashes to forward slashes. Used for saved directories
 * and cover note location, which are relative to the vault root.
 */
export function normalizeVaultPath(path: string): string {
  return path
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .replace(/\\/g, "/");
}

/**
 * Normalizes a filesystem path: trims, converts backslashes to forward
 * slashes, and strips only the trailing slash (a leading slash is kept
 * since this may be an absolute filesystem path, unlike normalizeVaultPath).
 */
export function normalizeFilesystemPath(path: string): string {
  return path
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+$/, "");
}

/**
 * Normalizes a bare folder/segment name by stripping all slash characters
 * (it must not contain path separators at all).
 */
export function normalizeFolderName(name: string): string {
  return name.trim().replace(/[/\\]+/g, "").trim();
}

/**
 * Normalizes a comma-separated language code list: trims and lowercases each
 * entry, drops empty entries, and rejoins with commas.
 */
export function normalizeLanguageList(value: string): string {
  return value
    .split(",")
    .map((lang) => lang.trim().toLowerCase())
    .filter((lang) => lang.length > 0)
    .join(",");
}

/**
 * Returns value if non-empty, otherwise fallback (no trimming).
 */
export function valueOrDefault(value: string, fallback: string): string {
  return value || fallback;
}

/**
 * Returns the trimmed value if non-empty, otherwise fallback.
 */
export function trimmedOrDefault(value: string, fallback: string): string {
  return value.trim() || fallback;
}

/**
 * Resolves a user-entered Claude model name: empty input falls back to the
 * default model; a valid (per validateClaudeModelName) non-empty input is
 * used as-is (trimmed); anything else is rejected with an error message.
 */
export function resolveClaudeModel(
  value: string,
  fallback: string,
): { value: string; error?: string } {
  const trimmed = value.trim();
  if (trimmed === "") {
    return { value: fallback };
  }
  if (validateClaudeModelName(trimmed)) {
    return { value: trimmed };
  }
  return {
    value: trimmed,
    error: `Invalid Claude model name: "${trimmed}". Must be a Claude version 4 model (e.g., claude-opus-4-1-20250805, claude-sonnet-4-20250514, claude-haiku-4-5-20251001).`,
  };
}

/**
 * Resolves the result of deleting a saved directory by index: removes it
 * from the list, and clears defaultDirectory if it pointed at the removed entry.
 */
export function resolveDirectoryDeletion(
  savedDirectories: string[],
  defaultDirectory: string | null,
  index: number,
): { savedDirectories: string[]; defaultDirectory: string | null } {
  const removedDir = savedDirectories[index];
  return {
    savedDirectories: savedDirectories.filter((_, i) => i !== index),
    defaultDirectory: defaultDirectory === removedDir ? null : defaultDirectory,
  };
}

/**
 * Resolves the result of deleting a custom LLM provider: removes it from the
 * list, and switches llmProvider back to "openai" if it was the selected one.
 */
export function resolveProviderDeletion(
  customProviders: CustomLLMProvider[],
  llmProvider: LLMProvider,
  providerIdToDelete: string,
): { customProviders: CustomLLMProvider[]; llmProvider: LLMProvider } {
  return {
    customProviders: customProviders.filter((p) => p.id !== providerIdToDelete),
    llmProvider: llmProvider === providerIdToDelete ? "openai" : llmProvider,
  };
}

/**
 * Escapes fenced code block delimiters in external content (transcripts, video
 * descriptions) before writing to a markdown note. Without this, a malicious
 * YouTube caption/description containing ```dataviewjs blocks would be executed
 * by code-execution plugins (Dataview, Templater, etc.) when the note is opened.
 *
 * Replaces leading backtick runs of 3+ with backslash-escaped equivalents so
 * the text renders visually identical but is never parsed as a code fence.
 */
export function sanitizeExternalMarkdown(text: string): string {
  return text.replace(/^(`{3,})/gm, (match) => match.replace(/`/g, "\\`"));
}

export function sanitizeTagName(tagName: string): string {
  // Remove or replace invalid tag characters to create valid Obsidian tags
  return tagName
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/[^\w-]/g, "") // Remove non-alphanumeric characters except hyphens and underscores
    .replace(/-+/g, "-") // Collapse multiple hyphens
    .replace(/^-+|-+$/g, "") // Remove leading/trailing hyphens
    .toLowerCase()
    .substring(0, 50); // Limit length for practical purposes
}

export function formatTimestamp(
  seconds: number,
  videoUrl: string,
  videoId: string,
  localVideoDirectory?: string,
): string {
  // Format seconds as MM:SS or HH:MM:SS
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  let timeString: string;
  if (hours > 0) {
    timeString = `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  } else {
    timeString = `${minutes}:${secs.toString().padStart(2, "0")}`;
  }
  
  // Create markdown link to video at this timestamp
  let timestampUrl: string;
  if (localVideoDirectory && localVideoDirectory.trim() !== "") {
    // Use local file URL if directory is configured
    // Normalize directory path (remove trailing slashes, ensure forward slashes, remove leading slash)
    const normalizedDir = localVideoDirectory
      .trim()
      .replace(/\\/g, "/")
      .replace(/\/+$/, "")
      .replace(/^\/+/, ""); // Remove leading slashes to avoid file:////
    // Format: file:///path/to/directory/video-id.mp4?t=SECONDS
    timestampUrl = `file:///${normalizedDir}/${videoId}.mp4?t=${Math.floor(seconds)}`;
  } else {
    // Use YouTube URL
    // YouTube URL format: https://www.youtube.com/watch?v=VIDEO_ID&t=SECONDSs
    timestampUrl = `${videoUrl}${videoUrl.includes("?") ? "&" : "?"}t=${Math.floor(seconds)}s`;
  }
  return `[${timeString}](${timestampUrl})`;
}
