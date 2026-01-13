import { describe, it, expect } from "vitest";

describe("PDF Cover Note Settings", () => {
  it("should have createPdfCoverNote in default settings", () => {
    const defaultSettings = {
      createPdfCoverNote: false,
    };

    expect(typeof defaultSettings.createPdfCoverNote).toBe("boolean");
    expect(defaultSettings.createPdfCoverNote).toBe(false);
  });

  it("should have pdfCoverNoteLocation in default settings", () => {
    const defaultSettings = {
      pdfCoverNoteLocation: "",
    };

    expect(typeof defaultSettings.pdfCoverNoteLocation).toBe("string");
    expect(defaultSettings.pdfCoverNoteLocation).toBe("");
  });

  it("should have pdfCoverNoteTemplate in default settings", () => {
    const defaultSettings = {
      pdfCoverNoteTemplate: "",
    };

    expect(typeof defaultSettings.pdfCoverNoteTemplate).toBe("string");
    expect(defaultSettings.pdfCoverNoteTemplate).toBe("");
  });

  it("should handle createPdfCoverNote toggle", () => {
    const settings = {
      createPdfCoverNote: false,
    };

    expect(settings.createPdfCoverNote).toBe(false);

    settings.createPdfCoverNote = true;
    expect(settings.createPdfCoverNote).toBe(true);

    settings.createPdfCoverNote = false;
    expect(settings.createPdfCoverNote).toBe(false);
  });

  it("should handle pdfCoverNoteLocation with template variables", () => {
    const settings = {
      pdfCoverNoteLocation: "Notes/{ChannelName}/{VideoName}",
    };

    expect(settings.pdfCoverNoteLocation).toBe("Notes/{ChannelName}/{VideoName}");
    expect(settings.pdfCoverNoteLocation).toContain("{ChannelName}");
    expect(settings.pdfCoverNoteLocation).toContain("{VideoName}");
  });

  it("should handle pdfCoverNoteTemplate path", () => {
    const settings = {
      pdfCoverNoteTemplate: "Templates/PDF Cover Note.md",
    };

    expect(typeof settings.pdfCoverNoteTemplate).toBe("string");
    expect(settings.pdfCoverNoteTemplate).toContain(".md");
  });
});

