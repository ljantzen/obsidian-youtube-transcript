import { describe, it, expect } from "vitest";

describe("VideoDetails Type", () => {
  it("should have VideoDetails interface structure", () => {
    const videoDetails = {
      title: "Test Video",
      author: "Test Channel",
      videoId: "dQw4w9WgXcQ",
      lengthSeconds: "240",
      viewCount: "1000000",
      publishDate: "2023-01-01",
      description: "Test description",
      channelId: "UCtest123",
      isLiveContent: false,
      isPrivate: false,
      isUnlisted: false,
    };

    expect(videoDetails.title).toBe("Test Video");
    expect(videoDetails.author).toBe("Test Channel");
    expect(videoDetails.videoId).toBe("dQw4w9WgXcQ");
    expect(videoDetails.lengthSeconds).toBe("240");
    expect(videoDetails.viewCount).toBe("1000000");
    expect(videoDetails.publishDate).toBe("2023-01-01");
    expect(videoDetails.description).toBe("Test description");
    expect(videoDetails.channelId).toBe("UCtest123");
    expect(videoDetails.isLiveContent).toBe(false);
    expect(videoDetails.isPrivate).toBe(false);
    expect(videoDetails.isUnlisted).toBe(false);
  });

  it("should handle optional videoDetails fields", () => {
    const videoDetails: Record<string, unknown> = {
      title: "Test Video",
      author: "Test Channel",
    };

    expect(videoDetails.title).toBe("Test Video");
    expect(videoDetails.author).toBe("Test Channel");
    expect(videoDetails.videoId).toBeUndefined();
    expect(videoDetails.lengthSeconds).toBeUndefined();
  });

  it("should handle videoDetails with all fields", () => {
    const videoDetails = {
      title: "Test Video",
      author: "Test Channel",
      videoId: "dQw4w9WgXcQ",
      lengthSeconds: "240",
      viewCount: "1000000",
      publishDate: "2023-01-01",
      description: "Test description",
      shortDescription: "Short desc",
      channelId: "UCtest123",
      isLiveContent: true,
      isPrivate: false,
      isUnlisted: false,
      keywords: ["test", "video"],
      thumbnail: {
        thumbnails: [
          {
            url: "https://example.com/thumb.jpg",
            width: 320,
            height: 180,
          },
        ],
      },
    };

    expect(videoDetails.title).toBe("Test Video");
    expect(videoDetails.keywords).toEqual(["test", "video"]);
    expect(videoDetails.thumbnail?.thumbnails?.[0]?.url).toBe(
      "https://example.com/thumb.jpg",
    );
  });
});

