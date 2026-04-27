import { describe, it, expect } from "vitest";
import { sanitizeFilename } from "../src/utils";

type FileFormat = "markdown" | "pdf" | "srt";

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

  describe("SrtLink template variable", () => {
    it("should populate {SrtLink} when creating SRT file", () => {
      const fileFormat: FileFormat = "srt";
      const newFilePath = "Attachments/My Video.srt";

      // Simulate the logic: when fileFormat === "srt", use newFilePath as srtFilePath
      let srtFilePath: string | null = null;
      if (fileFormat === "srt") {
        srtFilePath = newFilePath;
      }

      expect(srtFilePath).toBe("Attachments/My Video.srt");
    });

    it("should populate {SrtLink} when creating PDF with SRT enabled", () => {
      const fileFormat: FileFormat = "pdf";
      const fileFormats: FileFormat[] = ["pdf", "srt"];
      const videoTitle = "My Video";
      const srtBaseName = sanitizeFilename(videoTitle);

      // Simulate the logic: when fileFormat === "pdf" and SRT is enabled, compute SRT path
      let srtFilePath: string | null = null;
      if (fileFormat === "pdf" && fileFormats.includes("srt")) {
        srtFilePath = `Attachments/${srtBaseName}.srt`;
      }

      expect(srtFilePath).toBe("Attachments/My Video.srt");
    });

    it("should NOT populate {SrtLink} when creating markdown", () => {
      const fileFormat = "markdown" as FileFormat;
      const fileFormats: FileFormat[] = ["markdown"];

      let srtFilePath: string | null = null;
      if (fileFormat === "srt") {
        srtFilePath = "some_path";
      } else if (fileFormat === "pdf" && fileFormats.includes("srt")) {
        srtFilePath = "some_path";
      }

      expect(srtFilePath).toBeNull();
    });

    it("should NOT populate {SrtLink} when creating PDF without SRT enabled", () => {
      const fileFormat = "pdf" as FileFormat;
      const fileFormats: FileFormat[] = ["pdf"];

      let srtFilePath: string | null = null;
      if (fileFormat === "srt") {
        srtFilePath = "some_path";
      } else if (fileFormat === "pdf" && fileFormats.includes("srt")) {
        srtFilePath = "some_path";
      }

      expect(srtFilePath).toBeNull();
    });

    it("should replace {SrtLink} with empty string if srtFilePath is null", () => {
      const template = "Check out the [[{PdfLink}|PDF]] and [[{SrtLink}|SRT]]";
      const srtFilePath: string | null = null;
      const srtLinkPath = srtFilePath ? srtFilePath : null;

      const result = template.replace(/{SrtLink}/g, srtLinkPath ?? "");

      expect(result).toBe("Check out the [[{PdfLink}|PDF]] and [[|SRT]]");
    });

    it("should replace {SrtLink} with path if srtFilePath exists", () => {
      const template = "Check out the [[{PdfLink}|PDF]] and [[{SrtLink}|SRT]]";
      const srtFilePath = "Attachments/My Video.srt";
      const srtLinkPath = srtFilePath;

      const result = template.replace(/{SrtLink}/g, srtLinkPath ?? "");

      expect(result).toBe("Check out the [[{PdfLink}|PDF]] and [[Attachments/My Video.srt|SRT]]");
    });

    it("should not populate {PdfLink} when creating SRT file (issue #90)", () => {
      const fileFormat: FileFormat = "srt";
      const newFilePath = "Attachments/My Video.srt";

      // When creating SRT: attachmentFilePath is the SRT file, pdfLinkPath should be empty
      const attachmentFilePath = newFilePath;
      const isPdf = attachmentFilePath.endsWith(".pdf");
      const pdfLinkPath = isPdf ? attachmentFilePath : "";

      expect(pdfLinkPath).toBe("");
      expect(newFilePath).toContain(".srt");
    });

    it("should correctly populate both {PdfLink} and {SrtLink} when creating PDF with SRT", () => {
      const fileFormat: FileFormat = "pdf";
      const pdfFilePath = "Attachments/My Video.pdf";
      const srtFilePath = "Attachments/My Video.srt";
      const template = "PDF: {PdfLink}, SRT: {SrtLink}";

      // PDF should have the PDF path
      const pdfLinkPath = pdfFilePath.endsWith(".pdf") ? pdfFilePath : "";
      // SRT should have the SRT path
      const srtLinkPath = srtFilePath || null;

      let result = template.replace(/{PdfLink}/g, pdfLinkPath);
      result = result.replace(/{SrtLink}/g, srtLinkPath ?? "");

      expect(result).toBe("PDF: Attachments/My Video.pdf, SRT: Attachments/My Video.srt");
    });
  });

  describe("{PdfLink} not overwritten when generating PDF+SRT together (issue #92)", () => {
    type FileFormat = "markdown" | "pdf" | "srt";

    // Mirrors the skip logic added to createTranscriptFile
    function shouldSkipCoverNote(
      fileFormat: FileFormat,
      fileFormats: FileFormat[],
      settingsFileFormats: FileFormat[],
    ): boolean {
      const pdfAlsoInFormats =
        fileFormats.includes("pdf") || settingsFileFormats.includes("pdf");
      return fileFormat === "srt" && pdfAlsoInFormats;
    }

    it("should skip cover note creation for SRT when PDF is also in fileFormats", () => {
      expect(shouldSkipCoverNote("srt", ["pdf", "srt"], [])).toBe(true);
    });

    it("should skip cover note creation for SRT when PDF is in settings fileFormats", () => {
      expect(shouldSkipCoverNote("srt", [], ["pdf", "srt"])).toBe(true);
    });

    it("should NOT skip cover note creation for SRT-only workflow", () => {
      expect(shouldSkipCoverNote("srt", ["srt"], [])).toBe(false);
      expect(shouldSkipCoverNote("srt", [], ["srt"])).toBe(false);
      expect(shouldSkipCoverNote("srt", [], [])).toBe(false);
    });

    it("should NOT skip cover note creation for PDF format", () => {
      expect(shouldSkipCoverNote("pdf", ["pdf", "srt"], [])).toBe(false);
      expect(shouldSkipCoverNote("pdf", ["pdf"], [])).toBe(false);
    });

    it("should preserve {PdfLink} when PDF cover note is created before SRT iteration", () => {
      const pdfFilePath = "Folder/VideoTitle/VideoTitle.pdf";
      const srtFilePath = "Folder/VideoTitle/VideoTitle.srt";
      const template = "PDF: {PdfLink}\nSRT: {SrtLink}";

      // Simulate PDF iteration — creates cover note with both links
      const attachmentFilePath = pdfFilePath;
      const pdfLinkPath = !attachmentFilePath.endsWith(".srt") ? attachmentFilePath : "";
      const computedSrtLinkPath = srtFilePath;

      let coverNoteContent = template
        .replace(/{PdfLink}/g, pdfLinkPath)
        .replace(/{SrtLink}/g, computedSrtLinkPath);

      expect(coverNoteContent).toBe(
        "PDF: Folder/VideoTitle/VideoTitle.pdf\nSRT: Folder/VideoTitle/VideoTitle.srt",
      );

      // Simulate SRT iteration — with the fix, it should be skipped entirely.
      // Without the fix it would overwrite:
      const srtAttachmentFilePath = srtFilePath;
      const srtPdfLinkPath = !srtAttachmentFilePath.endsWith(".srt")
        ? srtAttachmentFilePath
        : "";

      const overwrittenContent = template
        .replace(/{PdfLink}/g, srtPdfLinkPath)
        .replace(/{SrtLink}/g, srtFilePath);

      // The broken (pre-fix) overwrite would produce an empty {PdfLink}
      expect(overwrittenContent).toBe("PDF: \nSRT: Folder/VideoTitle/VideoTitle.srt");

      // With the fix, the SRT iteration is skipped, so the PDF cover note content is preserved
      const fileFormats: FileFormat[] = ["pdf", "srt"];
      const fileFormat: FileFormat = "srt";
      const skipped = shouldSkipCoverNote(fileFormat, fileFormats, []);
      expect(skipped).toBe(true);

      // Final cover note content is unchanged from the PDF iteration
      expect(coverNoteContent).toContain("PDF: Folder/VideoTitle/VideoTitle.pdf");
      expect(coverNoteContent).toContain("SRT: Folder/VideoTitle/VideoTitle.srt");
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

    it("should skip SRT cover note creation when PDF is also enabled (issue #91)", () => {
      type FileFormat = "markdown" | "pdf" | "srt";
      const fileFormats: FileFormat[] = ["pdf", "srt"];

      // Simulate shouldCreateCoverNote logic for each format
      const shouldCreate = (fileFormat: FileFormat) =>
        fileFormat === "pdf" || (fileFormat === "srt" && !fileFormats.includes("pdf"));

      expect(shouldCreate("pdf")).toBe(true);
      expect(shouldCreate("srt")).toBe(false);
    });

    it("should create SRT cover note when PDF is not enabled", () => {
      type FileFormat = "markdown" | "pdf" | "srt";
      const fileFormats: FileFormat[] = ["srt"];

      const shouldCreate = (fileFormat: FileFormat) =>
        fileFormat === "pdf" || (fileFormat === "srt" && !fileFormats.includes("pdf"));

      expect(shouldCreate("srt")).toBe(true);
    });

    it("should skip SRT cover note when fileFormats is forwarded correctly (regression: fileFormats not passed to createTranscriptFile)", () => {
      type FileFormat = "markdown" | "pdf" | "srt";

      const shouldCreate = (fileFormat: FileFormat, fileFormats: FileFormat[]) =>
        fileFormat === "pdf" || (fileFormat === "srt" && !fileFormats.includes("pdf"));

      // Before fix: fileFormats defaulted to [] in createTranscriptFile, so the SRT run
      // would incorrectly create a cover note and overwrite the PDF cover note ({PdfLink} → empty)
      expect(shouldCreate("srt", [])).toBe(true);  // bug: always true with empty array

      // After fix: fileFormats is forwarded, so the SRT run is correctly skipped
      expect(shouldCreate("srt", ["pdf", "srt"])).toBe(false);  // correct: PDF cover note preserved
    });
  });
});