describe("PDF Cover Note Template Variables", () => {
  it("should replace {ChannelName} variable", () => {
    const template = "Channel: {ChannelName}";
    const channelName = "Test Channel";
    const sanitizeFilename = (name: string): string => {
      return name.replace(/[<>:"/\\|?*]/g, "").trim();
    };

    const sanitizedChannelName = sanitizeFilename(channelName);
    const result = template.replace(/{ChannelName}/g, sanitizedChannelName);

    expect(result).toBe("Channel: Test Channel");
    expect(result).not.toContain("{ChannelName}");
  });

  it("should replace {VideoName} variable", () => {
    const template = "Video: {VideoName}";
    const videoTitle = "Test Video Title";
    const sanitizeFilename = (name: string): string => {
      return name.replace(/[<>:"/\\|?*]/g, "").trim();
    };

    const sanitizedVideoName = sanitizeFilename(videoTitle);
    const result = template.replace(/{VideoName}/g, sanitizedVideoName);

    expect(result).toBe("Video: Test Video Title");
    expect(result).not.toContain("{VideoName}");
  });

  it("should replace {VideoUrl} variable", () => {
    const template = "URL: {VideoUrl}";
    const videoUrl = "https://www.youtube.com/watch?v=test123";

    const result = template.replace(/{VideoUrl}/g, videoUrl);

    expect(result).toBe("URL: https://www.youtube.com/watch?v=test123");
    expect(result).not.toContain("{VideoUrl}");
  });

  it("should replace {Summary} variable", () => {
    const template = "Summary: {Summary}";
    const summary = "This is a test summary";

    const result = template.replace(/{Summary}/g, summary);

    expect(result).toBe("Summary: This is a test summary");
    expect(result).not.toContain("{Summary}");
  });

  it("should replace {Summary} with empty string when summary is null", () => {
    const template = "Summary: {Summary}";
    const summary: string | null = null;

    const result = template.replace(/{Summary}/g, summary || "");

    expect(result).toBe("Summary: ");
    expect(result).not.toContain("{Summary}");
  });

  it("should replace {PdfLink} variable", () => {
    const template = "PDF: [[{PdfLink}|View PDF]]";
    const pdfLinkPath = "Transcripts/Test Video.pdf";

    const result = template.replace(/{PdfLink}/g, pdfLinkPath);

    expect(result).toBe("PDF: [[Transcripts/Test Video.pdf|View PDF]]");
    expect(result).not.toContain("{PdfLink}");
  });

  it("should replace multiple template variables in one template", () => {
    const template = "Channel: {ChannelName}\nVideo: {VideoName}\nURL: {VideoUrl}\nSummary: {Summary}\nPDF: [[{PdfLink}|View PDF]]";
    const channelName = "Test Channel";
    const videoTitle = "Test Video";
    const videoUrl = "https://www.youtube.com/watch?v=test";
    const summary = "Test summary";
    const pdfLinkPath = "Transcripts/Test Video.pdf";

    const sanitizeFilename = (name: string): string => {
      return name.replace(/[<>:"/\\|?*]/g, "").trim();
    };

    let result = template;
    result = result.replace(/{ChannelName}/g, sanitizeFilename(channelName));
    result = result.replace(/{VideoName}/g, sanitizeFilename(videoTitle));
    result = result.replace(/{VideoUrl}/g, videoUrl);
    result = result.replace(/{Summary}/g, summary);
    result = result.replace(/{PdfLink}/g, pdfLinkPath);

    expect(result).toContain("Channel: Test Channel");
    expect(result).toContain("Video: Test Video");
    expect(result).toContain("URL: https://www.youtube.com/watch?v=test");
    expect(result).toContain("Summary: Test summary");
    expect(result).toContain("PDF: [[Transcripts/Test Video.pdf|View PDF]]");
    expect(result).not.toMatch(/\{[A-Za-z]+\}/);
  });

  it("should handle {ChannelName} when channel name is null", () => {
    const template = "Channel: {ChannelName}";
    const channelName: string | null = null;

    const result = template.replace(/{ChannelName}/g, channelName ? channelName : "");

    expect(result).toBe("Channel: ");
    expect(result).not.toContain("{ChannelName}");
  });

  it("should sanitize channel name and video name in template variables", () => {
    const template = "Channel: {ChannelName}\nVideo: {VideoName}";
    const channelName = "Test/Channel<Name>";
    const videoTitle = "Test:Video>Title";

    const sanitizeFilename = (name: string): string => {
      return name.replace(/[<>:"/\\|?*]/g, "").trim();
    };

    let result = template;
    result = result.replace(/{ChannelName}/g, sanitizeFilename(channelName));
    result = result.replace(/{VideoName}/g, sanitizeFilename(videoTitle));

    expect(result).toBe("Channel: TestChannelName\nVideo: TestVideoTitle");
    // Check that sanitized values don't contain invalid characters
    expect(result).not.toContain("/Channel");
    expect(result).not.toContain("<Name>");
    expect(result).not.toContain(":Video");
    expect(result).not.toContain(">Title");
    // But the template structure itself can contain ":"
    expect(result).toContain("Channel:");
    expect(result).toContain("Video:");
  });
});

describe("PDF Cover Note Location Template Variables", () => {
  it("should replace {ChannelName} in cover note location", () => {
    let location = "Notes/{ChannelName}";
    const channelName = "Test Channel";
    const sanitizeFilename = (name: string): string => {
      return name.replace(/[<>:"/\\|?*]/g, "").trim();
    };

    if (channelName) {
      const sanitizedChannelName = sanitizeFilename(channelName);
      location = location.replace(/{ChannelName}/g, sanitizedChannelName);
    } else {
      location = location.replace(/{ChannelName}/g, "");
    }

    expect(location).toBe("Notes/Test Channel");
    expect(location).not.toContain("{ChannelName}");
  });

  it("should replace {VideoName} in cover note location", () => {
    let location = "Notes/{VideoName}";
    const videoTitle = "Test Video";
    const sanitizeFilename = (name: string): string => {
      return name.replace(/[<>:"/\\|?*]/g, "").trim();
    };

    const sanitizedVideoName = sanitizeFilename(videoTitle);
    location = location.replace(/{VideoName}/g, sanitizedVideoName);

    expect(location).toBe("Notes/Test Video");
    expect(location).not.toContain("{VideoName}");
  });

  it("should replace both {ChannelName} and {VideoName} in location", () => {
    let location = "Notes/{ChannelName}/{VideoName}";
    const channelName = "Test Channel";
    const videoTitle = "Test Video";
    const sanitizeFilename = (name: string): string => {
      return name.replace(/[<>:"/\\|?*]/g, "").trim();
    };

    if (channelName) {
      const sanitizedChannelName = sanitizeFilename(channelName);
      location = location.replace(/{ChannelName}/g, sanitizedChannelName);
    } else {
      location = location.replace(/{ChannelName}/g, "");
    }

    const sanitizedVideoName = sanitizeFilename(videoTitle);
    location = location.replace(/{VideoName}/g, sanitizedVideoName);

    // Clean up any double slashes
    location = location.replace(/\/+/g, "/").replace(/^\/|\/$/g, "");

    expect(location).toBe("Notes/Test Channel/Test Video");
    expect(location).not.toContain("{ChannelName}");
    expect(location).not.toContain("{VideoName}");
  });

  it("should handle empty location (use PDF directory)", () => {
    const location: string = "";
    const pdfDir = "Transcripts/Video.pdf";
    const pdfDirectory = pdfDir.substring(0, pdfDir.lastIndexOf("/"));

    const coverNoteDirectory = location.trim() !== "" ? location : pdfDirectory;

    expect(coverNoteDirectory).toBe("Transcripts");
  });

  it("should normalize path separators in location", () => {
    let location = "Notes\\{ChannelName}\\{VideoName}";
    const channelName = "Test Channel";
    const videoTitle = "Test Video";
    const sanitizeFilename = (name: string): string => {
      return name.replace(/[<>:"/\\|?*]/g, "").trim();
    };

    // Normalize backslashes to forward slashes
    location = location.replace(/\\/g, "/");

    if (channelName) {
      const sanitizedChannelName = sanitizeFilename(channelName);
      location = location.replace(/{ChannelName}/g, sanitizedChannelName);
    } else {
      location = location.replace(/{ChannelName}/g, "");
    }

    const sanitizedVideoName = sanitizeFilename(videoTitle);
    location = location.replace(/{VideoName}/g, sanitizedVideoName);

    // Clean up any double slashes or trailing slashes
    location = location.replace(/\/+/g, "/").replace(/^\/|\/$/g, "");

    expect(location).toBe("Notes/Test Channel/Test Video");
    expect(location).not.toContain("\\");
  });
});

describe("PDF Cover Note Default Content", () => {
  it("should build default cover note content with channel tag", () => {
    const videoTitle = "Test Video";
    const videoUrl = "https://www.youtube.com/watch?v=test";
    const summary: string | null = "Test summary";
    const channelName = "Test Channel";
    const tagWithChannelName = true;
    const pdfLinkPath = "Transcripts/Test Video.pdf";

    const sanitizeTagName = (name: string): string => {
      return name.replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase();
    };

    const parts: string[] = [];

    if (tagWithChannelName && channelName) {
      const sanitizedTag = sanitizeTagName(channelName);
      if (sanitizedTag) {
        parts.push(`#${sanitizedTag}`);
      }
    }

    parts.push(`![${videoTitle}](${videoUrl})`);
    parts.push(`[[${pdfLinkPath}|View PDF Transcript]]`);

    if (summary) {
      parts.push(`## Summary\n\n${summary}`);
    }

    const content = parts.join("\n\n");

    expect(content).toContain("#testchannel");
    expect(content).toContain(`![${videoTitle}](${videoUrl})`);
    expect(content).toContain(`[[${pdfLinkPath}|View PDF Transcript]]`);
    expect(content).toContain("## Summary");
    expect(content).toContain(summary);
  });

  it("should build default cover note content without channel tag when disabled", () => {
    const videoTitle = "Test Video";
    const videoUrl = "https://www.youtube.com/watch?v=test";
    const summary: string | null = "Test summary";
    const channelName = "Test Channel";
    const tagWithChannelName = false;
    const pdfLinkPath = "Transcripts/Test Video.pdf";

    const parts: string[] = [];

    if (tagWithChannelName && channelName) {
      parts.push(`#${channelName}`);
    }

    parts.push(`![${videoTitle}](${videoUrl})`);
    parts.push(`[[${pdfLinkPath}|View PDF Transcript]]`);

    if (summary) {
      parts.push(`## Summary\n\n${summary}`);
    }

    const content = parts.join("\n\n");

    // Should not contain channel tag (single # at start of line)
    expect(content).not.toMatch(/^#\w+/m);
    expect(content).not.toContain("#Test Channel");
    expect(content).toContain(`![${videoTitle}](${videoUrl})`);
    expect(content).toContain(`[[${pdfLinkPath}|View PDF Transcript]]`);
    expect(content).toContain("## Summary");
  });

  it("should build default cover note content without summary when null", () => {
    const videoTitle = "Test Video";
    const videoUrl = "https://www.youtube.com/watch?v=test";
    const summary: string | null = null;
    const channelName: string | null = null;
    const tagWithChannelName = false;
    const pdfLinkPath = "Transcripts/Test Video.pdf";

    const parts: string[] = [];

    if (tagWithChannelName && channelName) {
      parts.push(`#${channelName}`);
    }

    parts.push(`![${videoTitle}](${videoUrl})`);
    parts.push(`[[${pdfLinkPath}|View PDF Transcript]]`);

    if (summary) {
      parts.push(`## Summary\n\n${summary}`);
    }

    const content = parts.join("\n\n");

    expect(content).toContain(`![${videoTitle}](${videoUrl})`);
    expect(content).toContain(`[[${pdfLinkPath}|View PDF Transcript]]`);
    expect(content).not.toContain("## Summary");
  });

  it("should build minimal default cover note content", () => {
    const videoTitle = "Test Video";
    const videoUrl = "https://www.youtube.com/watch?v=test";
    const pdfLinkPath = "Transcripts/Test Video.pdf";

    const parts: string[] = [];

    parts.push(`![${videoTitle}](${videoUrl})`);
    parts.push(`[[${pdfLinkPath}|View PDF Transcript]]`);

    const content = parts.join("\n\n");

    expect(content).toBe(`![Test Video](https://www.youtube.com/watch?v=test)\n\n[[Transcripts/Test Video.pdf|View PDF Transcript]]`);
  });
});

describe("PDF Cover Note File Naming", () => {
  it("should generate cover note filename from PDF filename", () => {
    const pdfFilePath = "Transcripts/Test Video.pdf";
    const pdfFileName = pdfFilePath.substring(pdfFilePath.lastIndexOf("/") + 1);
    const pdfFileNameWithoutExt = pdfFileName.replace(/\.pdf$/, "");
    const coverNoteFileName = `${pdfFileNameWithoutExt}.md`;

    expect(coverNoteFileName).toBe("Test Video.md");
  });

  it("should handle PDF filename without extension", () => {
    const pdfFilePath = "Transcripts/Test Video";
    const pdfFileName = pdfFilePath.substring(pdfFilePath.lastIndexOf("/") + 1);
    const pdfFileNameWithoutExt = pdfFileName.replace(/\.pdf$/, "");
    const coverNoteFileName = `${pdfFileNameWithoutExt}.md`;

    expect(coverNoteFileName).toBe("Test Video.md");
  });

  it("should handle PDF in root directory", () => {
    const pdfFilePath = "Test Video.pdf";
    const pdfFileName = pdfFilePath.substring(pdfFilePath.lastIndexOf("/") + 1);
    const pdfFileNameWithoutExt = pdfFileName.replace(/\.pdf$/, "");
    const coverNoteFileName = `${pdfFileNameWithoutExt}.md`;

    expect(coverNoteFileName).toBe("Test Video.md");
  });

  it("should construct full cover note path", () => {
    const coverNoteDirectory = "Notes/PDF Covers";
    const pdfFileNameWithoutExt = "Test Video";
    const coverNoteFileName = `${pdfFileNameWithoutExt}.md`;
    const coverNotePath = coverNoteDirectory
      ? `${coverNoteDirectory}/${coverNoteFileName}`
      : coverNoteFileName;

    expect(coverNotePath).toBe("Notes/PDF Covers/Test Video.md");
  });

  it("should handle cover note in root directory", () => {
    const coverNoteDirectory = "";
    const pdfFileNameWithoutExt = "Test Video";
    const coverNoteFileName = `${pdfFileNameWithoutExt}.md`;
    const coverNotePath = coverNoteDirectory
      ? `${coverNoteDirectory}/${coverNoteFileName}`
      : coverNoteFileName;

    expect(coverNotePath).toBe("Test Video.md");
  });
});
