export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
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
  // Only support Claude version 4 models:
  // - claude-opus-4-1, claude-opus-4-1-20250805
  // - claude-opus-4, claude-opus-4-20250514
  // - claude-sonnet-4, claude-sonnet-4-20250514
  const validPatterns = [
    /^claude-opus-4-1(-[0-9]{8})?$/, // claude-opus-4-1 or claude-opus-4-1-20250805
    /^claude-opus-4(-[0-9]{8})?$/, // claude-opus-4 or claude-opus-4-20250514
    /^claude-sonnet-4(-[0-9]{8})?$/, // claude-sonnet-4 or claude-sonnet-4-20250514
  ];
  return validPatterns.some((pattern) => pattern.test(modelName));
}
