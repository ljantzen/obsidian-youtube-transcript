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
    selectedDirectory: string | null,
    tagWithChannelName: boolean,
    fileFormat: "markdown" | "pdf",
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
      selectedDirectory: string | null,
      tagWithChannelName: boolean,
      fileFormat: "markdown" | "pdf",
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
    // Set default value from settings
    if (this.settings.createNewFile) {
      createNewFileCheckbox.checked = true;
    }
    createNewFileContainer.createEl("label", {
      text: "Create new file (based on video title)",
      attr: {
        for: "create-new-file-checkbox",
        style: "margin-left: 0.5em; cursor: pointer;",
      },
    });

    // Add directory selector dropdown (only show when creating new file)
    const directoryContainer = contentEl.createDiv({
      attr: {
        style:
          "margin-bottom: 1em; margin-left: 1.5em; display: flex; align-items: center; gap: 0.5em;",
      },
    });
    directoryContainer.createEl("label", {
      text: "Directory:",
      attr: {
        style: "white-space: nowrap;",
      },
    });
    const directoryDropdown = directoryContainer.createEl("select", {
      attr: {
        id: "directory-dropdown",
        style: "flex: 1; min-width: 200px;",
      },
    });

    // Add "Current directory" option
    directoryDropdown.add(new Option("Current directory", ""));

    // Add saved directories
    const savedDirs = this.settings.savedDirectories || [];
    savedDirs.forEach((dir) => {
      if (dir && dir.trim() !== "") {
        directoryDropdown.add(new Option(dir, dir));
      }
    });

    // Set default directory if configured
    if (this.settings.defaultDirectory) {
      // Check if the default directory is in the saved directories
      if (savedDirs.includes(this.settings.defaultDirectory)) {
        directoryDropdown.value = this.settings.defaultDirectory;
      }
    }

    // Add file format selector (only show when creating new file)
    const fileFormatContainer = contentEl.createDiv({
      attr: {
        style:
          "margin-bottom: 1em; margin-left: 1.5em; display: flex; align-items: center; gap: 0.5em;",
      },
    });
    fileFormatContainer.createEl("label", {
      text: "File format:",
      attr: {
        style: "white-space: nowrap;",
      },
    });
    const fileFormatDropdown = fileFormatContainer.createEl("select", {
      attr: {
        id: "file-format-dropdown",
        style: "flex: 1; min-width: 150px;",
      },
    });
    fileFormatDropdown.add(new Option("Markdown", "markdown"));
    fileFormatDropdown.add(new Option("PDF", "pdf"));
    fileFormatDropdown.value = this.settings.fileFormat || "markdown";
    
    // Note: PDF generation requires Electron API access
    // If it fails, users will see an error message

    // Show/hide directory and file format dropdowns based on createNewFile checkbox
    const updateCreateNewFileVisibility = () => {
      const show = createNewFileCheckbox.checked;
      directoryContainer.style.display = show ? "flex" : "none";
      fileFormatContainer.style.display = show ? "flex" : "none";
    };
    createNewFileCheckbox.addEventListener("change", updateCreateNewFileVisibility);
    updateCreateNewFileVisibility();

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

    // Check if any LLM provider is configured
    const hasAnyProviderKey =
      this.callbacks.hasProviderKey("openai") ||
      this.callbacks.hasProviderKey("gemini") ||
      this.callbacks.hasProviderKey("claude");

    // Only show LLM-related options if at least one provider is configured
    let useLLMCheckbox: HTMLInputElement | null = null;
    let providerDropdown: HTMLSelectElement | null = null;
    let generateSummaryCheckbox: HTMLInputElement | null = null;

    if (hasAnyProviderKey) {
      // Add checkbox for enabling LLM processing (placed before provider dropdown)
      const useLLMContainer = contentEl.createDiv({
        attr: { style: "margin-bottom: 1em;" },
      });
      useLLMCheckbox = useLLMContainer.createEl("input", {
        type: "checkbox",
        attr: {
          id: "use-llm-checkbox",
        },
      }) as HTMLInputElement;
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
      providerDropdown = providerContainer.createEl("select", {
        attr: {
          id: "llm-provider-dropdown",
          style: "flex: 1;",
        },
      }) as HTMLSelectElement;

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
      generateSummaryCheckbox = generateSummaryContainer.createEl("input", {
        type: "checkbox",
        attr: {
          id: "generate-summary-checkbox",
        },
      }) as HTMLInputElement;
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
        const llmEnabled = useLLMCheckbox!.checked;
        providerDropdown!.disabled = !llmEnabled;
        generateSummaryCheckbox!.disabled = !llmEnabled;
        // Uncheck summary if LLM is disabled
        if (!llmEnabled) {
          generateSummaryCheckbox!.checked = false;
        }
      };
      useLLMCheckbox.addEventListener("change", updateLLMDependentControls);
      updateLLMDependentControls();

      // Update summary label based on selected provider
      const updateSummaryLabel = () => {
        generateSummaryLabel.textContent = `Generate summary`;
      };

      providerDropdown.addEventListener("change", updateSummaryLabel);
    }

    const buttonContainer = contentEl.createDiv({
      attr: { style: "text-align: right;" },
    });

    const cancelButton = buttonContainer.createEl("button", { text: "Cancel" });
    cancelButton.addEventListener("click", () => this.close());

    const submitButton = buttonContainer.createEl("button", {
      text: "Fetch transcript",
    });
    submitButton.setCssProps({ "margin-left": "0.5em" });
    submitButton.addEventListener("click", () => {
      try {
        const url = input.value.trim();
        if (!url) {
          return;
        }
        const createNewFile = createNewFileCheckbox.checked;
        const includeVideoUrl = includeUrlCheckbox.checked;
        const generateSummary = hasAnyProviderKey && generateSummaryCheckbox
          ? generateSummaryCheckbox.checked
          : false;
        const useLLM = hasAnyProviderKey && useLLMCheckbox
          ? useLLMCheckbox.checked
          : false;
        // If LLM processing is disabled or no providers configured, use "none"
        const llmProvider = hasAnyProviderKey && useLLM && providerDropdown
          ? (providerDropdown.value as LLMProvider)
          : "none";
        const tagWithChannelName = tagChannelCheckbox.checked;
        // Get selected directory from dropdown
        // Empty string = current directory, non-empty = specific directory
        const selectedDirectory = createNewFile
          ? (directoryDropdown.value === "" ? null : directoryDropdown.value)
          : null;
        // Get file format
        const fileFormat = createNewFile
          ? (fileFormatDropdown.value as "markdown" | "pdf")
          : "markdown";
        void this.onSubmit(
          url,
          createNewFile,
          includeVideoUrl,
          generateSummary,
          llmProvider,
          selectedDirectory,
          tagWithChannelName,
          fileFormat,
        );
        this.close();
      } catch (error) {
        console.error("Error in submit button handler:", error);
      }
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const url = input.value.trim();
        if (url) {
          const createNewFile = createNewFileCheckbox.checked;
          const includeVideoUrl = includeUrlCheckbox.checked;
          const generateSummary = hasAnyProviderKey && generateSummaryCheckbox
            ? generateSummaryCheckbox.checked
            : false;
          const useLLM = hasAnyProviderKey && useLLMCheckbox
            ? useLLMCheckbox.checked
            : false;
          // If LLM processing is disabled or no providers configured, use "none"
          const llmProvider = hasAnyProviderKey && useLLM && providerDropdown
            ? (providerDropdown.value as LLMProvider)
            : "none";
          const tagWithChannelName = tagChannelCheckbox.checked;
          // Get selected directory from dropdown
          // Empty string = current directory, non-empty = specific directory
          const selectedDirectory = createNewFile
            ? (directoryDropdown.value === "" ? null : directoryDropdown.value)
            : null;
          // Get file format
          const fileFormat = createNewFile
            ? (fileFormatDropdown.value as "markdown" | "pdf")
            : "markdown";
          void this.onSubmit(
            url,
            createNewFile,
            includeVideoUrl,
            generateSummary,
            llmProvider,
            selectedDirectory,
            tagWithChannelName,
            fileFormat,
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