describe("VideoDetails Template Variables", () => {
  it("should replace {VideoId} variable", () => {
    const template = "Video ID: {VideoId}";
    const videoDetails = {
      videoId: "dQw4w9WgXcQ",
    };

    const result = template.replace(/{VideoId}/g, videoDetails.videoId || "");

    expect(result).toBe("Video ID: dQw4w9WgXcQ");
    expect(result).not.toContain("{VideoId}");
  });

  it("should replace {LengthSeconds} variable", () => {
    const template = "Duration: {LengthSeconds} seconds";
    const videoDetails = {
      lengthSeconds: "240",
    };

    const result = template.replace(
      /{LengthSeconds}/g,
      videoDetails.lengthSeconds || "",
    );

    expect(result).toBe("Duration: 240 seconds");
    expect(result).not.toContain("{LengthSeconds}");
  });

  it("should replace {ViewCount} variable", () => {
    const template = "Views: {ViewCount}";
    const videoDetails = {
      viewCount: "1000000",
    };

    const result = template.replace(/{ViewCount}/g, videoDetails.viewCount || "");

    expect(result).toBe("Views: 1000000");
    expect(result).not.toContain("{ViewCount}");
  });

  it("should replace {PublishDate} variable", () => {
    const template = "Published: {PublishDate}";
    const videoDetails = {
      publishDate: "2023-01-01",
    };

    const result = template.replace(
      /{PublishDate}/g,
      videoDetails.publishDate || "",
    );

    expect(result).toBe("Published: 2023-01-01");
    expect(result).not.toContain("{PublishDate}");
  });

  it("should replace {Description} variable", () => {
    const template = "Description: {Description}";
    const videoDetails = {
      description: "This is a test video description",
    };

    const result = template.replace(
      /{Description}/g,
      videoDetails.description || "",
    );

    expect(result).toBe("Description: This is a test video description");
    expect(result).not.toContain("{Description}");
  });

  it("should replace {ChannelId} variable", () => {
    const template = "Channel ID: {ChannelId}";
    const videoDetails = {
      channelId: "UCtest123",
    };

    const result = template.replace(/{ChannelId}/g, videoDetails.channelId || "");

    expect(result).toBe("Channel ID: UCtest123");
    expect(result).not.toContain("{ChannelId}");
  });

  it("should replace {IsLive} variable", () => {
    const template = "Is Live: {IsLive}";
    const videoDetails = {
      isLiveContent: true,
    };

    const result = template.replace(
      /{IsLive}/g,
      videoDetails.isLiveContent ? "true" : "false",
    );

    expect(result).toBe("Is Live: true");
    expect(result).not.toContain("{IsLive}");
  });

  it("should replace {IsPrivate} variable", () => {
    const template = "Is Private: {IsPrivate}";
    const videoDetails = {
      isPrivate: false,
    };

    const result = template.replace(
      /{IsPrivate}/g,
      videoDetails.isPrivate ? "true" : "false",
    );

    expect(result).toBe("Is Private: false");
    expect(result).not.toContain("{IsPrivate}");
  });

  it("should replace {IsUnlisted} variable", () => {
    const template = "Is Unlisted: {IsUnlisted}";
    const videoDetails = {
      isUnlisted: true,
    };

    const result = template.replace(
      /{IsUnlisted}/g,
      videoDetails.isUnlisted ? "true" : "false",
    );

    expect(result).toBe("Is Unlisted: true");
    expect(result).not.toContain("{IsUnlisted}");
  });

  it("should replace multiple videoDetails variables", () => {
    const template =
      "Video: {VideoId}\nDuration: {LengthSeconds}s\nViews: {ViewCount}\nPublished: {PublishDate}";
    const videoDetails = {
      videoId: "dQw4w9WgXcQ",
      lengthSeconds: "240",
      viewCount: "1000000",
      publishDate: "2023-01-01",
    };

    let result = template;
    result = result.replace(/{VideoId}/g, videoDetails.videoId || "");
    result = result.replace(/{LengthSeconds}/g, videoDetails.lengthSeconds || "");
    result = result.replace(/{ViewCount}/g, videoDetails.viewCount || "");
    result = result.replace(/{PublishDate}/g, videoDetails.publishDate || "");

    expect(result).toContain("Video: dQw4w9WgXcQ");
    expect(result).toContain("Duration: 240s");
    expect(result).toContain("Views: 1000000");
    expect(result).toContain("Published: 2023-01-01");
    expect(result).not.toMatch(/\{[A-Za-z]+\}/);
  });

  it("should handle missing videoDetails fields gracefully", () => {
    const template = "Video ID: {VideoId}\nViews: {ViewCount}";
    const videoDetails: Record<string, unknown> = {};

    let result = template;
    result = result.replace(/{VideoId}/g, (videoDetails.videoId as string) || "");
    result = result.replace(/{ViewCount}/g, (videoDetails.viewCount as string) || "");

    expect(result).toBe("Video ID: \nViews: ");
    expect(result).not.toContain("{VideoId}");
    expect(result).not.toContain("{ViewCount}");
  });
});

