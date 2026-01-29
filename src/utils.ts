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
  // Support Claude version 4 models with optional minor versions and dates:
  // - claude-opus-4, claude-opus-4-1, claude-opus-4-1-20250805
  // - claude-sonnet-4, claude-sonnet-4-20250514
  // - claude-haiku-4, claude-haiku-4-5, claude-haiku-4-5-20251001
  // Pattern: claude-{type}-4(-{minor})?(-{date})?
  const validPattern = /^claude-(opus|sonnet|haiku)-4(-[0-9]+)?(-[0-9]{8})?$/;
  return validPattern.test(modelName);
}

export function sanitizeTagName(tagName: string): string {
  // Remove or replace invalid tag characters to create valid Obsidian tags
  return tagName
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/[^\w\-]/g, "") // Remove non-alphanumeric characters except hyphens and underscores
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
    let normalizedDir = localVideoDirectory
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
