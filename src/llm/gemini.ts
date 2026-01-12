import { Notice, App, requestUrl } from "obsidian";
import type {
  YouTubeTranscriptPluginSettings,
  LLMResponse,
  StatusCallback,
  RetryModalConstructor,
} from "../types";
import { DEFAULT_SETTINGS } from "../settings";
import {
  parseLLMResponse,
  buildPrompt,
  getProcessingStatusMessage,
} from "./parser";
import { UserCancelledError } from "./openai";

export async function processWithGemini(
  app: App,
  transcript: string,
  generateSummary: boolean,
  settings: YouTubeTranscriptPluginSettings,
  statusCallback?: StatusCallback,
  RetryModal?: RetryModalConstructor,
): Promise<LLMResponse> {
  if (!settings.geminiKey || settings.geminiKey.trim() === "") {
    console.debug(
      "processWithGemini: No Gemini key, returning transcript without summary",
    );
    new Notice(
      "Gemini processing requested but API key is not configured. Using raw transcript instead.",
    );
    return { transcript, summary: null };
  }

  console.debug("processWithGemini: generateSummary =", generateSummary);

  if (statusCallback) statusCallback(getProcessingStatusMessage("Gemini"));

  const prompt = settings.prompt || DEFAULT_SETTINGS.prompt;
  const fullPrompt = buildPrompt(
    prompt,
    transcript,
    generateSummary,
    settings.includeTimestampsInLLM || false,
  );

  const makeRequest = async (): Promise<LLMResponse> => {
    const timeoutMinutes = settings.openaiTimeout || 1;
    const timeoutMs = timeoutMinutes * 60 * 1000;
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () =>
          reject(
            new Error(
              `Gemini request timed out after ${timeoutMinutes} minute${timeoutMinutes !== 1 ? "s" : ""}`,
            ),
          ),
        timeoutMs,
      );
    });

    const model = settings.geminiModel || DEFAULT_SETTINGS.geminiModel;
    const apiKey = settings.geminiKey.trim();

    console.debug(
      `Gemini API request: model=${model}, url=https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    );

    const requestPromise = requestUrl({
      url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: fullPrompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.3,
        },
      }),
    });

    const response = await Promise.race([requestPromise, timeoutPromise]);

    if (response.status < 200 || response.status >= 300) {
      const errorData = response.json || {};

      if (response.status === 429) {
        if (statusCallback) statusCallback(null); // Hide notice
        const retryAfter =
          response.headers?.["retry-after"] ||
          response.headers?.["Retry-After"];
        let errorMsg = `Gemini rate limit exceeded (429). You've made too many requests too quickly.`;
        if (retryAfter) {
          errorMsg += ` Please wait ${retryAfter} seconds before retrying.`;
        } else {
          errorMsg += ` Please wait a few minutes before retrying.`;
        }
        new Notice(errorMsg, 10000);
        throw new Error(errorMsg);
      }

      if (response.status === 401 || response.status === 403) {
        if (statusCallback) statusCallback(null); // Hide notice
        const errorMsg = `Gemini API authentication error (${response.status}): Invalid API key. Please check your API key in settings.`;
        new Notice(errorMsg, 10000);
        throw new Error(errorMsg);
      }

      if (response.status === 404) {
        if (statusCallback) statusCallback(null); // Hide notice
        const errorDetail =
          errorData.error?.message || response.text || "Unknown error";
        const errorMsg = `Gemini API error (404): Model "${model}" not found or invalid API endpoint. Please check that the model name is correct and your API key is valid.`;
        new Notice(errorMsg, 10000);
        throw new Error(
          `Gemini API error (404): Model "${model}" not found or invalid API endpoint. Please check that the model name is correct and your API key is valid. Error: ${errorDetail}`,
        );
      }

      if (statusCallback) statusCallback(null); // Hide notice
      const errorMsg = `Gemini API error: ${response.status} - ${errorData.error?.message || response.text || "Unknown error"}`;
      new Notice(errorMsg, 10000);
      throw new Error(errorMsg);
    }

    const data = response.json;
    const responseContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseContent) {
      if (statusCallback) statusCallback(null); // Hide notice
      throw new Error("No response from Gemini");
    }

    return parseLLMResponse(responseContent.trim(), generateSummary);
  };

  try {
    return await makeRequest();
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    console.debug("Gemini processing error:", error);
    if (error instanceof Error && error.stack) {
      console.debug("Gemini error stack:", error.stack);
    }

    if (errorMessage.includes("404") || errorMessage.includes("status 404")) {
      const model = settings.geminiModel || DEFAULT_SETTINGS.geminiModel;
      if (statusCallback) statusCallback(null); // Hide notice
      const errorMsg = `Gemini API error (404): Model "${model}" not found. Please check your model selection and API key in settings.`;
      new Notice(errorMsg, 10000);
      throw new Error(
        `Gemini API error (404): Model "${model}" not found or invalid API endpoint. Please check that the model name is correct and your API key is valid. Common issues: model name typo, API key doesn't have access to Gemini API, or API key is invalid.`,
      );
    }

    if (errorMessage.includes("timed out") && RetryModal) {
      if (statusCallback) statusCallback(null); // Hide notice before showing modal
      const shouldRetry = await new RetryModal(
        app,
        errorMessage,
        "Gemini",
      ).waitForResponse();
      if (statusCallback) statusCallback(null); // Hide notice after modal closes

      if (shouldRetry === null) {
        throw new UserCancelledError("Transcript creation cancelled by user");
      }
      if (shouldRetry) {
        if (statusCallback) statusCallback("Retrying Gemini processing...");
        try {
          return await makeRequest();
        } catch (retryError: unknown) {
          const retryErrorMessage =
            retryError instanceof Error ? retryError.message : "Unknown error";
          const errorMsg = `Failed to process transcript with Gemini after retry: ${retryErrorMessage}`;
          new Notice(errorMsg, 10000);
          throw new Error(errorMsg);
        }
      } else {
        if (statusCallback) statusCallback(null); // Hide notice
        new Notice("Using raw transcript (Gemini processing skipped)");
        return { transcript, summary: null };
      }
    }

    const isRateLimitError =
      errorMessage.toLowerCase().includes("rate limit") ||
      errorMessage.includes("429") ||
      errorMessage.toLowerCase().includes("too many requests");

    if (isRateLimitError && RetryModal) {
      if (statusCallback) statusCallback(null); // Hide notice before showing modal
      const shouldRetry = await new RetryModal(
        app,
        errorMessage +
          "\n\nYou can retry after waiting a few minutes, or use the raw transcript without Gemini processing.",
        "Gemini",
      ).waitForResponse();
      if (statusCallback) statusCallback(null); // Hide notice after modal closes

      if (shouldRetry === null) {
        throw new UserCancelledError("Transcript creation cancelled by user");
      }
      if (shouldRetry) {
        if (statusCallback)
          statusCallback(
            "Waiting before retrying Gemini processing (rate limit)...",
          );
        await new Promise((resolve) => setTimeout(resolve, 60000));
        if (statusCallback) statusCallback("Retrying Gemini processing...");
        try {
          return await makeRequest();
        } catch (retryError: unknown) {
          const retryErrorMessage =
            retryError instanceof Error ? retryError.message : "Unknown error";
          const isStillRateLimited =
            retryErrorMessage.toLowerCase().includes("rate limit") ||
            retryErrorMessage.includes("429") ||
            retryErrorMessage.toLowerCase().includes("too many requests");
          if (isStillRateLimited) {
            if (statusCallback) statusCallback(null); // Hide notice
            new Notice("Still rate limited. Using raw transcript instead.");
            return { transcript, summary: null };
          }
          const errorMsg = `Failed to process transcript with Gemini after retry: ${retryErrorMessage}`;
          new Notice(errorMsg, 10000);
          throw new Error(errorMsg);
        }
      } else {
        if (statusCallback) statusCallback(null); // Hide notice
        new Notice(
          "Using raw transcript (Gemini processing skipped due to rate limit)",
        );
        return { transcript, summary: null };
      }
    }

    if (statusCallback) statusCallback(null); // Hide notice
    const errorMsg = `Failed to process transcript with Gemini: ${errorMessage}`;
    new Notice(errorMsg, 10000);
    console.error("Gemini processing error:", error);
    throw new Error(errorMsg);
  }
}
