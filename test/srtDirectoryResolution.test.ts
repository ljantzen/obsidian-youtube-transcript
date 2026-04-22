/**
 * Tests for SRT directory resolution logic fixed in issue #81:
 * 1. srtLocation supports {VideoName}/{ChannelName} template variables
 * 2. PDF cover note {SrtLink} uses defaultSrtFileName (not the PDF/note template)
 * 3. PDF cover note {SrtLink} uses correct SRT directory, not the PDF attachment folder
 */
import { describe, it, expect } from "vitest";
import { replaceTemplateVariables } from "../src/utils/templateVariables";
import { normalizePath } from "../src/utils/pathUtils";
import { sanitizeFilename } from "../src/utils";

// ---------------------------------------------------------------------------
// Helpers that mirror the fixed logic in main.ts
// ---------------------------------------------------------------------------

interface SrtDirParams {
  srtLocation: string;
  videoTitle: string;
  channelName: string | null;
  selectedDirectory: string | null;
  activeFilePath: string | null;
}

/** Mirrors the fixed srtLocation directory resolution in createTranscriptFile(). */
function resolveSrtDirectory(params: SrtDirParams): string {
  const { srtLocation, videoTitle, channelName, selectedDirectory, activeFilePath } = params;
  if (srtLocation?.trim()) {
    let srtLoc = replaceTemplateVariables(srtLocation, { videoTitle, channelName });
    srtLoc = srtLoc.replace(/\/+/g, "/").replace(/^\/|\/$/g, "");
    return normalizePath(srtLoc);
  } else if (selectedDirectory !== null) {
    return selectedDirectory;
  } else if (activeFilePath) {
    const lastSlash = activeFilePath.lastIndexOf("/");
    return lastSlash >= 0 ? activeFilePath.substring(0, lastSlash) : "";
  }
  return "";
}

interface SrtPathForCoverNoteParams {
  srtLocation: string;
  defaultSrtFileName: string;
  defaultNoteName: string; // PDF/note template — must NOT affect SRT filename
  videoTitle: string;
  channelName: string | null;
  selectedDirectory: string | null;
  activeFilePath: string | null;
}

/** Mirrors the fixed srtFilePath computation inside the PDF cover note block. */
function computeSrtPathForCoverNote(params: SrtPathForCoverNoteParams): string {
  const {
    srtLocation,
    defaultSrtFileName,
    videoTitle,
    channelName,
    selectedDirectory,
    activeFilePath,
  } = params;

  // Filename: must use SRT-specific template, not note/PDF template
  const srtNameTemplate = defaultSrtFileName || "{VideoName}";
  let srtName = replaceTemplateVariables(srtNameTemplate, { videoTitle, channelName });
  srtName = srtName.replace(/\s+/g, " ").trim();
  const srtBaseName = sanitizeFilename(srtName || videoTitle);

  // Directory: same resolution as SRT file creation itself
  let srtDir: string;
  if (srtLocation?.trim()) {
    let srtLoc = replaceTemplateVariables(srtLocation, { videoTitle, channelName });
    srtLoc = srtLoc.replace(/\/+/g, "/").replace(/^\/|\/$/g, "");
    srtDir = normalizePath(srtLoc);
  } else if (selectedDirectory !== null) {
    srtDir = selectedDirectory;
  } else if (activeFilePath) {
    const lastSlash = activeFilePath.lastIndexOf("/");
    srtDir = lastSlash >= 0 ? activeFilePath.substring(0, lastSlash) : "";
  } else {
    srtDir = "";
  }

  return srtDir ? `${srtDir}/${srtBaseName}.srt` : `${srtBaseName}.srt`;
}

// ---------------------------------------------------------------------------
// Tests: srtLocation directory resolution
// ---------------------------------------------------------------------------

