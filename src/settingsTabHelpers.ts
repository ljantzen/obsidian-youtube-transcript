import { Setting, Notice } from "obsidian";
import type { ModelInfo } from "./llm/modelFetcher";

/**
 * Populates a dropdown select element with model options
 * @param dropdown The HTML select element to populate
 * @param models Array of models to add to the dropdown
 * @param currentValue The currently selected model value
 */
export function populateModelDropdown(
  dropdown: HTMLSelectElement,
  models: ModelInfo[],
  currentValue: string,
): void {
  dropdown.empty();
  let currentValueFound = false;

  for (const model of models) {
    const option = dropdown.createEl("option");
    option.value = model.id;
    // Include model ID in display: show "Display Name (id)" or just "id" if they're the same
    const displayText =
      model.displayName && model.displayName !== model.id
        ? `${model.displayName} (${model.id})`
        : model.id;
    option.textContent = displayText;
    if (model.id === currentValue) {
      option.selected = true;
      currentValueFound = true;
    }
  }

  // If current value not found in fetched models, add it
  if (!currentValueFound && currentValue) {
    const option = dropdown.createEl("option");
    option.value = currentValue;
    option.textContent = `${currentValue} (current)`;
    option.selected = true;
  }

  // Set the value after populating
  dropdown.value = currentValue;
}

/**
 * Creates a refresh button for model dropdowns
 * @param setting The Setting instance to attach the button to
 * @param selectEl The select element to update when models are fetched
 * @param providerName Display name of the provider (e.g., "OpenAI", "Gemini")
 * @param apiKey The API key to use for fetching models
 * @param fetchFunction Function to fetch models from the API
 * @param onModelsFetched Callback when models are successfully fetched
 * @param getCurrentValue Function to get the current model value
 * @returns The created button element
 */
export function createModelRefreshButton(
  setting: Setting,
  selectEl: HTMLSelectElement,
  providerName: string,
  apiKey: string,
  fetchFunction: (key: string) => Promise<ModelInfo[]>,
  onModelsFetched: (models: ModelInfo[]) => void,
  getCurrentValue: () => string,
): HTMLButtonElement {
  const refreshButton = setting.controlEl.createEl("button", {
    text: "Refresh models",
    attr: { type: "button" },
  });
  refreshButton.addClass("mod-cta");
  refreshButton.style.marginLeft = "10px";

  refreshButton.addEventListener("click", async () => {
    if (!apiKey || apiKey.trim() === "") {
      new Notice(
        `Please enter your ${providerName} API key first before refreshing models.`,
      );
      return;
    }

    refreshButton.disabled = true;
    refreshButton.textContent = "Loading...";

    try {
      const models = await fetchFunction(apiKey);
      onModelsFetched(models);
      populateModelDropdown(selectEl, models, getCurrentValue());
      new Notice(
        `Successfully fetched ${models.length} ${providerName} model${models.length !== 1 ? "s" : ""}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      new Notice(`Failed to fetch ${providerName} models: ${errorMessage}`);
      console.error(`Failed to fetch ${providerName} models:`, error);
    } finally {
      refreshButton.disabled = false;
      refreshButton.textContent = "Refresh models";
    }
  });

  return refreshButton;
}

