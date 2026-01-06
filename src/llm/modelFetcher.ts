import { requestUrl } from "obsidian";

export interface ModelInfo {
  id: string;
  displayName?: string;
}

/**
 * Fetches available models from OpenAI API
 * @param apiKey OpenAI API key
 * @returns Array of model IDs
 */
export async function fetchOpenAIModels(
  apiKey: string,
): Promise<ModelInfo[]> {
  if (!apiKey || apiKey.trim() === "") {
    throw new Error("OpenAI API key is required");
  }

  try {
    const response = await requestUrl({
      url: "https://api.openai.com/v1/models",
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (response.status < 200 || response.status >= 300) {
      if (response.status === 401 || response.status === 403) {
        throw new Error("Invalid OpenAI API key");
      }
      throw new Error(
        `OpenAI API error: ${response.status} - ${response.text || "Unknown error"}`,
      );
    }

    const data = response.json;
    const models: ModelInfo[] = [];
    const seenModelIds = new Set<string>();

    if (data.data && Array.isArray(data.data)) {
      for (const model of data.data) {
        if (model.id && typeof model.id === "string") {
          // Trim whitespace to prevent duplicates
          const modelId = model.id.trim();
          // Filter to only chat completion models (gpt-* models)
          if (
            modelId &&
            (modelId.startsWith("gpt-") ||
              modelId.startsWith("o1-") ||
              modelId.startsWith("o3-")) &&
            !seenModelIds.has(modelId)
          ) {
            seenModelIds.add(modelId);
            // Trim displayName as well to avoid display issues
            // OpenAI API typically doesn't provide displayName, so use modelId
            const displayName = model.displayName
              ? model.displayName.trim()
              : modelId;
            models.push({
              id: modelId,
              displayName: displayName,
            });
          }
        }
      }
    }

    // Sort models by display name first, then by model ID
    models.sort((a, b) => {
      const aDisplay = a.displayName || a.id;
      const bDisplay = b.displayName || b.id;
      const displayCompare = aDisplay.localeCompare(bDisplay);
      if (displayCompare !== 0) {
        return displayCompare;
      }
      // If display names are the same, sort by ID
      return a.id.localeCompare(b.id);
    });

    return models;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to fetch OpenAI models");
  }
}

/**
 * Fetches available models from Google Gemini API
 * @param apiKey Gemini API key
 * @returns Array of model IDs
 */
export async function fetchGeminiModels(
  apiKey: string,
): Promise<ModelInfo[]> {
  if (!apiKey || apiKey.trim() === "") {
    throw new Error("Gemini API key is required");
  }

  try {
    const response = await requestUrl({
      url: `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey.trim()}`,
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.status < 200 || response.status >= 300) {
      if (response.status === 401 || response.status === 403) {
        throw new Error("Invalid Gemini API key");
      }
      const errorData = response.json || {};
      throw new Error(
        `Gemini API error: ${response.status} - ${errorData.error?.message || response.text || "Unknown error"}`,
      );
    }

    const data = response.json;
    const models: ModelInfo[] = [];
    const seenModelIds = new Set<string>();

    if (data.models && Array.isArray(data.models)) {
      for (const model of data.models) {
        if (model.name && typeof model.name === "string") {
          // Extract model ID from name (format: "models/gemini-2.0-flash")
          // Trim whitespace to prevent duplicates
          const modelId = model.name.replace("models/", "").trim();
          // Only include models that support generateContent and haven't been seen
          if (
            modelId &&
            model.supportedGenerationMethods &&
            model.supportedGenerationMethods.includes("generateContent") &&
            !seenModelIds.has(modelId)
          ) {
            seenModelIds.add(modelId);
            // Trim displayName as well to avoid display issues
            const displayName = model.displayName
              ? model.displayName.trim()
              : modelId;
            models.push({
              id: modelId,
              displayName: displayName,
            });
          }
        }
      }
    }

    // Sort models by display name first, then by model ID
    models.sort((a, b) => {
      const aDisplay = a.displayName || a.id;
      const bDisplay = b.displayName || b.id;
      const displayCompare = aDisplay.localeCompare(bDisplay);
      if (displayCompare !== 0) {
        return displayCompare;
      }
      // If display names are the same, sort by ID
      return a.id.localeCompare(b.id);
    });

    return models;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to fetch Gemini models");
  }
}
