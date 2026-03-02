import { describe, it, expect } from "vitest";
import { generateSrt } from "../src/srtFormatter";
import type { TranscriptSegment } from "../src/types";

describe("generateSrt", () => {
  describe("time formatting", () => {
    it("formats sub-minute times as 00:00:SS,mmm", () => {
      const segments: TranscriptSegment[] = [
        { startTime: 5.5, text: "Hello", duration: 2 },
      ];
      const result = generateSrt(segments);
      expect(result).toContain("00:00:05,500 --> 00:00:07,500");
    });

    it("formats times with minutes correctly", () => {
      const segments: TranscriptSegment[] = [
        { startTime: 90.25, text: "One and a half minutes", duration: 3 },
      ];
      const result = generateSrt(segments);
      expect(result).toContain("00:01:30,250 --> 00:01:33,250");
    });

    it("formats times with hours correctly", () => {
      const segments: TranscriptSegment[] = [
        { startTime: 3661.1, text: "Over an hour", duration: 5 },
      ];
      const result = generateSrt(segments);
      expect(result).toContain("01:01:01,100 --> 01:01:06,100");
    });

    it("pads single-digit values with leading zeros", () => {
      const segments: TranscriptSegment[] = [
        { startTime: 0, text: "Start", duration: 1 },
      ];
      const result = generateSrt(segments);
      expect(result).toContain("00:00:00,000 --> 00:00:01,000");
    });

    it("rounds milliseconds correctly", () => {
      const segments: TranscriptSegment[] = [
        { startTime: 1.0005, text: "Rounding", duration: 1 },
      ];
      const result = generateSrt(segments);
      // 0.0005 * 1000 = 0.5, rounds to 1
      expect(result).toMatch(/00:00:01,00[01]/);
    });
  });

  describe("end time calculation", () => {
    it("uses duration field when present and positive", () => {
      const segments: TranscriptSegment[] = [
        { startTime: 10, text: "With duration", duration: 3.5 },
      ];
      const result = generateSrt(segments);
      expect(result).toContain("00:00:10,000 --> 00:00:13,500");
    });

    it("ignores duration of 0 and falls back to next segment", () => {
      const segments: TranscriptSegment[] = [
        { startTime: 10, text: "Zero duration", duration: 0 },
        { startTime: 14, text: "Next", duration: 2 },
      ];
      const result = generateSrt(segments);
      expect(result).toContain("00:00:10,000 --> 00:00:14,000");
    });

    it("falls back to next segment start time when no duration", () => {
      const segments: TranscriptSegment[] = [
        { startTime: 5, text: "First" },
        { startTime: 8, text: "Second" },
      ];
      const result = generateSrt(segments);
      expect(result).toContain("00:00:05,000 --> 00:00:08,000");
    });

    it("adds 5 seconds as fallback for the last segment with no duration", () => {
      const segments: TranscriptSegment[] = [
        { startTime: 100, text: "Last segment" },
      ];
      const result = generateSrt(segments);
      expect(result).toContain("00:01:40,000 --> 00:01:45,000");
    });

    it("adds 5 seconds for the last segment even with next segment in original array filtered out", () => {
      // Last valid segment after filtering
      const segments: TranscriptSegment[] = [
        { startTime: 10, text: "Valid" },
        { startTime: -1, text: "Filtered out" },
      ];
      const result = generateSrt(segments);
      expect(result).toContain("00:00:10,000 --> 00:00:15,000");
    });
  });

  describe("cue structure", () => {
    it("produces correct SRT cue format: index, timecode, text", () => {
      const segments: TranscriptSegment[] = [
        { startTime: 1, text: "Hello world", duration: 2 },
      ];
      const result = generateSrt(segments);
      expect(result).toBe("1\n00:00:01,000 --> 00:00:03,000\nHello world");
    });

    it("separates multiple cues with a blank line", () => {
      const segments: TranscriptSegment[] = [
        { startTime: 0, text: "First", duration: 2 },
        { startTime: 2, text: "Second", duration: 2 },
      ];
      const result = generateSrt(segments);
      expect(result).toBe(
        "1\n00:00:00,000 --> 00:00:02,000\nFirst\n\n" +
        "2\n00:00:02,000 --> 00:00:04,000\nSecond"
      );
    });

    it("numbers cues sequentially starting from 1", () => {
      const segments: TranscriptSegment[] = [
        { startTime: 0, text: "A", duration: 1 },
        { startTime: 1, text: "B", duration: 1 },
        { startTime: 2, text: "C", duration: 1 },
      ];
      const result = generateSrt(segments);
      const lines = result.split("\n\n");
      expect(lines[0]).toMatch(/^1\n/);
      expect(lines[1]).toMatch(/^2\n/);
      expect(lines[2]).toMatch(/^3\n/);
    });

    it("renumbers cues after filtering invalid segments", () => {
      const segments: TranscriptSegment[] = [
        { startTime: -1, text: "Invalid" },
        { startTime: 5, text: "Valid A", duration: 2 },
        { startTime: -5, text: "Also invalid" },
        { startTime: 10, text: "Valid B", duration: 2 },
      ];
      const result = generateSrt(segments);
      const lines = result.split("\n\n");
      expect(lines).toHaveLength(2);
      expect(lines[0]).toMatch(/^1\n/);
      expect(lines[1]).toMatch(/^2\n/);
    });
  });

  describe("segment filtering", () => {
    it("filters out segments with startTime < 0", () => {
      const segments: TranscriptSegment[] = [
        { startTime: -1, text: "Invalid" },
        { startTime: 5, text: "Valid", duration: 2 },
      ];
      const result = generateSrt(segments);
      expect(result).not.toContain("Invalid");
      expect(result).toContain("Valid");
    });

    it("includes segments with startTime === 0", () => {
      const segments: TranscriptSegment[] = [
        { startTime: 0, text: "At zero", duration: 1 },
      ];
      const result = generateSrt(segments);
      expect(result).toContain("At zero");
    });

    it("returns empty string for all-invalid segments", () => {
      const segments: TranscriptSegment[] = [
        { startTime: -1, text: "A" },
        { startTime: -2, text: "B" },
      ];
      expect(generateSrt(segments)).toBe("");
    });

    it("returns empty string for empty input", () => {
      expect(generateSrt([])).toBe("");
    });
  });

  describe("edge cases", () => {
    it("handles a single valid segment", () => {
      const segments: TranscriptSegment[] = [
        { startTime: 42, text: "Only segment", duration: 3 },
      ];
      const result = generateSrt(segments);
      expect(result).toBe("1\n00:00:42,000 --> 00:00:45,000\nOnly segment");
    });

    it("preserves original text content including special characters", () => {
      const segments: TranscriptSegment[] = [
        { startTime: 1, text: "Hello & <world> \"test\"", duration: 2 },
      ];
      const result = generateSrt(segments);
      expect(result).toContain("Hello & <world> \"test\"");
    });
  });
});
