import { Notice } from "obsidian";
import type { LLMResponse } from "../types";

export function getProcessingStatusMessage(providerName: string): string {
  return `Processing transcript with ${providerName} (this may take a moment or two)...`;
}

export function parseLLMResponse(
  responseContent: string,
  generateSummary: boolean,
): LLMResponse {
  const trimmedContent = responseContent.trim();

  // Parse the response to extract summary and transcript with headers
  let summary: string | null = null;
  let processedTranscript: string;

  if (generateSummary) {
    // Try multiple patterns to extract summary (more flexible matching)
    let summaryMatch = trimmedContent.match(
      /##\s+Summary\s*\n\n(.*?)(?=\n##\s+Transcript|$)/s,
    );

    if (!summaryMatch) {
      summaryMatch = trimmedContent.match(
        /##\s+Summary\s*\n(.*?)(?=\n##\s+Transcript|$)/s,
      );
    }

    if (!summaryMatch) {
      summaryMatch = trimmedContent.match(
        /(?:##\s+)?Summary[:-]?\s*\n\n?(.*?)(?=\n##\s+Transcript|\n##\s+Summary|$)/is,
      );
    }

    if (summaryMatch && summaryMatch[1]) {
      summary = summaryMatch[1].trim();
    }

    const hasSummarySection = /##\s+Summary/i.test(trimmedContent);
    const hasTranscriptSection = /##\s+Transcript/i.test(trimmedContent);

    if (hasSummarySection && hasTranscriptSection) {
      processedTranscript = trimmedContent;
      if (!summary) {
        const summaryMatch = trimmedContent.match(
          /##\s+Summary\s*\n\n?(.*?)(?=\n##\s+Transcript|$)/is,
        );
        if (summaryMatch && summaryMatch[1]) {
          summary = summaryMatch[1].trim();
        } else {
          const summaryIndex = trimmedContent.search(/##\s+Summary/i);
          const transcriptIndex = trimmedContent.search(/##\s+Transcript/i);
          if (transcriptIndex > summaryIndex && summaryIndex !== -1) {
            const afterSummary = trimmedContent.substring(summaryIndex);
            const beforeTranscript = afterSummary.substring(
              0,
              afterSummary.search(/##\s+Transcript/i),
            );
            summary = beforeTranscript.replace(/##\s+Summary\s*/i, "").trim();
          }
        }
      }
      const hasSummaryInOutput = /##\s+Summary/i.test(processedTranscript);
      if (!hasSummaryInOutput) {
        console.warn(
          "Summary section detected in response but not found in final transcript. Reconstructing...",
        );
        const transcriptMatch = trimmedContent.match(
          /##\s+Transcript\s*\n\n?(.*?)$/is,
        );
        const transcriptContent = transcriptMatch
          ? transcriptMatch[1].trim()
          : trimmedContent;
        processedTranscript = `## Summary\n\n${summary || "Summary not extracted"}\n\n## Transcript\n\n${transcriptContent}`;
      }
    } else {
      console.warn(
        "LLM response did not follow expected format with Summary and Transcript sections",
      );

      if (summary) {
        const transcriptMatch = trimmedContent.match(
          /##\s+Transcript\s*\n\n?(.*?)$/s,
        );
        const transcriptContent = transcriptMatch
          ? transcriptMatch[1].trim()
          : trimmedContent.replace(/##\s+Summary\s*\n\n?.*?$/is, "").trim();
        processedTranscript = `## Summary\n\n${summary}\n\n## Transcript\n\n${transcriptContent || trimmedContent}`;
      } else if (hasSummarySection) {
        const summaryIndex = trimmedContent.indexOf("## Summary");
        const transcriptIndex = trimmedContent.indexOf("## Transcript");

        if (transcriptIndex > summaryIndex) {
          const summaryText = trimmedContent
            .substring(summaryIndex + 10, transcriptIndex)
            .trim();
          const transcriptText = trimmedContent
            .substring(transcriptIndex + 14)
            .trim();
          summary = summaryText;
          processedTranscript = `## Summary\n\n${summary}\n\n## Transcript\n\n${transcriptText}`;
        } else {
          const afterSummary = trimmedContent
            .substring(summaryIndex + 10)
            .trim();
          const firstPara =
            afterSummary.split("\n\n")[0] ||
            afterSummary.split("\n")[0] ||
            afterSummary.substring(0, 300);
          summary = firstPara.trim();
          processedTranscript = `## Summary\n\n${summary}\n\n## Transcript\n\n${afterSummary}`;
        }
      } else {
        const firstPara =
          trimmedContent.split("\n\n")[0] || trimmedContent.split("\n")[0];
        if (
          firstPara &&
          firstPara.length < 500 &&
          !firstPara.startsWith("##")
        ) {
          summary = firstPara.trim();
          processedTranscript = `## Summary\n\n${summary}\n\n## Transcript\n\n${trimmedContent}`;
        } else {
          summary = "Video transcript processed and cleaned.";
          processedTranscript = `## Summary\n\n${summary}\n\n## Transcript\n\n${trimmedContent}`;
        }
      }
    }

    if (generateSummary && !/##\s+Summary/i.test(processedTranscript)) {
      console.warn(
        "Summary was requested but not found in LLM response. Adding fallback summary.",
      );
      if (!summary) {
        summary =
          "Summary generation requested but LLM response did not include a summary section.";
      }
      if (/##\s+Transcript/i.test(processedTranscript)) {
        processedTranscript = processedTranscript.replace(
          /(##\s+Transcript)/i,
          `## Summary\n\n${summary}\n\n$1`,
        );
      } else {
        processedTranscript = `## Summary\n\n${summary}\n\n## Transcript\n\n${processedTranscript}`;
      }
    }

    if (generateSummary) {
      const finalCheck = /##\s+Summary/i.test(processedTranscript);
      if (!finalCheck) {
        console.error(
          "CRITICAL: Summary section still missing after all attempts!",
        );
        processedTranscript = `## Summary\n\n${summary || "Summary could not be generated"}\n\n## Transcript\n\n${processedTranscript}`;
      }
    }
  } else {
    processedTranscript = trimmedContent;
  }

  if (!processedTranscript || processedTranscript.length === 0) {
    processedTranscript = trimmedContent;
  }

  if (generateSummary) {
    const hasSummaryInTranscript = processedTranscript.includes("## Summary");
    if (summary || hasSummaryInTranscript) {
      new Notice("LLM processing complete with summary");
      console.debug(
        "Summary generation successful. Summary present:",
        !!summary,
        "Summary in transcript:",
        hasSummaryInTranscript,
      );
    } else {
      new Notice("LLM processing complete (summary may be missing)");
      console.warn(
        "Summary was requested but not found. Response preview:",
        trimmedContent.substring(0, 500),
      );
    }
  } else {
    new Notice("LLM processing complete");
  }

  return { transcript: processedTranscript, summary };
}

export function buildPrompt(
  basePrompt: string,
  transcript: string,
  generateSummary: boolean,
  includeTimestampsInLLM: boolean,
): string {
  let fullPrompt = basePrompt;

  if (generateSummary) {
    fullPrompt += `\n\nIMPORTANT: You must provide a concise summary (2-3 sentences) of the video content, focusing on the main topics, key points, and overall message.`;
    fullPrompt += `\n\nYou MUST format your response EXACTLY as follows:\n`;
    fullPrompt += `\n## Summary\n\n[Your 2-3 sentence summary here]\n\n## Transcript\n\n[Your processed transcript here]\n`;
    fullPrompt += `\nDo NOT include any other text before or after these sections. Start directly with "## Summary".`;
  } else {
    fullPrompt += `\n\nPlease format your response as follows:\n`;
    fullPrompt += `- Start with a "## Transcript" markdown header followed by the processed transcript\n`;
  }

  if (includeTimestampsInLLM) {
    fullPrompt += `\n\nIMPORTANT: The transcript contains timestamp links in the format [MM:SS](url). You MUST preserve these timestamp links exactly as they appear in the original transcript. Do not remove, modify, or reformat them.`;
  }

  fullPrompt += `\nTranscript:\n${transcript}`;

  return fullPrompt;
}
