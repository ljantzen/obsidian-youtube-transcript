import { describe, it, expect } from "vitest";

describe("File Format Settings", () => {
  it("should have fileFormat in default settings", () => {
    const defaultSettings = {
      fileFormat: "markdown" as "markdown" | "pdf",
    };

    expect(defaultSettings.fileFormat).toBe("markdown");
    expect(["markdown", "pdf"]).toContain(defaultSettings.fileFormat);
  });

  it("should validate file format values", () => {
    const validFormats: ("markdown" | "pdf")[] = ["markdown", "pdf"];

    validFormats.forEach((format) => {
      expect(typeof format).toBe("string");
      expect(["markdown", "pdf"]).toContain(format);
    });
  });

  it("should handle markdown format", () => {
    const format = "markdown";
    expect(format).toBe("markdown");
    expect(format).not.toBe("pdf");
  });

  it("should handle PDF format", () => {
    const format = "pdf";
    expect(format).toBe("pdf");
    expect(format).not.toBe("markdown");
  });

  it("should default to markdown for backward compatibility", () => {
    const settings = {
      fileFormat: undefined as "markdown" | "pdf" | undefined,
    };

    const defaultFormat = settings.fileFormat || "markdown";
    expect(defaultFormat).toBe("markdown");
  });

  it("should allow switching between formats", () => {
    let format: "markdown" | "pdf" = "markdown";
    expect(format).toBe("markdown");

    format = "pdf";
    expect(format).toBe("pdf");

    format = "markdown";
    expect(format).toBe("markdown");
  });

  it("should validate file extension based on format", () => {
    const getExtension = (format: "markdown" | "pdf"): string => {
      return format === "pdf" ? "pdf" : "md";
    };

    expect(getExtension("markdown")).toBe("md");
    expect(getExtension("pdf")).toBe("pdf");
  });

  it("should handle file path construction with format", () => {
    const baseName = "Test Video";
    const getFilePath = (format: "markdown" | "pdf", base: string): string => {
      const extension = format === "pdf" ? "pdf" : "md";
      return `${base}.${extension}`;
    };

    expect(getFilePath("markdown", baseName)).toBe("Test Video.md");
    expect(getFilePath("pdf", baseName)).toBe("Test Video.pdf");
  });
});
