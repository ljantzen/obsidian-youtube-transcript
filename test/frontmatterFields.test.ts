import { describe, it, expect } from "vitest";
import {
  buildFrontmatterLines,
  mergeFrontmatterFields,
  DEFAULT_FRONTMATTER_FIELDS,
  FRONTMATTER_FIELD_ORDER,
} from "../src/utils/frontmatter";

const sampleValues = {
  title: "Test Video",
  url: "https://youtube.com/watch?v=dQw4w9WgXcQ",
  videoId: "dQw4w9WgXcQ",
  channel: "Test Channel",
  channelId: "UC123",
  duration: "240",
  views: "1000000",
  published: "2023-01-01",
  description: "Test description",
  isLive: false,
  isPrivate: false,
  isUnlisted: false,
};

describe("buildFrontmatterLines", () => {
  it("emits all enabled fields with their default keys and current formatting", () => {
    const lines = buildFrontmatterLines(sampleValues, DEFAULT_FRONTMATTER_FIELDS);

    expect(lines[0]).toBe("---");
    expect(lines[lines.length - 1]).toBe("---");
    expect(lines).toContain('title: "Test Video"');
    expect(lines).toContain('url: "https://youtube.com/watch?v=dQw4w9WgXcQ"');
    expect(lines).toContain('videoId: "dQw4w9WgXcQ"');
    expect(lines).toContain('channel: "Test Channel"');
    expect(lines).toContain("isLive: false");
    expect(lines).toContain("isPrivate: false");
    expect(lines).toContain("isUnlisted: false");
  });

  it("omits disabled fields", () => {
    const fields = mergeFrontmatterFields({
      description: { enabled: false, key: "description" },
      channel: { enabled: false, key: "channel" },
    });

    const lines = buildFrontmatterLines(sampleValues, fields);

    expect(lines.some((l) => l.startsWith("description:"))).toBe(false);
    expect(lines.some((l) => l.startsWith("channel:"))).toBe(false);
    expect(lines.some((l) => l.startsWith("title:"))).toBe(true);
  });

  it("uses a custom key name when configured", () => {
    const fields = mergeFrontmatterFields({
      channel: { enabled: true, key: "author" },
    });

    const lines = buildFrontmatterLines(sampleValues, fields);

    expect(lines).toContain('author: "Test Channel"');
    expect(lines.some((l) => l.startsWith("channel:"))).toBe(false);
  });

  it("falls back to the default key when a custom key is blank", () => {
    const fields = mergeFrontmatterFields({
      channel: { enabled: true, key: "   " },
    });

    const lines = buildFrontmatterLines(sampleValues, fields);

    expect(lines).toContain('channel: "Test Channel"');
  });

  it("skips null, undefined, and empty-string values even when enabled", () => {
    const lines = buildFrontmatterLines(
      { title: "Only Title", channel: "", videoId: undefined },
      DEFAULT_FRONTMATTER_FIELDS,
    );

    expect(lines).toContain('title: "Only Title"');
    expect(lines.some((l) => l.startsWith("channel:"))).toBe(false);
    expect(lines.some((l) => l.startsWith("videoId:"))).toBe(false);
  });

  it("keeps boolean false values even though they are falsy", () => {
    const lines = buildFrontmatterLines(
      { isPrivate: false },
      DEFAULT_FRONTMATTER_FIELDS,
    );

    expect(lines).toContain("isPrivate: false");
  });

  it("returns an empty array when no field has a value", () => {
    const lines = buildFrontmatterLines({}, DEFAULT_FRONTMATTER_FIELDS);
    expect(lines).toEqual([]);
  });

  it("returns an empty array when every field is disabled", () => {
    const allDisabled = mergeFrontmatterFields(
      Object.fromEntries(
        FRONTMATTER_FIELD_ORDER.map((id) => [id, { enabled: false, key: id }]),
      ),
    );

    const lines = buildFrontmatterLines(sampleValues, allDisabled);
    expect(lines).toEqual([]);
  });

  it("deduplicates when two enabled fields share a renamed key, last one wins", () => {
    const fields = mergeFrontmatterFields({
      channel: { enabled: true, key: "source" },
      url: { enabled: true, key: "source" },
    });

    const lines = buildFrontmatterLines(sampleValues, fields);
    const sourceLines = lines.filter((l) => l.startsWith("source:"));

    expect(sourceLines).toHaveLength(1);
    // "channel" comes after "url" in FRONTMATTER_FIELD_ORDER, so it wins
    expect(sourceLines[0]).toBe(`source: "${sampleValues.channel}"`);
  });

  it("handles multiline descriptions the same way as before", () => {
    const lines = buildFrontmatterLines(
      { description: "Line one\nLine two" },
      DEFAULT_FRONTMATTER_FIELDS,
    );

    // Multiline values are quoted with the literal newline kept inside, matching prior behavior
    expect(lines.join("\n")).toContain('description: "Line one\nLine two"');
  });
});

describe("mergeFrontmatterFields", () => {
  it("returns a fresh object that does not share references with the defaults", () => {
    const merged = mergeFrontmatterFields(null);
    merged.title.enabled = false;

    expect(DEFAULT_FRONTMATTER_FIELDS.title.enabled).toBe(true);
  });

  it("fills in fields missing from a partial saved object", () => {
    const merged = mergeFrontmatterFields({
      title: { enabled: false, key: "title" },
    });

    expect(merged.title.enabled).toBe(false);
    expect(merged.url.enabled).toBe(true);
    expect(merged.url.key).toBe("url");
  });

  it("covers every field in FRONTMATTER_FIELD_ORDER", () => {
    const merged = mergeFrontmatterFields(undefined);
    for (const id of FRONTMATTER_FIELD_ORDER) {
      expect(merged[id]).toBeDefined();
      expect(typeof merged[id].enabled).toBe("boolean");
      expect(typeof merged[id].key).toBe("string");
    }
  });
});