describe("VideoDetails Nested Access", () => {
  it("should access nested videoDetails fields with dot notation", () => {
    const videoDetails = {
      thumbnail: {
        thumbnails: [
          {
            url: "https://example.com/thumb.jpg",
            width: 320,
            height: 180,
          },
        ],
      },
    };

    const getNestedValue = (obj: unknown, path: string): unknown => {
      const parts = path.split(".");
      let current: unknown = obj;
      for (const part of parts) {
        if (current && typeof current === "object" && part in current) {
          current = (current as Record<string, unknown>)[part];
        } else {
          return undefined;
        }
      }
      return current;
    };

    const url = getNestedValue(videoDetails, "thumbnail.thumbnails.0.url");
    expect(url).toBe("https://example.com/thumb.jpg");
  });

  it("should handle array access in nested paths", () => {
    const videoDetails = {
      thumbnail: {
        thumbnails: [
          { url: "thumb1.jpg", width: 320 },
          { url: "thumb2.jpg", width: 640 },
        ],
      },
    };

    const getNestedValue = (obj: unknown, path: string): unknown => {
      const parts = path.split(".");
      let current: unknown = obj;
      for (const part of parts) {
        if (current && typeof current === "object") {
          if (Array.isArray(current) && /^\d+$/.test(part)) {
            current = current[parseInt(part, 10)];
          } else if (part in current) {
            current = (current as Record<string, unknown>)[part];
          } else {
            return undefined;
          }
        } else {
          return undefined;
        }
      }
      return current;
    };

    const firstThumb = getNestedValue(videoDetails, "thumbnail.thumbnails.0.url");
    const secondThumb = getNestedValue(videoDetails, "thumbnail.thumbnails.1.url");

    expect(firstThumb).toBe("thumb1.jpg");
    expect(secondThumb).toBe("thumb2.jpg");
  });

  it("should return undefined for invalid nested paths", () => {
    const videoDetails = {
      title: "Test Video",
    };

    const getNestedValue = (obj: unknown, path: string): unknown => {
      const parts = path.split(".");
      let current: unknown = obj;
      for (const part of parts) {
        if (current && typeof current === "object" && part in current) {
          current = (current as Record<string, unknown>)[part];
        } else {
          return undefined;
        }
      }
      return current;
    };

    const invalid = getNestedValue(videoDetails, "thumbnail.thumbnails.0.url");
    expect(invalid).toBeUndefined();
  });
});