describe("SRT directory resolution (issue #81)", () => {
  describe("srtLocation template variable expansion", () => {
    it("expands {VideoName} in srtLocation", () => {
      const dir = resolveSrtDirectory({
        srtLocation: "Subtitles/{VideoName}",
        videoTitle: "My Great Video",
        channelName: null,
        selectedDirectory: null,
        activeFilePath: null,
      });
      expect(dir).toBe("Subtitles/My Great Video");
    });

    it("expands {ChannelName} in srtLocation", () => {
      const dir = resolveSrtDirectory({
        srtLocation: "{ChannelName}/SRT",
        videoTitle: "Some Video",
        channelName: "TechChannel",
        selectedDirectory: null,
        activeFilePath: null,
      });
      expect(dir).toBe("TechChannel/SRT");
    });

    it("expands both {VideoName} and {ChannelName} in srtLocation", () => {
      const dir = resolveSrtDirectory({
        srtLocation: "Media/{ChannelName}/{VideoName}",
        videoTitle: "Episode 1",
        channelName: "MyChannel",
        selectedDirectory: null,
        activeFilePath: null,
      });
      expect(dir).toBe("Media/MyChannel/Episode 1");
    });

    it("removes leading and trailing slashes after expansion", () => {
      const dir = resolveSrtDirectory({
        srtLocation: "/Subtitles/",
        videoTitle: "Video",
        channelName: null,
        selectedDirectory: null,
        activeFilePath: null,
      });
      expect(dir).toBe("Subtitles");
    });

    it("collapses double slashes produced by empty {ChannelName}", () => {
      const dir = resolveSrtDirectory({
        srtLocation: "{ChannelName}/SRT",
        videoTitle: "Video",
        channelName: null, // empty channel → {ChannelName} becomes ""
        selectedDirectory: null,
        activeFilePath: null,
      });
      // "//SRT" → collapsed to "/SRT" → stripped to "SRT"
      expect(dir).toBe("SRT");
    });

    it("uses raw srtLocation when no template variables present", () => {
      const dir = resolveSrtDirectory({
        srtLocation: "Subtitles/English",
        videoTitle: "Whatever",
        channelName: "Chan",
        selectedDirectory: null,
        activeFilePath: null,
      });
      expect(dir).toBe("Subtitles/English");
    });
  });

  describe("srtLocation fallback chain when srtLocation is empty", () => {
    it("falls back to selectedDirectory when srtLocation is empty", () => {
      const dir = resolveSrtDirectory({
        srtLocation: "",
        videoTitle: "Video",
        channelName: null,
        selectedDirectory: "Transcripts",
        activeFilePath: "Notes/CurrentFile.md",
      });
      expect(dir).toBe("Transcripts");
    });

    it("falls back to activeFile directory when srtLocation is empty and selectedDirectory is null", () => {
      const dir = resolveSrtDirectory({
        srtLocation: "",
        videoTitle: "Video",
        channelName: null,
        selectedDirectory: null,
        activeFilePath: "Notes/YouTube/CurrentFile.md",
      });
      expect(dir).toBe("Notes/YouTube");
    });

    it("returns empty string for root-level activeFile with empty srtLocation", () => {
      const dir = resolveSrtDirectory({
        srtLocation: "",
        videoTitle: "Video",
        channelName: null,
        selectedDirectory: null,
        activeFilePath: "RootFile.md",
      });
      expect(dir).toBe("");
    });

    it("returns empty string when all fallbacks are absent", () => {
      const dir = resolveSrtDirectory({
        srtLocation: "",
        videoTitle: "Video",
        channelName: null,
        selectedDirectory: null,
        activeFilePath: null,
      });
      expect(dir).toBe("");
    });

    it("whitespace-only srtLocation is treated as empty (falls back to selectedDirectory)", () => {
      const dir = resolveSrtDirectory({
        srtLocation: "   ",
        videoTitle: "Video",
        channelName: null,
        selectedDirectory: "Transcripts",
        activeFilePath: null,
      });
      expect(dir).toBe("Transcripts");
    });
  });
});

// ---------------------------------------------------------------------------
// Tests: SRT path computation for PDF cover note
// ---------------------------------------------------------------------------

