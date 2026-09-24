import { describe, it, expect } from "vitest";
import {
  DEFAULT_PROMPT,
  LEGACY_DEFAULT_PROMPTS,
  normalizeSavedPrompt,
} from "../src/settings";
import { buildPrompt } from "../src/llm/parser";

describe("Default prompt", () => {
  describe("content", () => {
    it("should ask the LLM to keep the speaker's own words", () => {
      expect(DEFAULT_PROMPT).toContain("Keep the speaker's own words and phrasing");
      expect(DEFAULT_PROMPT).toContain("Do NOT paraphrase, summarize, condense, or reorder anything");
    });

    it("should still remove promotional content", () => {
      expect(DEFAULT_PROMPT).toContain("Remove self-promotion, calls to action, and promotional content");
    });
  });

  describe("normalizeSavedPrompt", () => {
    it("should use the default for an empty saved prompt", () => {
      expect(normalizeSavedPrompt("")).toBe(DEFAULT_PROMPT);
      expect(normalizeSavedPrompt("   ")).toBe(DEFAULT_PROMPT);
      expect(normalizeSavedPrompt(undefined)).toBe(DEFAULT_PROMPT);
      expect(normalizeSavedPrompt(null)).toBe(DEFAULT_PROMPT);
    });

    it("should upgrade an unmodified earlier default", () => {
      expect(normalizeSavedPrompt(LEGACY_DEFAULT_PROMPTS[0])).toBe(DEFAULT_PROMPT);
    });

    it("should upgrade an earlier default that differs only in surrounding whitespace", () => {
      expect(normalizeSavedPrompt(`${LEGACY_DEFAULT_PROMPTS[0]}\n`)).toBe(DEFAULT_PROMPT);
    });

    it("should keep a customized prompt unchanged", () => {
      const custom = `${LEGACY_DEFAULT_PROMPTS[0]}\n6. Make sections using markdown headings`;
      expect(normalizeSavedPrompt(custom)).toBe(custom);
    });

    it("should keep the current default unchanged", () => {
      expect(normalizeSavedPrompt(DEFAULT_PROMPT)).toBe(DEFAULT_PROMPT);
    });
  });

  describe("single-request prompt", () => {
    it("should require the entire transcript to be kept", () => {
      const prompt = buildPrompt("Base", "text", false, false, false);
      expect(prompt).toContain("must cover the ENTIRE transcript");
    });

    it("should require the entire transcript to be kept when a summary is requested", () => {
      const prompt = buildPrompt("Base", "text", true, false, false);
      expect(prompt).toContain("must cover the ENTIRE transcript");
    });
  });
});
