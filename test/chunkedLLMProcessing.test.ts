import { describe, it, expect, vi } from "vitest";


import {
  splitTranscriptIntoChunks,
  buildChunkPrompt,
  cleanChunkOutput,
  buildPartContext,
  joinProcessedParts,
  processTranscriptInChunks,
  createChunkedProcessingState,
  type LLMCompletion,
} from "../src/llm/chunking";
import { getClaudeMaxOutputTokens } from "../src/llm/claude";

const words = (count: number, prefix = "word") =>
  Array.from({ length: count }, (_, i) => `${prefix}${i}`).join(" ");

/** Echoes the transcript part of the prompt back, simulating a faithful LLM. */
const echoTranscript = (prompt: string): string =>
  prompt.substring(prompt.indexOf(":\n", prompt.lastIndexOf("\nTranscript")) + 2);

describe("Chunked LLM processing", () => {
  describe("splitTranscriptIntoChunks", () => {
    it("should return a single chunk for short transcripts", () => {
      expect(splitTranscriptIntoChunks("short text", 100)).toEqual(["short text"]);
    });

    it("should return no chunks for an empty transcript", () => {
      expect(splitTranscriptIntoChunks("   ", 100)).toEqual([]);
    });

    it("should keep every chunk within the size limit and lose no words", () => {
      const transcript = words(5000);
      const chunks = splitTranscriptIntoChunks(transcript, 1000);

      expect(chunks.length).toBeGreaterThan(1);
      for (const chunk of chunks) {
        expect(chunk.length).toBeLessThanOrEqual(1000);
      }
      expect(chunks.join(" ")).toBe(transcript);
    });

    it("should split single-line transcripts without punctuation at whitespace", () => {
      const chunks = splitTranscriptIntoChunks(words(500), 300);
      for (const chunk of chunks) {
        expect(chunk).toMatch(/^word\d+( word\d+)*$/);
      }
    });

    it("should prefer line breaks over other break points", () => {
      const transcript = `${"a".repeat(60)}. ${"b".repeat(20)}\n${"c".repeat(50)}`;
      const chunks = splitTranscriptIntoChunks(transcript, 100);
      expect(chunks[0]).toBe(`${"a".repeat(60)}. ${"b".repeat(20)}`);
    });

    it("should prefer sentence ends over plain whitespace", () => {
      const transcript = `${words(10, "a")}. ${words(10, "b")} ${words(10, "c")}`;
      const cutAfterSentence = words(10, "a").length + 1;
      const chunks = splitTranscriptIntoChunks(transcript, cutAfterSentence + 30);
      expect(chunks[0]).toBe(`${words(10, "a")}.`);
    });

    it("should hard-cut text without any whitespace", () => {
      const chunks = splitTranscriptIntoChunks("x".repeat(250), 100);
      expect(chunks).toEqual(["x".repeat(100), "x".repeat(100), "x".repeat(50)]);
    });
  });

  describe("buildChunkPrompt", () => {
    it("should include part numbering and completeness instructions", () => {
      const prompt = buildChunkPrompt("Base", "chunk text", 2, 5, false, false);
      expect(prompt).toContain("part 2 of 5");
      expect(prompt).toContain("Do NOT summarize, shorten, or skip any content");
      expect(prompt).toContain("continues directly from the previous part");
      expect(prompt.endsWith("chunk text")).toBe(true);
    });

    it("should not mention a previous part for the first part", () => {
      const prompt = buildChunkPrompt("Base", "chunk", 1, 3, false, false);
      expect(prompt).not.toContain("previous part");
    });

    it("should include timestamp and language requirements when enabled", () => {
      const prompt = buildChunkPrompt("Base", "chunk", 1, 3, true, true, "no");
      expect(prompt).toContain("timestamp links");
      expect(prompt).toContain("Norwegian");
    });
  });

  describe("buildChunkPrompt with context", () => {
    it("should include earlier headings and the end of the previous part", () => {
      const prompt = buildChunkPrompt("Base", "chunk", 2, 3, false, false, undefined, {
        headings: ["# Title", "## Intro"],
        previousTail: "and that is how it began.",
      });
      expect(prompt).toContain("Do NOT add a document title");
      expect(prompt).toContain("Headings used so far, in order:\n# Title\n## Intro");
      expect(prompt).toContain("and that is how it began.");
      expect(prompt.endsWith("chunk")).toBe(true);
    });

    it("should omit the structure section when there is no context", () => {
      const prompt = buildChunkPrompt("Base", "chunk", 1, 3, false, false, undefined, {
        headings: [],
        previousTail: "",
      });
      expect(prompt).not.toContain("DOCUMENT STRUCTURE");
    });
  });

  describe("buildPartContext", () => {
    it("should collect headings in order from previous outputs", () => {
      const context = buildPartContext([
        "# Title\n\nText\n\n## One\n\nMore",
        "### One A\n\nEven more",
      ]);
      expect(context.headings).toEqual(["# Title", "## One", "### One A"]);
      expect(context.previousTail.endsWith("Even more")).toBe(true);
    });

    it("should shorten the excerpt to the end of the previous output at a word boundary", () => {
      const context = buildPartContext([words(500)]);
      expect(context.previousTail.length).toBeLessThanOrEqual(600);
      expect(context.previousTail).toMatch(/^word\d+ /);
      expect(context.previousTail.endsWith("word499")).toBe(true);
    });

    it("should extend a base context with new output", () => {
      const context = buildPartContext(["## Two\n\nText"], {
        headings: ["## One"],
        previousTail: "old",
      });
      expect(context.headings).toEqual(["## One", "## Two"]);
      expect(context.previousTail).toBe("## Two\n\nText");
    });

    it("should return an empty context when there is no previous output", () => {
      expect(buildPartContext([])).toEqual({ headings: [], previousTail: "" });
    });
  });

  describe("joinProcessedParts", () => {
    it("should demote a document title repeated by a later part", () => {
      const joined = joinProcessedParts([
        "# Title\n\nIntro",
        "# Title Again\n\n## Section\n\nText",
      ]);
      expect(joined).toBe("# Title\n\nIntro\n\n## Title Again\n\n## Section\n\nText");
    });

    it("should drop a heading that re-opens the previous part's last section", () => {
      const joined = joinProcessedParts([
        "## The Lie\n\nFirst half",
        "## The lie:\n\nSecond half\n\n## The Want\n\nNext",
      ]);
      expect(joined).toBe("## The Lie\n\nFirst half\n\nSecond half\n\n## The Want\n\nNext");
    });

    it("should keep a different opening heading", () => {
      const joined = joinProcessedParts(["## One\n\nA", "## Two\n\nB"]);
      expect(joined).toBe("## One\n\nA\n\n## Two\n\nB");
    });

    it("should skip empty parts", () => {
      expect(joinProcessedParts(["A", "  ", "B"])).toBe("A\n\nB");
    });
  });

  describe("cleanChunkOutput", () => {
    it("should strip a leading Transcript heading", () => {
      expect(cleanChunkOutput("## Transcript\n\nHello there")).toBe("Hello there");
    });

    it("should strip a Transcript heading of any level", () => {
      expect(cleanChunkOutput("# Transcript\n\nHello there")).toBe("Hello there");
    });

    it("should leave other content untouched", () => {
      expect(cleanChunkOutput("### Intro\n\nHello")).toBe("### Intro\n\nHello");
    });
  });

  describe("processTranscriptInChunks", () => {
    const baseOptions = {
      basePrompt: "Clean this up",
      includeTimestampsInLLM: false,
      forceLLMLanguage: false,
      providerName: "Test",
    };

    it("should send short transcripts in a single request", async () => {
      const complete = vi.fn(
        async (): Promise<LLMCompletion> => ({
          text: "## Transcript\n\nCleaned",
          truncated: false,
        }),
      );

      const result = await processTranscriptInChunks({
        ...baseOptions,
        transcript: "short transcript",
        generateSummary: false,
        complete,
      });

      expect(complete).toHaveBeenCalledTimes(1);
      expect(result).toBe("## Transcript\n\nCleaned");
    });

    it("should process long transcripts in chunks and keep all content", async () => {
      const transcript = words(3000);
      const complete = vi.fn(
        async (prompt: string): Promise<LLMCompletion> => ({
          text: echoTranscript(prompt),
          truncated: false,
        }),
      );

      const result = await processTranscriptInChunks({
        ...baseOptions,
        transcript,
        generateSummary: false,
        complete,
        chunkSize: 2000,
      });

      expect(complete.mock.calls.length).toBeGreaterThan(5);
      expect(result.startsWith("## Transcript\n\n")).toBe(true);
      const outputWords = result.replace("## Transcript", "").split(/\s+/).filter(Boolean);
      expect(outputWords).toEqual(transcript.split(" "));
    });

    it("should request a separate summary for chunked transcripts", async () => {
      const complete = vi.fn(async (prompt: string): Promise<LLMCompletion> => {
        if (prompt.startsWith("Write a concise summary")) {
          return { text: "# Summary\n\nA short summary.", truncated: false };
        }
        return { text: echoTranscript(prompt), truncated: false };
      });

      const result = await processTranscriptInChunks({
        ...baseOptions,
        transcript: words(1000),
        generateSummary: true,
        complete,
        chunkSize: 2000,
      });

      expect(result.startsWith("## Summary\n\nA short summary.\n\n## Transcript\n\n")).toBe(true);
      expect(result).toContain("word0 ");
      expect(result).toContain("word999");
    });

    it("should re-split a single request whose response was truncated", async () => {
      const transcript = words(600);
      const complete = vi.fn(async (prompt: string): Promise<LLMCompletion> => {
        if (!prompt.includes("has been split into")) {
          return { text: "## Transcript\n\nword0 word1", truncated: true };
        }
        return { text: echoTranscript(prompt), truncated: false };
      });

      const result = await processTranscriptInChunks({
        ...baseOptions,
        transcript,
        generateSummary: false,
        complete,
      });

      expect(complete.mock.calls.length).toBe(3);
      expect(result).toContain("word599");
    });

    it("should split a chunk further when its response is truncated", async () => {
      const transcript = words(1000);
      const complete = vi.fn(async (prompt: string): Promise<LLMCompletion> => {
        const text = echoTranscript(prompt);
        // Simulate an output limit that only fits half of a full chunk
        if (text.length > 3000) {
          return { text: text.substring(0, 1000), truncated: true };
        }
        return { text, truncated: false };
      });

      const result = await processTranscriptInChunks({
        ...baseOptions,
        transcript,
        generateSummary: false,
        complete,
        chunkSize: 5000,
      });

      const outputWords = result.replace("## Transcript", "").split(/\s+/).filter(Boolean);
      expect(outputWords).toEqual(transcript.split(" "));
    });

    it("should resume from completed chunks after a failure", async () => {
      const transcript = words(1500);
      const state = createChunkedProcessingState();
      let calls = 0;
      const failingOnThirdCall = vi.fn(async (prompt: string): Promise<LLMCompletion> => {
        calls++;
        if (calls === 3) throw new Error("request timed out");
        return { text: echoTranscript(prompt), truncated: false };
      });

      const options = {
        ...baseOptions,
        transcript,
        generateSummary: false,
        complete: failingOnThirdCall,
        chunkSize: 2000,
        state,
      };

      await expect(processTranscriptInChunks(options)).rejects.toThrow("timed out");
      expect(state.chunkResults.size).toBe(2);

      const callsBeforeRetry = failingOnThirdCall.mock.calls.length;
      const result = await processTranscriptInChunks(options);
      const totalChunks = splitTranscriptIntoChunks(transcript, 2000).length;

      expect(failingOnThirdCall.mock.calls.length - callsBeforeRetry).toBe(totalChunks - 2);
      expect(result).toContain("word1499");
    });

    it("should give each part the headings produced by earlier parts", async () => {
      const prompts: string[] = [];
      let part = 0;
      await processTranscriptInChunks({
        ...baseOptions,
        transcript: words(600),
        generateSummary: false,
        complete: async (prompt) => {
          prompts.push(prompt);
          part++;
          return { text: `## Section ${part}\n\n${echoTranscript(prompt)}`, truncated: false };
        },
        chunkSize: 2000,
      });

      expect(prompts.length).toBeGreaterThan(2);
      expect(prompts[0]).not.toContain("Headings used so far");
      expect(prompts[2]).toContain("Headings used so far, in order:\n## Section 1\n## Section 2");
    });

    it("should report progress per part", async () => {
      const statusCallback = vi.fn();
      await processTranscriptInChunks({
        ...baseOptions,
        transcript: words(1000),
        generateSummary: false,
        complete: async (prompt) => ({ text: echoTranscript(prompt), truncated: false }),
        statusCallback,
        chunkSize: 2000,
      });

      expect(statusCallback).toHaveBeenCalledWith(
        expect.stringMatching(/Processing transcript with Test \(part 1 of \d+\)/),
      );
    });
  });

  describe("getClaudeMaxOutputTokens", () => {
    it("should use 4096 for legacy Claude 3 models", () => {
      expect(getClaudeMaxOutputTokens("claude-3-haiku-20240307")).toBe(4096);
    });

    it("should use 8192 for Claude 3.5 models", () => {
      expect(getClaudeMaxOutputTokens("claude-3-5-sonnet-20241022")).toBe(8192);
    });

    it("should allow more output for current models", () => {
      expect(getClaudeMaxOutputTokens("claude-sonnet-5")).toBe(16000);
    });
  });
});
