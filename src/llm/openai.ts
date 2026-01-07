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

export class UserCancelledError extends Error {
  constructor(message = "Transcript creation cancelled by user") {
    super(message);
    this.name = "UserCancelledError";
  }
}

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeoutError";
  }
}

export async function processWithOpenAI(
  app: App,
  transcript: string,
  generateSummary: boolean,
  settings: YouTubeTranscriptPluginSettings,
  statusCallback?: StatusCallback,
  RetryModal?: RetryModalConstructor,
): Promise<LLMResponse> {
  if (!settings.openaiKey || settings.openaiKey.trim() === "") {
    console.debug(
      "processWithOpenAI: No OpenAI key, returning transcript without summary",
    );
    new Notice(
      "OpenAI processing requested but API key is not configured. Using raw transcript instead.",
    );
    return { transcript, summary: null };
  }

  console.debug("processWithOpenAI: generateSummary =", generateSummary);

  if (statusCallback) statusCallback(getProcessingStatusMessage("OpenAI"));

  const prompt = settings.prompt || DEFAULT_SETTINGS.prompt;
  const fullPrompt = buildPrompt(prompt, transcript, generateSummary);

  const makeRequest = async (): Promise<LLMResponse> => {
    // Add timeout wrapper using configured timeout
    const timeoutMinutes = settings.openaiTimeout || 1;
    const timeoutMs = timeoutMinutes * 60 * 1000;
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () =>
          reject(
            new TimeoutError(
              `OpenAI request timed out after ${timeoutMinutes} minute${timeoutMinutes !== 1 ? "s" : ""}`,
            ),
          ),
        timeoutMs,
      );
    });

    const requestPromise = requestUrl({
      url: "https://api.openai.com/v1/chat/completions",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.openaiKey}`,
      },
      body: JSON.stringify({
        model: settings.openaiModel || DEFAULT_SETTINGS.openaiModel,
        messages: [
          {
            role: "user",
            content: fullPrompt,
          },
        ],
        temperature: 0.3,
      }),
    });

    const response = await Promise.race([requestPromise, timeoutPromise]);

    if (response.status < 200 || response.status >= 300) {
      const errorData = response.json || {};

      // Handle rate limiting (429) specifically
      if (response.status === 429) {
        if (statusCallback) statusCallback(null); // Hide notice
        const errorMsg = formatRateLimitMessage(response.headers);
        new Notice(errorMsg, 10000); // Show for 10 seconds
        throw new Error(errorMsg);
      }

      // Handle authentication errors
      if (response.status === 401 || response.status === 403) {
        if (statusCallback) statusCallback(null); // Hide notice
        const errorMsg = `OpenAI API authentication error (${response.status}): Invalid API key. Please check your API key in settings.`;
        new Notice(errorMsg);
        throw new Error(errorMsg);
      }

      // Handle 404 errors
      if (response.status === 404) {
        if (statusCallback) statusCallback(null); // Hide notice
        const model = settings.openaiModel || DEFAULT_SETTINGS.openaiModel;
        const errorMsg = `OpenAI API error (404): Model "${model}" not found. Please check your model selection in settings.`;
        new Notice(errorMsg);
        throw new Error(errorMsg);
      }

      if (statusCallback) statusCallback(null); // Hide notice
      const errorMsg = `OpenAI API error: ${response.status} - ${errorData.error?.message || response.text || "Unknown error"}`;
      new Notice(errorMsg);
      throw new Error(errorMsg);
    }

    const data = response.json;
    const responseContent = data.choices?.[0]?.message?.content;

    if (!responseContent) {
      if (statusCallback) statusCallback(null); // Hide notice
      throw new Error("No response from OpenAI");
    }

    return parseLLMResponse(responseContent.trim(), generateSummary);
  };

  try {
    return await makeRequest();
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Check if it's a timeout error
    if (error instanceof TimeoutError && RetryModal) {
      if (statusCallback) statusCallback(null); // Hide notice before showing modal
      const shouldRetry = await new RetryModal(
        app,
        errorMessage,
        "OpenAI",
      ).waitForResponse();
      if (statusCallback) statusCallback(null); // Hide notice after modal closes

      if (shouldRetry === null) {
        throw new UserCancelledError("Transcript creation cancelled by user");
      }
      if (shouldRetry) {
        if (statusCallback) statusCallback("Retrying OpenAI processing...");
        try {
          return await makeRequest();
        } catch (retryError: unknown) {
          const retryErrorMessage =
            retryError instanceof Error ? retryError.message : "Unknown error";
          const errorMsg = `Failed to process transcript with OpenAI after retry: ${retryErrorMessage}`;
          new Notice(errorMsg);
          throw new Error(errorMsg);
        }
      } else {
        if (statusCallback) statusCallback(null); // Hide notice
        new Notice("Using raw transcript (OpenAI processing skipped)");
        return { transcript, summary: null };
      }
    }

    // Check if it's a rate limit error (429)
    const isRateLimitError =
      errorMessage.toLowerCase().includes("rate limit") ||
      errorMessage.includes("429") ||
      errorMessage.toLowerCase().includes("too many requests");

    if (isRateLimitError && RetryModal) {
      if (statusCallback) statusCallback(null); // Hide notice before showing modal
      const shouldRetry = await new RetryModal(
        app,
        errorMessage +
          "\n\nYou can retry after waiting a few minutes, or use the raw transcript without OpenAI processing.",
        "OpenAI",
      ).waitForResponse();
      if (statusCallback) statusCallback(null); // Hide notice after modal closes

      if (shouldRetry === null) {
        throw new UserCancelledError("Transcript creation cancelled by user");
      }
      if (shouldRetry) {
        if (statusCallback)
          statusCallback(
            "Waiting before retrying OpenAI processing (rate limit)...",
          );
        await new Promise((resolve) => setTimeout(resolve, 60000));
        if (statusCallback) statusCallback("Retrying OpenAI processing...");
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
          const errorMsg = `Failed to process transcript with OpenAI after retry: ${retryErrorMessage}`;
          new Notice(errorMsg);
          throw new Error(errorMsg);
        }
      } else {
        if (statusCallback) statusCallback(null); // Hide notice
        new Notice(
          "Using raw transcript (OpenAI processing skipped due to rate limit)",
        );
        return { transcript, summary: null };
      }
    }

    // For other errors, show notice and throw
    if (statusCallback) statusCallback(null); // Hide notice
    const errorMsg = `Failed to process transcript with OpenAI: ${errorMessage}`;
    new Notice(errorMsg);
    console.error("OpenAI processing error:", error);
    throw new Error(errorMsg);
  }
}

function formatRateLimitMessage(headers: Record<string, string>): string {
  const remainingRequests = headers["x-ratelimit-remaining-requests"];
  const remainingTokens = headers["x-ratelimit-remaining-tokens"];
  const resetRequests = headers["x-ratelimit-reset-requests"];
  const resetTokens = headers["x-ratelimit-reset-tokens"];

  let reason = "Rate limit exceeded. ";
  if (remainingRequests === "0") {
    reason = `You have exceeded your request limit. Please wait ${resetRequests} before making new requests.`;
  } else if (remainingTokens === "0") {
    reason = `You have exceeded your token limit. The limit will reset in ${resetTokens}.`;
  }

  return `OpenAI API Error (429): ${reason}`;
}
