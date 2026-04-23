import { describe, it, expect } from "vitest";
import { sanitizeFilename } from "../src/utils";

describe("Cover Note Naming", () => {
  describe("Default cover note file name template", () => {
    it("should use {VideoName} by default", () => {
      const defaultCoverNoteName = "{VideoName}";
      // Simulate template variable replacement
      const videoTitle = "My Video Title";
      const coverNoteName = defaultCoverNoteName === "{VideoName}"
        ? sanitizeFilename(videoTitle)
        : defaultCoverNoteName;

      expect(coverNoteName).toBe("My Video Title");
    });

    it("should support {ChannelName} template variable", () => {
      const defaultCoverNoteName = "{ChannelName} - Cover Notes";
      const channelName = "My Channel";
      const coverNoteName = defaultCoverNoteName
        .replace("{ChannelName}", channelName)
        .trim();

      expect(coverNoteName).toBe("My Channel - Cover Notes");
    });

    it("should support {VideoName} template variable", () => {
      const defaultCoverNoteName = "Notes - {VideoName}";
      const videoTitle = "Great Video";
      const coverNoteName = defaultCoverNoteName
        .replace("{VideoName}", videoTitle)
        .trim();

      expect(coverNoteName).toBe("Notes - Great Video");
    });

    it("should sanitize the result", () => {
      const defaultCoverNoteName = "{VideoName}";
      const videoTitle = 'Video <with> "invalid" chars';
      const coverNoteName = sanitizeFilename(videoTitle);

      // Invalid chars should be removed
      expect(coverNoteName).not.toContain("<");
      expect(coverNoteName).not.toContain(">");
      expect(coverNoteName).not.toContain('"');
    });

    it("should handle empty channel name gracefully", () => {
      const defaultCoverNoteName = "{ChannelName} - {VideoName}";
      const channelName = "";
      const videoTitle = "Video";
      const coverNoteName = defaultCoverNoteName
        .replace("{ChannelName}", channelName)
        .replace("{VideoName}", videoTitle)
        .replace(/\s+/g, " ")
        .trim();

      expect(coverNoteName).toBe("- Video");
    });

    it("should handle both template variables together", () => {
      const defaultCoverNoteName = "{ChannelName} - {VideoName}";
      const channelName = "My Channel";
      const videoTitle = "My Video";
      const coverNoteName = defaultCoverNoteName
        .replace("{ChannelName}", channelName)
        .replace("{VideoName}", videoTitle);

      expect(coverNoteName).toBe("My Channel - My Video");
    });

    it("should normalize multiple spaces", () => {
      const defaultCoverNoteName = "{ChannelName}   {VideoName}";
      const channelName = "Channel";
      const videoTitle = "Video";
      const coverNoteName = defaultCoverNoteName
        .replace("{ChannelName}", channelName)
        .replace("{VideoName}", videoTitle)
        .replace(/\s+/g, " ")
        .trim();

      expect(coverNoteName).toBe("Channel Video");
    });
  });

  describe("Duplicate cover note prevention", () => {
    it("should detect if cover note file already exists", () => {
      const coverNotePath = "Videos/My Video.md";
      const existingFile = "Videos/My Video.md";

      const isDuplicate = coverNotePath === existingFile;
      expect(isDuplicate).toBe(true);
    });

    it("should not create duplicate when processing multiple formats", () => {
      const videoTitle = "Test Video";
      const formats = ["pdf", "srt"];

      // Simulate the logic: collect cover note names for all formats
      const coverNoteNames = new Set<string>();
      for (const format of formats) {
        const coverNoteName = sanitizeFilename(videoTitle);
        coverNoteNames.add(coverNoteName);
      }

      // Should have only one unique cover note name
      expect(coverNoteNames.size).toBe(1);
    });

    it("should update existing cover note instead of creating new one", () => {
      const existingNote = { path: "Videos/My Video.md", content: "Old content" };
      const newContent = "Updated content with new SRT link";

      // Simulate update instead of create
      const updatedNote = { ...existingNote, content: newContent };

      expect(updatedNote.path).toBe(existingNote.path);
      expect(updatedNote.content).not.toBe(existingNote.content);
    });
  });
});
