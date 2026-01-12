import { App, Modal } from "obsidian";
import type { LLMProvider, YouTubeTranscriptPluginSettings } from "./types";
import { extractVideoId } from "./utils";

export class RetryConfirmationModal extends Modal {
  result: boolean | null = null;
  resolvePromise: ((value: boolean | null) => void) | null = null;
  errorMessage: string;
  providerName: string;

  constructor(app: App, errorMessage: string, providerName = "LLM") {
    super(app);
    this.errorMessage = errorMessage;
    this.providerName = providerName;
  }

  onOpen() {
    const { contentEl } = this;

    contentEl.createEl("h2", {
      text: `${this.providerName} request timed out`,
    });

    contentEl.createEl("p", {
      text: this.errorMessage,
    });

    contentEl.createEl("p", {
      text: `Would you like to retry the ${this.providerName} processing?`,
    });

    const buttonContainer = contentEl.createDiv({
      attr: { style: "text-align: right; margin-top: 1em;" },
    });

    const cancelButton = buttonContainer.createEl("button", {
      text: "Cancel",
    });
    cancelButton.onclick = () => {
      this.result = null; // null means cancelled/aborted
      if (this.resolvePromise) {
        this.resolvePromise(null);
      }
      this.close();
    };

    const retryButton = buttonContainer.createEl("button", {
      text: "Retry",
    });
    retryButton.setCssProps({ "margin-left": "0.5em" });
    retryButton.onclick = () => {
      this.result = true;
      if (this.resolvePromise) {
        this.resolvePromise(true);
      }
      this.close();
    };
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
    // If modal was closed without clicking a button (e.g., clicking X), treat as cancellation
    if (this.result === null && this.resolvePromise) {
      this.resolvePromise(null);
    }
  }

  waitForResponse(): Promise<boolean | null> {
    return new Promise((resolve) => {
      this.resolvePromise = resolve;
      this.open();
    });
  }
}

export interface YouTubeUrlModalCallbacks {
  hasProviderKey: (provider: LLMProvider) => boolean;
}

export class YouTubeUrlModal extends Modal {
  onSubmit: (
    url: string,
    createNewFile: boolean,
    includeVideoUrl: boolean,
    generateSummary: boolean,
    llmProvider: LLMProvider,
    overrideDirectory: string | null | undefined,
    tagWithChannelName: boolean,
  ) => void | Promise<void>;
  settings: YouTubeTranscriptPluginSettings;
  callbacks: YouTubeUrlModalCallbacks;

  constructor(
    app: App,
    settings: YouTubeTranscriptPluginSettings,
    callbacks: YouTubeUrlModalCallbacks,
    onSubmit: (
      url: string,
      createNewFile: boolean,
      includeVideoUrl: boolean,
      generateSummary: boolean,
      llmProvider: LLMProvider,
      overrideDirectory: string | null | undefined,
      tagWithChannelName: boolean,
    ) => void | Promise<void>,
  ) {
    super(app);
    this.settings = settings;
    this.callbacks = callbacks;
    this.onSubmit = onSubmit;
  }