describe("SRT path for PDF cover note (issue #81)", () => {
  describe("uses defaultSrtFileName, not the note/PDF name template", () => {
    it("uses defaultSrtFileName template for the SRT filename", () => {
      const path = computeSrtPathForCoverNote({
        srtLocation: "Subtitles",
        defaultSrtFileName: "{ChannelName} - {VideoName}",
        defaultNoteName: "YT - {VideoName}", // different template; must be ignored
        videoTitle: "Episode 5",
        channelName: "CoolChannel",
        selectedDirectory: null,
        activeFilePath: null,
      });
      expect(path).toBe("Subtitles/CoolChannel - Episode 5.srt");
    });

    it("falls back to {VideoName} when defaultSrtFileName is empty", () => {
      const path = computeSrtPathForCoverNote({
        srtLocation: "Subtitles",
        defaultSrtFileName: "",
        defaultNoteName: "Ignored - {VideoName}",
        videoTitle: "My Video",
        channelName: null,
        selectedDirectory: null,
        activeFilePath: null,
      });
      expect(path).toBe("Subtitles/My Video.srt");
    });
  });

  describe("uses correct SRT directory, not the PDF attachment folder", () => {
    it("uses srtLocation when set, ignoring any PDF-specific directory", () => {
      const path = computeSrtPathForCoverNote({
        srtLocation: "Subtitles",
        defaultSrtFileName: "{VideoName}",
        defaultNoteName: "{VideoName}",
        videoTitle: "Great Talk",
        channelName: null,
        selectedDirectory: null,
        activeFilePath: null,
      });
      // Should land in Subtitles/, not in the PDF attachment folder
      expect(path).toBe("Subtitles/Great Talk.srt");
      expect(path).not.toContain("attachments");
    });

    it("uses selectedDirectory as SRT directory when srtLocation is empty", () => {
      const path = computeSrtPathForCoverNote({
        srtLocation: "",
        defaultSrtFileName: "{VideoName}",
        defaultNoteName: "{VideoName}",
        videoTitle: "Great Talk",
        channelName: null,
        selectedDirectory: "Transcripts/2024",
        activeFilePath: null,
      });
      expect(path).toBe("Transcripts/2024/Great Talk.srt");
    });

    it("uses activeFile directory as SRT directory when srtLocation and selectedDirectory are absent", () => {
      const path = computeSrtPathForCoverNote({
        srtLocation: "",
        defaultSrtFileName: "{VideoName}",
        defaultNoteName: "{VideoName}",
        videoTitle: "Great Talk",
        channelName: null,
        selectedDirectory: null,
        activeFilePath: "Notes/YouTube/SomeNote.md",
      });
      expect(path).toBe("Notes/YouTube/Great Talk.srt");
    });

    it("produces root-level SRT path when all directory sources are absent", () => {
      const path = computeSrtPathForCoverNote({
        srtLocation: "",
        defaultSrtFileName: "{VideoName}",
        defaultNoteName: "{VideoName}",
        videoTitle: "Great Talk",
        channelName: null,
        selectedDirectory: null,
        activeFilePath: null,
      });
      expect(path).toBe("Great Talk.srt");
    });
  });

  describe("srtLocation with template variables in cover note path", () => {
    it("expands {ChannelName} in srtLocation for cover note SRT path", () => {
      const path = computeSrtPathForCoverNote({
        srtLocation: "Media/{ChannelName}/SRT",
        defaultSrtFileName: "{VideoName}",
        defaultNoteName: "{VideoName}",
        videoTitle: "Episode 1",
        channelName: "DevChannel",
        selectedDirectory: null,
        activeFilePath: null,
      });
      expect(path).toBe("Media/DevChannel/SRT/Episode 1.srt");
    });

    it("expands {VideoName} in srtLocation for cover note SRT path", () => {
      const path = computeSrtPathForCoverNote({
        srtLocation: "SRT/{VideoName}",
        defaultSrtFileName: "{VideoName}",
        defaultNoteName: "{VideoName}",
        videoTitle: "Cool Talk",
        channelName: null,
        selectedDirectory: null,
        activeFilePath: null,
      });
      expect(path).toBe("SRT/Cool Talk/Cool Talk.srt");
    });
  });
});
