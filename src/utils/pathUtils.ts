/**
 * Centralized path normalization utilities for consistency.
 * Ensures cross-platform compatibility (Windows backslashes → forward slashes)
 */

/**
 * Normalize a file path by removing leading/trailing slashes and converting backslashes to forward slashes.
 * Used for directory paths and file locations.
 */
export function normalizePath(path: string): string {
  if (!path) return "";
  return path.replace(/^\/+|\/+$/g, "").replace(/\\/g, "/");
}

/**
 * Normalize a vault-relative path (remove leading slash for Obsidian compatibility).
 * Used for wiki-link paths that should be relative to vault root.
 */
export function normalizeVaultPath(path: string): string {
  if (!path) return "";
  return path.startsWith("/") ? path.substring(1) : path;
}

/**
 * Clean up path by removing double slashes and normalizing separators.
 * Useful after string concatenation operations.
 */
export function cleanPath(path: string): string {
  return path.replace(/\/+/g, "/").replace(/^\/|\/$/g, "");
}

/**
 * Join path segments with forward slashes, handling empty segments and normalization.
 */
export function joinPaths(...segments: (string | null | undefined)[]): string {
  const filtered = segments.filter((s) => s && s.trim() !== "");
  return filtered.join("/");
}
