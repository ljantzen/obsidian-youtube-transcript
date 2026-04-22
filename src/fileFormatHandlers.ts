import { App, Notice } from "obsidian";
import type { FileFormat, TranscriptSegment } from "./types";
import { generatePdfFromMarkdown } from "./pdfGenerator";
import { generateSrt } from "./srtFormatter";

export interface FileFormatHandler {
  readonly extension: string;
  createFile(app: App, filePath: string, markdownContent: string, segments: TranscriptSegment[]): Promise<void>;
  postCreate(app: App, filePath: string): Promise<void>;
}

class MarkdownHandler implements FileFormatHandler {
  readonly extension = "md";

  async createFile(app: App, filePath: string, markdownContent: string, _segments: TranscriptSegment[]): Promise<void> {
    await app.vault.create(filePath, markdownContent);
  }

  async postCreate(app: App, filePath: string): Promise<void> {
    await app.workspace.openLinkText(filePath, "", false);
  }
}

class PDFHandler implements FileFormatHandler {
  readonly extension = "pdf";

  async createFile(app: App, filePath: string, markdownContent: string, _segments: TranscriptSegment[]): Promise<void> {
    try {
      const pdfBuffer = await generatePdfFromMarkdown(app, markdownContent);
      await app.vault.createBinary(filePath, pdfBuffer);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      new Notice(`PDF generation failed: ${msg}. Please try markdown format instead.`, 10000);
      throw error;
    }
  }

  async postCreate(_app: App, filePath: string): Promise<void> {
    new Notice(`PDF file created: ${filePath}`);
  }
}

class SRTHandler implements FileFormatHandler {
  readonly extension = "srt";

  async createFile(app: App, filePath: string, _markdownContent: string, segments: TranscriptSegment[]): Promise<void> {
    await app.vault.create(filePath, generateSrt(segments));
  }

  async postCreate(_app: App, filePath: string): Promise<void> {
    new Notice(`SRT file created: ${filePath}`);
  }
}

export function getFormatHandler(format: FileFormat): FileFormatHandler {
  switch (format) {
    case "pdf": return new PDFHandler();
    case "srt": return new SRTHandler();
    default:    return new MarkdownHandler();
  }
}
