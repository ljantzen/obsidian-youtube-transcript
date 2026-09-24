import type { StatusCallback } from "../types";
import { buildPrompt, getLanguageRequirement } from "./parser";

/**
 * Long transcripts are processed in chunks. A single LLM response is capped by
 * the model's output token limit (and models tend to abridge very long inputs),
 * which silently truncates long videos. Chunks of this size produce output well
 * within the output limits of all supported providers.
 */
export const DEFAULT_CHUNK_SIZE = 12000;

/** Chunks smaller than this are not split further when a response is truncated. */
const MIN_SPLIT_SIZE = 1000;

/** Transcripts longer than this are summarized in parts before a final summary. */
const MAX_SUMMARY_INPUT = 200000;

/** How much of the previous part's output is shown to the model for continuity. */
const PREVIOUS_TAIL_LENGTH = 600;

/** Upper bound on the heading outline sent with each part, to keep prompts small. */
const MAX_OUTLINE_HEADINGS = 40;

const HEADING_PATTERN = /^(#{1,6})\s+(.+?)\s*#*\s*$/;

export interface LLMCompletion {
  text: string;
  /** True when the provider stopped because it hit its output token limit. */
  truncated: boolean;
}

export type CompletionFn = (prompt: string) => Promise<LLMCompletion>;

export interface ChunkedProcessingOptions {
  transcript: string;
  basePrompt: string;
  generateSummary: boolean;
  includeTimestampsInLLM: boolean;
  forceLLMLanguage: boolean;
  transcriptLanguageCode?: string;
  providerName: string;
  complete: CompletionFn;
  statusCallback?: StatusCallback;
  chunkSize?: number;
  /** Completed work, kept across retries so finished chunks are not re-sent. */
  state?: ChunkedProcessingState;
}

export interface ChunkedProcessingState {
  chunkResults: Map<number, string>;
  summary: string | null;
}

/** What earlier parts produced, so the next part can continue their structure. */
export interface PartContext {
  headings: string[];
  previousTail: string;
}

export function createChunkedProcessingState(): ChunkedProcessingState {
  return { chunkResults: new Map(), summary: null };
}

/**
 * Splits a transcript into chunks of at most maxChars characters, preferring to
 * break at line breaks, then sentence ends, then whitespace.
 */
export function splitTranscriptIntoChunks(
  transcript: string,
  maxChars: number,
): string[] {
  const chunks: string[] = [];
  let remaining = transcript.trim();

  while (remaining.length > maxChars) {
    const window = remaining.substring(0, maxChars + 1);
    const minCut = Math.floor(maxChars / 2);
    let cut = findLastBreak(window, /\n/g, minCut);
    if (cut === -1) cut = findLastBreak(window, /[.!?]["')\]]*\s/g, minCut);
    if (cut === -1) cut = findLastBreak(window, /\s/g, minCut);
    if (cut === -1) cut = maxChars;

    const chunk = remaining.substring(0, cut).trim();
    if (chunk) chunks.push(chunk);
    remaining = remaining.substring(cut).trim();
  }

  if (remaining) chunks.push(remaining);
  return chunks;
}

/** Splits text into two roughly equal parts at a natural break point. */
function splitInTwo(text: string): string[] {
  // Allow the first part up to 60% so the break search does not leave a small third part
  return splitTranscriptIntoChunks(
    text,
    Math.max(MIN_SPLIT_SIZE, Math.ceil(text.length * 0.6)),
  );
}

/** Returns the index just after the last match at or beyond minIndex, or -1. */
function findLastBreak(text: string, pattern: RegExp, minIndex: number): number {
  let result = -1;
  for (const match of text.matchAll(pattern)) {
    const end = match.index + match[0].length;
    if (end >= minIndex && end <= text.length - 1) result = end;
  }
  return result;
}

export function buildChunkPrompt(
  basePrompt: string,
  chunk: string,
  partNumber: number,
  totalParts: number,
  includeTimestampsInLLM: boolean,
  forceLLMLanguage: boolean,
  transcriptLanguageCode?: string,
  context?: PartContext,
): string {
  let prompt = basePrompt;
  prompt += `\n\nIMPORTANT: The transcript is long and has been split into ${totalParts} parts. This is part ${partNumber} of ${totalParts}.`;
  prompt += ` Process ONLY this part and return the COMPLETE processed text for all of it. Do NOT summarize, shorten, or skip any content.`;
  prompt += ` Do NOT add a summary, a "## Transcript" or "## Summary" heading, an introduction, or closing remarks: output only the processed transcript text for this part, so it can be joined seamlessly with the other parts.`;
  if (partNumber > 1) {
    prompt += ` This part continues directly from the previous part and may begin mid-sentence; continue naturally without re-introducing the topic.`;
  }

  if (context && (context.headings.length > 0 || context.previousTail)) {
    prompt += `\n\nDOCUMENT STRUCTURE: Your output is appended to the output of the previous parts, so it must read as one continuous document.`;
    prompt += ` Do NOT add a document title and do NOT repeat headings that were already used.`;
    prompt += ` If this part begins by continuing the last section, continue it without a new heading. Add a heading only where a new topic begins, and use the same heading levels as the earlier parts for sections and sub-sections of the same kind.`;
    if (context.headings.length > 0) {
      prompt += `\n\nHeadings used so far, in order:\n${context.headings.join("\n")}`;
    }
    if (context.previousTail) {
      prompt += `\n\nThe previous part's processed text ends with:\n"""\n${context.previousTail}\n"""`;
    }
  }

  if (includeTimestampsInLLM) {
    prompt += `\n\nIMPORTANT: The transcript contains timestamp links in the format [MM:SS](url). You MUST preserve these timestamp links exactly as they appear in the original transcript. Do not remove, modify, or reformat them.`;
  }

  prompt += getLanguageRequirement(forceLLMLanguage, transcriptLanguageCode);
  prompt += `\nTranscript (part ${partNumber} of ${totalParts}):\n${chunk}`;
  return prompt;
}

export function buildSummaryPrompt(
  transcript: string,
  forceLLMLanguage: boolean,
  transcriptLanguageCode?: string,
): string {
  let prompt = `Write a concise summary (2-3 sentences) of the following YouTube video transcript, focusing on the main topics, key points, and overall message.`;
  prompt += ` Respond with only the summary text: no heading, introduction, or other commentary.`;
  prompt += getLanguageRequirement(forceLLMLanguage, transcriptLanguageCode);
  prompt += `\nTranscript:\n${transcript}`;
  return prompt;
}

/**
 * Builds the continuity context for the next part from the output so far,
 * optionally extending the context the earlier output was produced with.
 */
export function buildPartContext(
  previousOutputs: string[],
  base?: PartContext,
): PartContext {
  const text = previousOutputs.filter((o) => o.length > 0).join("\n\n");
  if (!text) return base ?? { headings: [], previousTail: "" };

  const headings = [
    ...(base?.headings ?? []),
    ...extractHeadings(text).map((h) => h.line),
  ];
  // Start a shortened excerpt at a word boundary
  const previousTail = text.length > PREVIOUS_TAIL_LENGTH
    ? text.substring(text.length - PREVIOUS_TAIL_LENGTH).replace(/^\S*\s+/, "")
    : text;

  return {
    headings: headings.slice(-MAX_OUTLINE_HEADINGS),
    previousTail: previousTail.trim(),
  };
}

interface Heading {
  line: string;
  level: number;
  text: string;
}

function extractHeadings(text: string): Heading[] {
  const headings: Heading[] = [];
  for (const line of text.split("\n")) {
    const match = line.match(HEADING_PATTERN);
    if (match) {
      headings.push({ line: line.trim(), level: match[1].length, text: match[2] });
    }
  }
  return headings;
}

function normalizeHeadingText(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

/**
 * Joins processed parts into one document, repairing heading problems that
 * appear when parts are processed separately: a later part restarting with a
 * document title, or re-opening the section the previous part ended in.
 */
export function joinProcessedParts(parts: string[]): string {
  let joined = "";
  for (const rawPart of parts) {
    let part = rawPart.trim();
    if (!part) continue;

    if (joined) {
      // Only the first part may contain a document title
      part = part.replace(/^#(?=\s)/gm, "##");

      // Drop a heading that re-opens the section the previous part ended in
      const lastHeading = extractHeadings(joined).pop();
      const firstLine = part.split("\n", 1)[0];
      const opening = firstLine.match(HEADING_PATTERN);
      if (
        lastHeading &&
        opening &&
        normalizeHeadingText(opening[2]) === normalizeHeadingText(lastHeading.text)
      ) {
        part = part.substring(firstLine.length).trim();
      }
    }

    if (part) joined = joined ? `${joined}\n\n${part}` : part;
  }
  return joined;
}

/** Removes section headings the model may add to a chunk despite instructions. */
export function cleanChunkOutput(text: string): string {
  return text
    .trim()
    .replace(/^#{1,6}\s+Transcript\s*\n+/i, "")
    .trim();
}

function stripSummaryHeading(text: string): string {
  return text
    .trim()
    .replace(/^#{1,6}\s+Summary\s*\n+/i, "")
    .trim();
}

/**
 * Processes a transcript with an LLM without losing content to output limits.
 *
 * Short transcripts are sent in a single request. Long transcripts, or short ones
 * whose response was truncated, are split into chunks that are processed one at
 * a time and joined; a summary is then requested separately. Returns the
 * response text in the "## Summary / ## Transcript" format parseLLMResponse expects.
 */
export async function processTranscriptInChunks(
  options: ChunkedProcessingOptions,
): Promise<string> {
  const {
    transcript,
    basePrompt,
    generateSummary,
    providerName,
    complete,
    statusCallback,
  } = options;
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const state = options.state ?? createChunkedProcessingState();

  let chunks = splitTranscriptIntoChunks(transcript, chunkSize);

  if (chunks.length <= 1 && state.chunkResults.size === 0) {
    const result = await complete(
      buildPrompt(
        basePrompt,
        transcript,
        generateSummary,
        options.includeTimestampsInLLM,
        options.forceLLMLanguage,
        options.transcriptLanguageCode,
      ),
    );
    if (!result.truncated) return result.text;

    console.warn(
      `${providerName} response was truncated; reprocessing transcript in smaller parts`,
    );
    chunks = splitInTwo(transcript);
  } else if (chunks.length <= 1) {
    // A previous attempt was truncated and split; resume with the same parts
    chunks = splitInTwo(transcript);
  }

  const total = chunks.length;
  const processed: string[] = [];
  for (let i = 0; i < total; i++) {
    let output = state.chunkResults.get(i);
    if (output === undefined) {
      if (statusCallback) {
        statusCallback(
          `Processing transcript with ${providerName} (part ${i + 1} of ${total})...`,
        );
      }
      output = await processChunk(
        options,
        chunks[i],
        i + 1,
        total,
        buildPartContext(processed),
      );
      state.chunkResults.set(i, output);
    }
    processed.push(output);
  }

  const joinedTranscript = joinProcessedParts(processed);

  if (!generateSummary) {
    return `## Transcript\n\n${joinedTranscript}`;
  }

  if (state.summary === null) {
    if (statusCallback) {
      statusCallback(`Generating summary with ${providerName}...`);
    }
    state.summary = await summarize(options, transcript);
  }

  return `## Summary\n\n${state.summary}\n\n## Transcript\n\n${joinedTranscript}`;
}

async function processChunk(
  options: ChunkedProcessingOptions,
  chunk: string,
  partNumber: number,
  totalParts: number,
  context: PartContext,
): Promise<string> {
  const result = await options.complete(
    buildChunkPrompt(
      options.basePrompt,
      chunk,
      partNumber,
      totalParts,
      options.includeTimestampsInLLM,
      options.forceLLMLanguage,
      options.transcriptLanguageCode,
      context,
    ),
  );

  if (!result.truncated) return cleanChunkOutput(result.text);

  if (chunk.length < MIN_SPLIT_SIZE * 2) {
    console.warn(
      `${options.providerName} response for part ${partNumber} of ${totalParts} was truncated and the part is too small to split further`,
    );
    return cleanChunkOutput(result.text);
  }

  // The output limit was hit: split this part in two and process each half
  const halves = splitInTwo(chunk);
  const outputs: string[] = [];
  for (const half of halves) {
    // The second half continues from the first half's output
    const halfContext = buildPartContext(outputs, context);
    outputs.push(
      await processChunk(options, half, partNumber, totalParts, halfContext),
    );
  }
  return joinProcessedParts(outputs);
}

async function summarize(
  options: ChunkedProcessingOptions,
  transcript: string,
): Promise<string> {
  const { complete, forceLLMLanguage, transcriptLanguageCode } = options;

  if (transcript.length <= MAX_SUMMARY_INPUT) {
    const result = await complete(
      buildSummaryPrompt(transcript, forceLLMLanguage, transcriptLanguageCode),
    );
    return stripSummaryHeading(result.text);
  }

  // Very long transcripts: summarize each section, then summarize the summaries
  const sections = splitTranscriptIntoChunks(transcript, MAX_SUMMARY_INPUT);
  const partialSummaries: string[] = [];
  for (const section of sections) {
    const result = await complete(
      buildSummaryPrompt(section, forceLLMLanguage, transcriptLanguageCode),
    );
    partialSummaries.push(stripSummaryHeading(result.text));
  }
  const result = await complete(
    buildSummaryPrompt(
      partialSummaries.join("\n\n"),
      forceLLMLanguage,
      transcriptLanguageCode,
    ),
  );
  return stripSummaryHeading(result.text);
}
