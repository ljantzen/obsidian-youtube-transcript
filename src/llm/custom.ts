import { Notice, App, requestUrl } from "obsidian";
import type {
  YouTubeTranscriptPluginSettings,
  LLMResponse,
  StatusCallback,
  RetryModalConstructor,
  CustomLLMProvider,
} from "../types";
import { UserCancelledError, TimeoutError } from "./openai";
import {
  parseLLMResponse,
  buildPrompt,
  getProcessingStatusMessage,
} from "./parser";

export async function processWithCustomProvider(
  app: App,
  transcript: string,
  generateSummary: boolean,
  settings: YouTubeTranscriptPluginSettings,
  provider: CustomLLMProvider,
  statusCallback?: StatusCallback,
  RetryModal?: RetryModalConstructor,
  transcriptLanguageCode?: string,
): Promise<LLMResponse> {
  if (!provider.apiKey || provider.apiKey.trim() === "") {
    console.debug(
      `processWithCustomProvider: No API key for ${provider.name}, returning transcript without summary`,
    );
    new Notice(
      `${provider.name} processing requested but API key is not configured. Using raw transcript instead.`,
    );
    return { transcript, summary: null };
  }

  console.debug("processWithCustomProvider: generateSummary =", generateSummary);

  if (statusCallback) statusCallback(getProcessingStatusMessage(provider.name));

  const prompt = settings.prompt;
  const fullPrompt = buildPrompt(
    prompt,
    transcript,
    generateSummary,
    settings.includeTimestampsInLLM || false,
    settings.forceLLMLanguage || false,
    transcriptLanguageCode,
  );

  const makeRequest = async (): Promise<LLMResponse> => {
    // Add timeout wrapper using configured timeout
    const timeoutMinutes = provider.timeout || 1;
    const timeoutMs = timeoutMinutes * 60 * 1000;
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () =>
          reject(
            new TimeoutError(
              `${provider.name} request timed out after ${timeoutMinutes} minute${timeoutMinutes !== 1 ? "s" : ""}`,
            ),
          ),
        timeoutMs,
      );
    });

    // Build headers - start with auth and content-type
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${provider.apiKey}`,
    };

    // Add custom headers if provided
    if (provider.customHeaders) {
      Object.assign(headers, provider.customHeaders);
    }

    const requestPromise = requestUrl({
      url: provider.endpoint,
      method: "POST",
      headers,
      body: JSON.stringify({
        model: provider.model,
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
        const errorMsg = `${provider.name} API Error (429): Rate limit exceeded. Please wait before trying again.`;
        new Notice(errorMsg, 10000); // Show for 10 seconds
        throw new Error(errorMsg);
      }

      // Handle authentication errors
      if (response.status === 401 || response.status === 403) {
        if (statusCallback) statusCallback(null); // Hide notice
        const errorMsg = `${provider.name} API authentication error (${response.status}): Invalid API key. Please check your API key in settings.`;
        new Notice(errorMsg, 10000);
        throw new Error(errorMsg);
      }

      // Handle 404 errors
      if (response.status === 404) {
        if (statusCallback) statusCallback(null); // Hide notice
        const errorMsg = `${provider.name} API error (404): Endpoint or model not found. Please check your configuration in settings.`;
        new Notice(errorMsg, 10000);
        throw new Error(errorMsg);
      }

      if (statusCallback) statusCallback(null); // Hide notice
      const errorMsg = `${provider.name} API error: ${response.status} - ${errorData.error?.message || response.text || "Unknown error"}`;
      new Notice(errorMsg, 10000);
      throw new Error(errorMsg);
    }

    const data = response.json;
    const responseContent = data.choices?.[0]?.message?.content;

    if (!responseContent) {
      if (statusCallback) statusCallback(null); // Hide notice
      throw new Error(`No response from ${provider.name}`);
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
        provider.name,
      ).waitForResponse();
      if (statusCallback) statusCallback(null); // Hide notice after modal closes

      if (shouldRetry === null) {
        throw new UserCancelledError("Transcript creation cancelled by user");
      }
      if (shouldRetry) {
        if (statusCallback)
          statusCallback(`Retrying ${provider.name} processing...`);
        try {
          return await makeRequest();
        } catch (retryError: unknown) {
          const retryErrorMessage =
            retryError instanceof Error ? retryError.message : "Unknown error";
          const errorMsg = `Failed to process transcript with ${provider.name} after retry: ${retryErrorMessage}`;
          new Notice(errorMsg, 10000);
          throw new Error(errorMsg);
        }
      } else {
        if (statusCallback) statusCallback(null); // Hide notice
        new Notice(`Using raw transcript (${provider.name} processing skipped)`);
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
          `\n\nYou can retry after waiting a few minutes, or use the raw transcript without ${provider.name} processing.`,
        provider.name,
      ).waitForResponse();
      if (statusCallback) statusCallback(null); // Hide notice after modal closes

      if (shouldRetry === null) {
        throw new UserCancelledError("Transcript creation cancelled by user");
      }
      if (shouldRetry) {
        if (statusCallback)
          statusCallback(
            `Waiting before retrying ${provider.name} processing (rate limit)...`,
          );
        await new Promise((resolve) => setTimeout(resolve, 60000));
        if (statusCallback)
          statusCallback(`Retrying ${provider.name} processing...`);
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
          const errorMsg = `Failed to process transcript with ${provider.name} after retry: ${retryErrorMessage}`;
          new Notice(errorMsg, 10000);
          throw new Error(errorMsg);
        }
      } else {
        if (statusCallback) statusCallback(null); // Hide notice
        new Notice(
          `Using raw transcript (${provider.name} processing skipped due to rate limit)`,
        );
        return { transcript, summary: null };
      }
    }

    // For other errors, show notice and throw
    if (statusCallback) statusCallback(null); // Hide notice
    const errorMsg = `Failed to process transcript with ${provider.name}: ${errorMessage}`;
    new Notice(errorMsg, 10000);
    console.error(`${provider.name} processing error:`, error);
    throw new Error(errorMsg);
  }
}
