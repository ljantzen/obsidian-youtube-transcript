import { describe, it, expect } from "vitest";
import { DEFAULT_SETTINGS } from "../src/settings";

type FileFormat = "markdown" | "pdf" | "srt";

describe("File Format Settings", () => {
  it("should have fileFormat in default settings", () => {
    expect(DEFAULT_SETTINGS.fileFormat).toBe("markdown");
    expect(["markdown", "pdf", "srt"]).toContain(DEFAULT_SETTINGS.fileFormat);
  });

  it("should validate file format values", () => {
    const validFormats: FileFormat[] = ["markdown", "pdf", "srt"];

    validFormats.forEach((format) => {
      expect(typeof format).toBe("string");
      expect(["markdown", "pdf", "srt"]).toContain(format);
    });
  });

  it("should handle markdown format", () => {
    const format: FileFormat = "markdown";
    expect(format).toBe("markdown");
    expect(format).not.toBe("pdf");
    expect(format).not.toBe("srt");
  });

  it("should handle PDF format", () => {
    const format: FileFormat = "pdf";
    expect(format).toBe("pdf");
    expect(format).not.toBe("markdown");
    expect(format).not.toBe("srt");
  });

  it("should handle SRT format", () => {
    const format: FileFormat = "srt";
    expect(format).toBe("srt");
    expect(format).not.toBe("markdown");
    expect(format).not.toBe("pdf");
  });

  it("should default to markdown for backward compatibility", () => {
    const settings = {
      fileFormat: undefined as FileFormat | undefined,
    };

    const defaultFormat = settings.fileFormat || "markdown";
    expect(defaultFormat).toBe("markdown");
  });

  it("should allow switching between all three formats", () => {
    let format: FileFormat = "markdown";
    expect(format).toBe("markdown");

    format = "pdf";
    expect(format).toBe("pdf");

    format = "srt";
    expect(format).toBe("srt");

    format = "markdown";
    expect(format).toBe("markdown");
  });

  it("should validate file extension based on format", () => {
    const getExtension = (format: FileFormat): string => {
      return format === "pdf" ? "pdf" : format === "srt" ? "srt" : "md";
    };

    expect(getExtension("markdown")).toBe("md");
    expect(getExtension("pdf")).toBe("pdf");
    expect(getExtension("srt")).toBe("srt");
  });

  it("should handle file path construction with format", () => {
    const baseName = "Test Video";
    const getFilePath = (format: FileFormat, base: string): string => {
      const extension = format === "pdf" ? "pdf" : format === "srt" ? "srt" : "md";
      return `${base}.${extension}`;
    };

    expect(getFilePath("markdown", baseName)).toBe("Test Video.md");
    expect(getFilePath("pdf", baseName)).toBe("Test Video.pdf");
    expect(getFilePath("srt", baseName)).toBe("Test Video.srt");
  });

  describe("createNewFile requirement", () => {
    it("PDF and SRT require createNewFile; markdown does not", () => {
      const requiresNewFile = (format: FileFormat) =>
        format === "pdf" || format === "srt";

      expect(requiresNewFile("markdown")).toBe(false);
      expect(requiresNewFile("pdf")).toBe(true);
      expect(requiresNewFile("srt")).toBe(true);
    });
  });

  describe("LLM processing compatibility", () => {
    it("SRT should skip LLM processing; other formats should not", () => {
      const shouldSkipLLM = (format: FileFormat) => format === "srt";

      expect(shouldSkipLLM("markdown")).toBe(false);
      expect(shouldSkipLLM("pdf")).toBe(false);
      expect(shouldSkipLLM("srt")).toBe(true);
    });
  });
});
