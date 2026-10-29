import { describe, it, expect } from "vitest";
import { DEFAULT_SETTINGS } from "../src/settings";
import type { YouTubeTranscriptPluginSettings } from "../src/types";

// Mirrors the wake-lock gate in main.ts processTranscript():
// Platform.isMobile && (this.settings.preventMobileScreenLock ?? true)
function shouldRequestWakeLock(isMobile: boolean, settings: YouTubeTranscriptPluginSettings): boolean {
  return isMobile && (settings.preventMobileScreenLock ?? true);
}

describe("preventMobileScreenLock setting", () => {
  it("defaults to true", () => {
    expect(DEFAULT_SETTINGS.preventMobileScreenLock).toBe(true);
  });

  it("requests a wake lock on mobile when enabled", () => {
    expect(shouldRequestWakeLock(true, { ...DEFAULT_SETTINGS, preventMobileScreenLock: true })).toBe(true);
  });

  it("does not request a wake lock on mobile when disabled", () => {
    expect(shouldRequestWakeLock(true, { ...DEFAULT_SETTINGS, preventMobileScreenLock: false })).toBe(false);
  });

  it("never requests a wake lock on desktop, even when enabled", () => {
    expect(shouldRequestWakeLock(false, { ...DEFAULT_SETTINGS, preventMobileScreenLock: true })).toBe(false);
  });

  it("falls back to true when the setting is missing from saved data", () => {
    const settings = { ...DEFAULT_SETTINGS } as Partial<YouTubeTranscriptPluginSettings>;
    delete settings.preventMobileScreenLock;
    expect(shouldRequestWakeLock(true, settings as YouTubeTranscriptPluginSettings)).toBe(true);
  });
});
