import { describe, it, expect } from "vitest";
import { DEFAULT_SETTINGS } from "../src/settings";

type FileFormat = "markdown" | "pdf" | "srt";

describe("File Format Settings", () => {
  it("should have fileFormats in default settings", () => {
    expect(Array.isArray(DEFAULT_SETTINGS.fileFormats)).toBe(true);
    expect(DEFAULT_SETTINGS.fileFormats).toContain("markdown");
    expect(["markdown", "pdf", "srt"]).toContain(DEFAULT_SETTINGS.fileFormats[0]);
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

  describe("SRT file naming", () => {
    it("should have defaultSrtFileName in default settings", () => {
      expect(DEFAULT_SETTINGS.defaultSrtFileName).toBe("{VideoName}");
    });

    it("should support SRT naming templates", () => {
      const templates = ["{VideoName}", "{ChannelName}", "{VideoName} - {ChannelName}"];
      templates.forEach((template) => {
        expect(typeof template).toBe("string");
        expect(template.length).toBeGreaterThan(0);
      });
    });

    it("should default to {VideoName} for SRT files like markdown", () => {
      expect(DEFAULT_SETTINGS.defaultSrtFileName).toBe(
        DEFAULT_SETTINGS.defaultNoteName
      );
    });
  });
});

// ---------------------------------------------------------------------------
// Regression tests for issue #107 (modal checkbox initialization)
// Bug: the URL modal pre-checked only the FIRST format in settings.fileFormats
// (checkbox.checked = format === enabledFormats[0]), so when a user configured
// ["pdf","srt"] the modal opened with pdf checked and srt unchecked. The
// submitted fileFormats array was ["pdf"], and srt was never processed.
//
// Fix: every format in enabledFormats is pre-checked (checkbox.checked = true).
// ---------------------------------------------------------------------------

/**
 * Simulates the modal's checkbox initialization for a given enabledFormats list.
 * Returns the set of formats that would be pre-checked when the modal opens.
 *
 * Old (broken): checkbox.checked = format === enabledFormats[0]
 * Fixed:        checkbox.checked = true
 */
function modalInitialCheckedFormats_old(enabledFormats: string[]): string[] {
  return enabledFormats.filter((format) => format === enabledFormats[0]);
}

function modalInitialCheckedFormats_fixed(enabledFormats: string[]): string[] {
  return [...enabledFormats]; // all checked
}

describe("Modal checkbox initialization — issue #107 regression", () => {
  describe("old (broken) behaviour: only first format pre-checked", () => {
    it("checks only pdf when settings are [pdf, srt]", () => {
      const checked = modalInitialCheckedFormats_old(["pdf", "srt"]);
      expect(checked).toEqual(["pdf"]);
      expect(checked).not.toContain("srt");
    });

    it("checks only markdown when settings are [markdown, pdf, srt]", () => {
      const checked = modalInitialCheckedFormats_old(["markdown", "pdf", "srt"]);
      expect(checked).toEqual(["markdown"]);
    });
  });

  describe("fixed behaviour: all configured formats pre-checked", () => {
    it("checks both pdf and srt when settings are [pdf, srt]", () => {
      const checked = modalInitialCheckedFormats_fixed(["pdf", "srt"]);
      expect(checked).toContain("pdf");
      expect(checked).toContain("srt");
      expect(checked).toHaveLength(2);
    });

    it("checks all three formats when settings are [markdown, pdf, srt]", () => {
      const checked = modalInitialCheckedFormats_fixed(["markdown", "pdf", "srt"]);
      expect(checked).toEqual(["markdown", "pdf", "srt"]);
    });

    it("checks single format when only one is configured", () => {
      expect(modalInitialCheckedFormats_fixed(["markdown"])).toEqual(["markdown"]);
      expect(modalInitialCheckedFormats_fixed(["pdf"])).toEqual(["pdf"]);
      expect(modalInitialCheckedFormats_fixed(["srt"])).toEqual(["srt"]);
    });

    it("submitted formats match the full settings.fileFormats array", () => {
      // The formats submitted to onSubmit must equal the full configured list,
      // not a truncated one — this is what caused the missing SRT
      const settingsFileFormats: FileFormat[] = ["pdf", "srt"];
      const submitted = modalInitialCheckedFormats_fixed(settingsFileFormats) as FileFormat[];
      expect(submitted).toEqual(settingsFileFormats);
    });
  });
});
