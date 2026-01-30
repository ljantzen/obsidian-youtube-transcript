import { describe, it, expect } from "vitest";

describe("PDF Cover Note Root Directory Handling", () => {
  it("should extract directory correctly from PDF in root", () => {
    const pdfFilePath = "Test Video.pdf";
    const pdfDir = pdfFilePath.substring(0, pdfFilePath.lastIndexOf("/"));
    
    // When there's no "/", lastIndexOf returns -1, substring(0, -1) returns ""
    expect(pdfDir).toBe("");
  });

  it("should extract directory correctly from PDF in subdirectory", () => {
    const pdfFilePath = "Transcripts/Test Video.pdf";
    const pdfDir = pdfFilePath.substring(0, pdfFilePath.lastIndexOf("/"));
    
    expect(pdfDir).toBe("Transcripts");
  });

  it("should extract directory correctly from PDF in nested subdirectory", () => {
    const pdfFilePath = "Notes/PDF/Transcripts/Test Video.pdf";
    const pdfDir = pdfFilePath.substring(0, pdfFilePath.lastIndexOf("/"));
    
    expect(pdfDir).toBe("Notes/PDF/Transcripts");
  });

  it("should handle calculateCoverNoteDirectory fallback for root directory", () => {
    // Simulate calculateCoverNoteDirectory logic when pdfCoverNoteLocation is empty
    const pdfFilePath = "Test Video.pdf";
    const coverNoteLocation: string = ""; // Empty means use PDF directory
    
    let coverNoteDirectory = "";
    if (coverNoteLocation && coverNoteLocation.trim() !== "") {
      coverNoteDirectory = coverNoteLocation;
    } else {
      const pdfDir = pdfFilePath.substring(0, pdfFilePath.lastIndexOf("/"));
      coverNoteDirectory = pdfDir || "";
    }
    
    // Should be empty string for root directory
    expect(coverNoteDirectory).toBe("");
  });

  it("should build correct cover note path for root directory", () => {
    const coverNoteDirectory = ""; // Root directory
    const coverNoteFileName = "Test Video.md";
    
    const coverNotePath = coverNoteDirectory
      ? `${coverNoteDirectory}/${coverNoteFileName}`
      : coverNoteFileName;
    
    // Should be just the filename when directory is empty
    expect(coverNotePath).toBe("Test Video.md");
  });

  it("should build correct cover note path for subdirectory", () => {
    const coverNoteDirectory = "Notes/PDF Covers";
    const coverNoteFileName = "Test Video.md";
    
    const coverNotePath = coverNoteDirectory
      ? `${coverNoteDirectory}/${coverNoteFileName}`
      : coverNoteFileName;
    
    expect(coverNotePath).toBe("Notes/PDF Covers/Test Video.md");
  });

  it("should extract PDF directory name correctly from root", () => {
    // Simulate the logic at lines 1214-1215 in main.ts
    const pdfFilePath = "Test Video.pdf";
    const pdfDirPath = pdfFilePath.substring(0, pdfFilePath.lastIndexOf("/"));
    const pdfDirectory = pdfDirPath.substring(pdfDirPath.lastIndexOf("/") + 1) || "";
    
    // When in root, pdfDirPath is "", substring(0) on "" returns ""
    expect(pdfDirectory).toBe("");
  });

  it("should extract PDF directory name correctly from subdirectory", () => {
    const pdfFilePath = "Transcripts/Test Video.pdf";
    const pdfDirPath = pdfFilePath.substring(0, pdfFilePath.lastIndexOf("/"));
    const pdfDirectory = pdfDirPath.substring(pdfDirPath.lastIndexOf("/") + 1) || "";
    
    // Should extract just "Transcripts"
    expect(pdfDirectory).toBe("Transcripts");
  });

  it("should extract PDF directory name correctly from nested subdirectory", () => {
    const pdfFilePath = "Notes/PDF/Transcripts/Test Video.pdf";
    const pdfDirPath = pdfFilePath.substring(0, pdfFilePath.lastIndexOf("/"));
    const pdfDirectory = pdfDirPath.substring(pdfDirPath.lastIndexOf("/") + 1) || "";
    
    // Should extract just the last directory name "Transcripts"
    expect(pdfDirectory).toBe("Transcripts");
  });

  it("should calculate parent directory for nested PDF", () => {
    // When PDF nesting is enabled, cover note should be in parent directory
    // e.g., PDF at "Attachments/VideoTitle/video.pdf" -> parent is "Attachments"
    const pdfFilePath = "Attachments/VideoTitle/Test Video.pdf";
    const pdfDir = pdfFilePath.substring(0, pdfFilePath.lastIndexOf("/"));
    const parentDir = pdfDir.substring(0, pdfDir.lastIndexOf("/"));
    
    expect(pdfDir).toBe("Attachments/VideoTitle");
    expect(parentDir).toBe("Attachments");
  });

  it("should handle parent directory for nested PDF in root", () => {
    // When PDF is nested one level deep from root
    const pdfFilePath = "VideoTitle/Test Video.pdf";
    const pdfDir = pdfFilePath.substring(0, pdfFilePath.lastIndexOf("/"));
    const parentDir = pdfDir.substring(0, pdfDir.lastIndexOf("/"));
    
    expect(pdfDir).toBe("VideoTitle");
    expect(parentDir).toBe(""); // Parent of first-level folder is root (empty string)
  });

  it("should handle parent directory extraction edge case", () => {
    // Edge case: PDF in root directory (no nesting possible)
    const pdfFilePath = "Test Video.pdf";
    const pdfDir = pdfFilePath.substring(0, pdfFilePath.lastIndexOf("/"));
    // pdfDir is "" (empty), so parentDir would be substring(0, -1)
    const parentDir = pdfDir.substring(0, pdfDir.lastIndexOf("/"));
    
    expect(pdfDir).toBe("");
    expect(parentDir).toBe(""); // Stays empty
  });
});