  async onOpen() {
    const { contentEl } = this;

    contentEl.createEl("h2", { text: "Enter YouTube URL" });

    const input = contentEl.createEl("input", {
      type: "text",
      placeholder: "https://www.youtube.com/watch?v=... or video ID",
      attr: {
        style: "width: 100%; margin-bottom: 1em;",
      },
    });

    // Check clipboard for YouTube URL and prefill if found
    try {
      const clipboardText = await navigator.clipboard.readText();
      if (clipboardText && extractVideoId(clipboardText.trim())) {
        input.value = clipboardText.trim();
        // Select the text so user can easily replace it if needed
        input.select();
      }
    } catch (error) {
      // Clipboard access may fail due to permissions or other reasons
      // Silently ignore and continue without prefilling
      console.debug("Could not read clipboard:", error);
    }

    // Add checkbox for creating new file
    const createNewFileContainer = contentEl.createDiv({
      attr: { style: "margin-bottom: 1em;" },
    });
    const createNewFileCheckbox = createNewFileContainer.createEl("input", {
      type: "checkbox",
      attr: {
        id: "create-new-file-checkbox",
      },
    });
    createNewFileContainer.createEl("label", {
      text: "Create new file (based on video title)",
      attr: {
        for: "create-new-file-checkbox",
        style: "margin-left: 0.5em; cursor: pointer;",
      },
    });

    // Add checkbox for overriding default directory (only show if default directory is enabled)
    const overrideDirectoryContainer = contentEl.createDiv({
      attr: { style: "margin-bottom: 1em; margin-left: 1.5em;" },
    });
    const overrideDirectoryCheckbox = overrideDirectoryContainer.createEl("input", {
      type: "checkbox",
      attr: {
        id: "override-directory-checkbox",
      },
    });
    overrideDirectoryContainer.createEl("label", {
      text: "Use current file's directory instead of default",
      attr: {
        for: "override-directory-checkbox",
        style: "margin-left: 0.5em; cursor: pointer;",
      },
    });

    // Show/hide override checkbox based on createNewFile and default directory settings
    const updateOverrideVisibility = () => {
      const showOverride =
        createNewFileCheckbox.checked &&
        this.settings.useDefaultDirectory &&
        this.settings.defaultDirectory.trim() !== "";
      overrideDirectoryContainer.style.display = showOverride ? "block" : "none";
    };
    createNewFileCheckbox.addEventListener("change", updateOverrideVisibility);
    updateOverrideVisibility();

    // Add checkbox for including video URL
    const includeUrlContainer = contentEl.createDiv({
      attr: { style: "margin-bottom: 1em;" },
    });
    const includeUrlCheckbox = includeUrlContainer.createEl("input", {
      type: "checkbox",
      attr: {
        id: "include-video-url-checkbox",
      },
    });
    if (this.settings.includeVideoUrl) {
      includeUrlCheckbox.checked = true;
    }
    includeUrlContainer.createEl("label", {
      text: "Include video URL",
      attr: {
        for: "include-video-url-checkbox",
        style: "margin-left: 0.5em; cursor: pointer;",
      },
    });

    // Add checkbox for tagging with channel name
    const tagChannelContainer = contentEl.createDiv({
      attr: { style: "margin-bottom: 1em;" },
    });
    const tagChannelCheckbox = tagChannelContainer.createEl("input", {
      type: "checkbox",
      attr: {
        id: "tag-channel-checkbox",
      },
    });
    if (this.settings.tagWithChannelName) {
      tagChannelCheckbox.checked = true;
    }
    tagChannelContainer.createEl("label", {
      text: "Tag with channel name",
      attr: {
        for: "tag-channel-checkbox",
        style: "margin-left: 0.5em; cursor: pointer;",
      },
    });

    // Add checkbox for enabling LLM processing (placed before provider dropdown)
    const useLLMContainer = contentEl.createDiv({
      attr: { style: "margin-bottom: 1em;" },
    });
    const useLLMCheckbox = useLLMContainer.createEl("input", {
      type: "checkbox",
      attr: {
        id: "use-llm-checkbox",
      },
    });
    useLLMContainer.createEl("label", {
      text: "Use LLM processing",
      attr: {
        for: "use-llm-checkbox",
        style: "margin-left: 0.5em; cursor: pointer;",
      },
    });

    // Add provider selection dropdown
    const providerContainer = contentEl.createDiv({
      attr: {
        style:
          "margin-bottom: 1em; display: flex; align-items: center; gap: 0.5em;",
      },
    });
    providerContainer.createEl("label", {
      text: "LLM provider:",
      attr: {
        style: "white-space: nowrap;",
      },
    });
    const providerDropdown = providerContainer.createEl("select", {
      attr: {
        id: "llm-provider-dropdown",
        style: "flex: 1;",
      },
    });

    // Always include "None" option
    providerDropdown.add(new Option("None (raw transcript)", "none"));

    // Only add providers that have configured API keys
    if (this.callbacks.hasProviderKey("openai")) {
      providerDropdown.add(new Option("OpenAI", "openai"));
    }
    if (this.callbacks.hasProviderKey("gemini")) {
      providerDropdown.add(new Option("Google Gemini", "gemini"));
    }
    if (this.callbacks.hasProviderKey("claude")) {
      providerDropdown.add(new Option("Anthropic Claude", "claude"));
    }

    // Set default value, fallback to "none" if current provider doesn't have a key
    const currentProvider = this.settings.llmProvider || "none";
    const hasCurrentProviderKey =
      currentProvider === "none" ||
      this.callbacks.hasProviderKey(currentProvider);
    providerDropdown.value = hasCurrentProviderKey ? currentProvider : "none";

    // Default LLM checkbox to checked if a provider is selected and has a key
    if (hasCurrentProviderKey && currentProvider !== "none") {
      useLLMCheckbox.checked = true;
    }

    // Add checkbox for generating summary (must be defined before updateLLMDependentControls)
    const generateSummaryContainer = contentEl.createDiv({
      attr: { style: "margin-bottom: 1em;" },
    });
    const generateSummaryCheckbox = generateSummaryContainer.createEl("input", {
      type: "checkbox",
      attr: {
        id: "generate-summary-checkbox",
      },
    });
    if (this.settings.generateSummary) {
      generateSummaryCheckbox.checked = true;
    }

    const generateSummaryLabel = generateSummaryContainer.createEl("label", {
      text: `Generate summary`,
      attr: {
        for: "generate-summary-checkbox",
        style: "margin-left: 0.5em; cursor: pointer;",
      },
    });

    // Disable provider dropdown and summary checkbox when LLM processing is unchecked
    const updateLLMDependentControls = () => {
      const llmEnabled = useLLMCheckbox.checked;
      providerDropdown.disabled = !llmEnabled;
      generateSummaryCheckbox.disabled = !llmEnabled;
      // Uncheck summary if LLM is disabled
      if (!llmEnabled) {
        generateSummaryCheckbox.checked = false;
      }
    };
    useLLMCheckbox.addEventListener("change", updateLLMDependentControls);
    updateLLMDependentControls();

    // Update summary label based on selected provider
    const updateSummaryLabel = () => {
      generateSummaryLabel.textContent = `Generate summary`;
    };

    providerDropdown.addEventListener("change", updateSummaryLabel);

    const buttonContainer = contentEl.createDiv({
      attr: { style: "text-align: right;" },
    });

    const cancelButton = buttonContainer.createEl("button", { text: "Cancel" });
    cancelButton.onclick = () => this.close();

    const submitButton = buttonContainer.createEl("button", {
      text: "Fetch transcript",
    });
    submitButton.setCssProps({ "margin-left": "0.5em" });
    submitButton.onclick = () => {
      const url = input.value.trim();
      if (url) {
        const createNewFile = createNewFileCheckbox.checked;
        const includeVideoUrl = includeUrlCheckbox.checked;
        const generateSummary = generateSummaryCheckbox.checked;
        const useLLM = useLLMCheckbox.checked;
        // If LLM processing is disabled, use "none" regardless of dropdown selection
        const llmProvider = useLLM
          ? (providerDropdown.value as LLMProvider)
          : "none";
        const tagWithChannelName = tagChannelCheckbox.checked;
        // Determine override directory:
        // - If default directory is enabled and override checkbox is checked: use current file's directory (pass undefined)
        // - If default directory is enabled and override checkbox is unchecked: use default directory (pass null)
        // - Otherwise: use current file's directory (pass undefined)
        let overrideDirectory: string | null | undefined = undefined;
        if (
          createNewFile &&
          this.settings.useDefaultDirectory &&
          this.settings.defaultDirectory.trim() !== ""
        ) {
          overrideDirectory = overrideDirectoryCheckbox.checked
            ? undefined // Use current file's directory
            : null; // Use default directory
        }
        void this.onSubmit(
          url,
          createNewFile,
          includeVideoUrl,
          generateSummary,
          llmProvider,
          overrideDirectory,
          tagWithChannelName,
        );
        this.close();
      }
    };

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const url = input.value.trim();
        if (url) {
          const createNewFile = createNewFileCheckbox.checked;
          const includeVideoUrl = includeUrlCheckbox.checked;
          const generateSummary = generateSummaryCheckbox.checked;
          const useLLM = useLLMCheckbox.checked;
          // If LLM processing is disabled, use "none" regardless of dropdown selection
          const llmProvider = useLLM
            ? (providerDropdown.value as LLMProvider)
            : "none";
          const tagWithChannelName = tagChannelCheckbox.checked;
          // Determine override directory:
          // - If default directory is enabled and override checkbox is checked: use current file's directory (pass undefined)
          // - If default directory is enabled and override checkbox is unchecked: use default directory (pass null)
          // - Otherwise: use current file's directory (pass undefined)
          let overrideDirectory: string | null | undefined = undefined;
          if (
            createNewFile &&
            this.settings.useDefaultDirectory &&
            this.settings.defaultDirectory.trim() !== ""
          ) {
            overrideDirectory = overrideDirectoryCheckbox.checked
              ? undefined // Use current file's directory
              : null; // Use default directory
          }
          void this.onSubmit(
            url,
            createNewFile,
            includeVideoUrl,
            generateSummary,
            llmProvider,
            overrideDirectory,
            tagWithChannelName,
          );
          this.close();
        }
      }
    });

    input.focus();
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