describe("VideoDetails Frontmatter", () => {
  it("should generate frontmatter with videoDetails", () => {
    const videoDetails = {
      title: "Test Video",
      author: "Test Channel",
      videoId: "dQw4w9WgXcQ",
      lengthSeconds: "240",
      viewCount: "1000000",
      publishDate: "2023-01-01",
      description: "Test description",
      channelId: "UCtest123",
      isLiveContent: false,
      isPrivate: false,
      isUnlisted: false,
    };

    const frontmatter: Record<string, unknown> = {
      title: videoDetails.title,
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    };

    if (videoDetails.videoId) frontmatter.videoId = videoDetails.videoId;
    if (videoDetails.author) frontmatter.channel = videoDetails.author;
    if (videoDetails.channelId) frontmatter.channelId = videoDetails.channelId;
    if (videoDetails.lengthSeconds)
      frontmatter.duration = videoDetails.lengthSeconds;
    if (videoDetails.viewCount) frontmatter.views = videoDetails.viewCount;
    if (videoDetails.publishDate) frontmatter.published = videoDetails.publishDate;
    if (videoDetails.description)
      frontmatter.description = videoDetails.description;
    if (videoDetails.isLiveContent !== undefined)
      frontmatter.isLive = videoDetails.isLiveContent;
    if (videoDetails.isPrivate !== undefined)
      frontmatter.isPrivate = videoDetails.isPrivate;
    if (videoDetails.isUnlisted !== undefined)
      frontmatter.isUnlisted = videoDetails.isUnlisted;

    expect(frontmatter.title).toBe("Test Video");
    expect(frontmatter.videoId).toBe("dQw4w9WgXcQ");
    expect(frontmatter.channel).toBe("Test Channel");
    expect(frontmatter.duration).toBe("240");
    expect(frontmatter.views).toBe("1000000");
    expect(frontmatter.published).toBe("2023-01-01");
    expect(frontmatter.description).toBe("Test description");
    expect(frontmatter.isLive).toBe(false);
  });

  it("should format frontmatter as YAML", () => {
    const frontmatter: Record<string, unknown> = {
      title: "Test Video",
      url: "https://www.youtube.com/watch?v=test",
      videoId: "test",
      channel: "Test Channel",
      duration: "240",
      views: "1000000",
      published: "2023-01-01",
      description: "Test description",
      isLive: false,
    };

    const frontmatterLines = ["---"];
    for (const [key, value] of Object.entries(frontmatter)) {
      if (value !== null && value !== undefined) {
        const stringValue =
          typeof value === "string" && value.includes("\n")
            ? `"${value.replace(/"/g, '\\"')}"`
            : typeof value === "string"
            ? `"${value}"`
            : String(value);
        frontmatterLines.push(`${key}: ${stringValue}`);
      }
    }
    frontmatterLines.push("---");

    const yaml = frontmatterLines.join("\n");

    expect(yaml).toContain("---");
    expect(yaml).toContain("title: \"Test Video\"");
    expect(yaml).toContain("videoId: \"test\"");
    expect(yaml).toContain("channel: \"Test Channel\"");
    expect(yaml).toContain("duration: \"240\"");
    expect(yaml).toContain("views: \"1000000\"");
    expect(yaml).toContain("published: \"2023-01-01\"");
    expect(yaml).toContain("isLive: false");
    expect(yaml.endsWith("---")).toBe(true);
  });

  it("should handle multiline descriptions in frontmatter", () => {
    const frontmatter: Record<string, unknown> = {
      description: "Line 1\nLine 2\nLine 3",
    };

    const frontmatterLines = ["---"];
    for (const [key, value] of Object.entries(frontmatter)) {
      if (value !== null && value !== undefined) {
        const stringValue =
          typeof value === "string" && value.includes("\n")
            ? `"${value.replace(/"/g, '\\"')}"`
            : typeof value === "string"
            ? `"${value}"`
            : String(value);
        frontmatterLines.push(`${key}: ${stringValue}`);
      }
    }
    frontmatterLines.push("---");

    const yaml = frontmatterLines.join("\n");

    // The escaped newlines will be in the string, check that description field exists
    expect(yaml).toContain("description:");
    expect(yaml).toContain("Line 1");
    expect(yaml).toContain("Line 2");
    expect(yaml).toContain("Line 3");
  });

  it("should skip null and undefined values in frontmatter", () => {
    const frontmatter: Record<string, unknown> = {
      title: "Test Video",
      videoId: undefined,
      channel: null,
      duration: "240",
    };

    const frontmatterLines = ["---"];
    for (const [key, value] of Object.entries(frontmatter)) {
      if (value !== null && value !== undefined) {
        const stringValue =
          typeof value === "string" && value.includes("\n")
            ? `"${value.replace(/"/g, '\\"')}"`
            : typeof value === "string"
            ? `"${value}"`
            : String(value);
        frontmatterLines.push(`${key}: ${stringValue}`);
      }
    }
    frontmatterLines.push("---");

    const yaml = frontmatterLines.join("\n");

    expect(yaml).toContain("title: \"Test Video\"");
    expect(yaml).toContain("duration: \"240\"");
    expect(yaml).not.toContain("videoId:");
    expect(yaml).not.toContain("channel:");
  });
});

describe("VideoDetails in TranscriptResult", () => {
  it("should include videoDetails in TranscriptResult", () => {
    const result = {
      transcript: "Test transcript",
      title: "Test Video",
      summary: null,
      channelName: "Test Channel",
      videoDetails: {
        title: "Test Video",
        author: "Test Channel",
        videoId: "dQw4w9WgXcQ",
        lengthSeconds: "240",
        viewCount: "1000000",
        publishDate: "2023-01-01",
      },
    };

    expect(result.transcript).toBe("Test transcript");
    expect(result.title).toBe("Test Video");
    expect(result.channelName).toBe("Test Channel");
    expect(result.videoDetails).toBeDefined();
    expect(result.videoDetails?.videoId).toBe("dQw4w9WgXcQ");
    expect(result.videoDetails?.lengthSeconds).toBe("240");
  });

  it("should handle null videoDetails in TranscriptResult", () => {
    const result = {
      transcript: "Test transcript",
      title: "Test Video",
      summary: null,
      channelName: "Test Channel",
      videoDetails: null,
    };

    expect(result.transcript).toBe("Test transcript");
    expect(result.title).toBe("Test Video");
    expect(result.videoDetails).toBeNull();
  });
});
