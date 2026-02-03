import { App, PluginSettingTab, Setting, Notice, Plugin } from "obsidian";
import type { YouTubeTranscriptPluginSettings, LLMProvider, CustomLLMProvider } from "./types";
import {
  DEFAULT_SETTINGS,
  DEFAULT_PROMPT,
  DEFAULT_OPENAI_MODELS,
  DEFAULT_GEMINI_MODELS,
} from "./settings";
import { validateClaudeModelName } from "./utils";
import {
  fetchOpenAIModels,
  fetchGeminiModels,
  type ModelInfo,
} from "./llm/modelFetcher";
import { FolderSuggest, FileSuggest } from "./suggester";
import {
  populateModelDropdown,
  createModelRefreshButton,
} from "./settingsTabHelpers";

export class YouTubeTranscriptSettingTab extends PluginSettingTab {
  plugin: Plugin;
  settings: YouTubeTranscriptPluginSettings;
  saveSettings: () => Promise<void>;
  cachedOpenAIModels: ModelInfo[] | null = null;
  cachedGeminiModels: ModelInfo[] | null = null;

  constructor(
    app: App,
    plugin: Plugin,
    settings: YouTubeTranscriptPluginSettings,
    saveSettings: () => Promise<void>,
  ) {
    super(app, plugin);
    this.plugin = plugin;
    this.settings = settings;
    this.saveSettings = saveSettings;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl).setName("YouTube transcript").setHeading();

    // Refresh model lists automatically on initialization
    void this.refreshModelLists();

    // Display plugin version
    const version = this.plugin.manifest.version;
    new Setting(containerEl)
      .setName("Version")
      .setDesc(`Plugin version: ${version}`)
      .setDisabled(true);

    // Files and folders section
    new Setting(containerEl).setName("Files and folders").setHeading();

    new Setting(containerEl)
      .setName("Default file format")
      .setDesc(
        "Default file format for new transcript files (can be overridden in the modal)",
      )
      .addDropdown((dropdown) => {
        dropdown
          .addOption("markdown", "Markdown")
          .addOption("pdf", "PDF")
          .setValue(this.settings.fileFormat || "markdown")
          .onChange(async (value) => {
            this.settings.fileFormat = value as "markdown" | "pdf";
            await this.saveSettings();
          });
      });

    new Setting(containerEl).setName("Transcript directories").setHeading();

    // Default directory selection (only show if there are saved directories)
    const savedDirs = this.settings.savedDirectories || [];
    if (savedDirs.length > 0) {
      new Setting(containerEl)
        .setName("Default directory")
        .setDesc(
          "Select which saved directory to use by default when creating new transcript files. Leave as 'None' to use the current file's directory.",
        )
        .addDropdown((dropdown) => {
          dropdown.addOption("", "None (use current file's directory)");
          savedDirs.forEach((dir) => {
            if (dir && dir.trim() !== "") {
              dropdown.addOption(dir, dir);
            }
          });
          dropdown
            .setValue(this.settings.defaultDirectory || "")
            .onChange(async (value) => {
              this.settings.defaultDirectory = value === "" ? null : value;
              await this.saveSettings();
              // Refresh the display to update the default indicator
              this.display();
            });
        });
    }

    new Setting(containerEl)
      .setName("Manage directories")
      .setDesc(
        "Add directories to the list. These will appear in the modal dropdown when creating new transcript files.",
      );

    // Display current saved directories with remove buttons
    const directoriesList = containerEl.createDiv({
      attr: { style: "margin-bottom: 1em;" },
    });

    const renderDirectoriesList = () => {
      directoriesList.empty();
      const savedDirs = this.settings.savedDirectories || [];
      const defaultDir = this.settings.defaultDirectory;
      if (savedDirs.length === 0) {
        directoriesList.createEl("p", {
          text: "No directories saved. Add one below.",
          attr: { style: "color: var(--text-muted); font-style: italic;" },
        });
      } else {
        savedDirs.forEach((dir, index) => {
          const dirItem = directoriesList.createDiv({
            attr: {
              style:
                "display: flex; align-items: center; gap: 0.5em; margin-bottom: 0.5em;",
            },
          });
          dirItem.createEl("span", {
            text: dir,
            attr: { style: "flex: 1; font-family: monospace;" },
          });
          // Show default indicator
          if (defaultDir === dir) {
            dirItem.createEl("span", {
              text: "(Default)",
              attr: {
                style:
                  "color: var(--text-accent); font-size: 0.9em; font-weight: 500;",
              },
            });
          }
          const removeButton = dirItem.createEl("button", {
            text: "Remove",
            attr: { style: "font-size: 0.9em;" },
          });
          removeButton.onclick = async () => {
            // If removing the default directory, clear the default
            if (defaultDir === dir) {
              this.settings.defaultDirectory = null;
            }
            this.settings.savedDirectories = savedDirs.filter(
              (_, i) => i !== index,
            );
            await this.saveSettings();
            // Refresh the entire display to update the default directory dropdown
            this.display();
          };
        });
      }
    };

    renderDirectoriesList();

    // Add new directory input
    const addDirectoryContainer = containerEl.createDiv({
      attr: {
        style: "display: flex; align-items: center; gap: 0.5em; margin-bottom: 1em;",
      },
    });
    const addDirectoryInput = addDirectoryContainer.createEl("input", {
      type: "text",
      attr: {
        placeholder: "Transcripts or Notes/YouTube",
        style: "flex: 1;",
      },
    });
    new FolderSuggest(this.app, addDirectoryInput);
    const addButton = addDirectoryContainer.createEl("button", {
      text: "Add",
    });
    addButton.onclick = async () => {
      const newDir = addDirectoryInput.value.trim();
      if (newDir && newDir !== "") {
        // Normalize path: remove leading/trailing slashes, ensure forward slashes
        const normalizedDir = newDir
          .replace(/^\/+|\/+$/g, "")
          .replace(/\\/g, "/");
        const savedDirs = this.settings.savedDirectories || [];
        if (!savedDirs.includes(normalizedDir)) {
          this.settings.savedDirectories = [...savedDirs, normalizedDir];
          await this.saveSettings();
          addDirectoryInput.value = "";
          // Refresh the entire display to update the default directory dropdown
          this.display();
        }
      }
    };

    // Transcript section
    new Setting(containerEl).setName("Transcript").setHeading();

    new Setting(containerEl)
      .setName("Create new markdown file")
      .setDesc(
        "When enabled, the modal will default to creating a new markdown file instead of inserting into the current file (can be overridden in the modal.  If PDF is selected as output format, this setting is ignored, as PDF files will always be created.)",
      )
      .addToggle((toggle) => {
        toggle
          .setValue(this.settings.createNewFile ?? false)
          .onChange(async (value) => {
            this.settings.createNewFile = value;
            await this.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Default note name")
      .setDesc(
        "Template for note file names. Supports {VideoName} and {ChannelName} variables.",
      )
      .addText((text) => {
        text
          .setPlaceholder("{VideoName}")
          .setValue(this.settings.defaultNoteName || "{VideoName}")
          .onChange(async (value) => {
            this.settings.defaultNoteName = value || "{VideoName}";
            await this.saveSettings();
          });
      });


    new Setting(containerEl)
      .setName("Preferred languages")
      .setDesc(
        "Comma-separated list of preferred transcript language codes in order of preference (e.g., 'en,es,fr' for English, then Spanish, then French). Languages will be tried in order until one is available. Leave empty for auto-select (prefers English). You can override this in the modal when multiple languages are available.",
      )
      .addText((text) => {
        text
          .setPlaceholder("en,es,fr")
          .setValue(this.settings.preferredLanguage || "")
          .onChange(async (value) => {
            // Normalize: trim, lowercase, remove extra spaces
            const normalizedValue = value
              .split(",")
              .map((lang) => lang.trim().toLowerCase())
              .filter((lang) => lang.length > 0)
              .join(",");
            this.settings.preferredLanguage = normalizedValue;
            await this.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Include video URL")
      .setDesc(
        "When enabled, the video URL will be included in the transcript (can be overridden in the modal)",
      )
      .addToggle((toggle) => {
        toggle
          .setValue(this.settings.includeVideoUrl)
          .onChange(async (value) => {
            this.settings.includeVideoUrl = value;
            await this.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Generate summary")
      .setDesc(
        "When enabled and an LLM provider is selected, generate a summary of the video (can be overridden in the modal)",
      )
      .addToggle((toggle) => {
        toggle
          .setValue(this.settings.generateSummary)
          .onChange(async (value) => {
            this.settings.generateSummary = value;
            await this.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Tag with channel name")
      .setDesc(
        "When enabled, notes will be tagged with the YouTube channel name (can be overridden in the modal)",
      )
      .addToggle((toggle) => {
        toggle
          .setValue(this.settings.tagWithChannelName)
          .onChange(async (value) => {
            this.settings.tagWithChannelName = value;
            await this.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Single line transcript")
      .setDesc(
        "When enabled, the transcript will be kept on a single line without line breaks. Timestamps (if enabled) will be inline. Useful for compact formatting or when copying to other applications.",
      )
      .addToggle((toggle) => {
        toggle
          .setValue(this.settings.singleLineTranscript ?? false)
          .onChange(async (value) => {
            this.settings.singleLineTranscript = value;
            await this.saveSettings();
          });
      });

    // Timestamp section
    new Setting(containerEl).setName("Timestamp").setHeading();

    new Setting(containerEl)
      .setName("Include timestamps")
      .setDesc(
        "When enabled, timestamps will be included in transcripts as clickable links to the video at that time",
      )
      .addToggle((toggle) => {
        toggle
          .setValue(this.settings.includeTimestamps)
          .onChange(async (value) => {
            this.settings.includeTimestamps = value;
            await this.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Timestamp frequency")
      .setDesc(
        "How often to show timestamps: 0 = every sentence, >0 = every N seconds (e.g., 30 = every 30 seconds)",
      )
      .addText((text) => {
        text.inputEl.type = "number";
        text
          .setPlaceholder("0")
          .setValue(this.settings.timestampFrequency?.toString() || "0")
          .onChange(async (value) => {
            const frequency = parseInt(value, 10);
            if (!isNaN(frequency) && frequency >= 0) {
              this.settings.timestampFrequency = frequency;
              await this.saveSettings();
            }
          });
      });

    new Setting(containerEl)
      .setName("Include timestamps in LLM output")
      .setDesc(
        "When enabled, timestamps will be preserved in LLM-processed transcripts. When disabled, timestamps are removed before LLM processing.",
      )
      .addToggle((toggle) => {
        toggle
          .setValue(this.settings.includeTimestampsInLLM)
          .onChange(async (value) => {
            this.settings.includeTimestampsInLLM = value;
            await this.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Local video directory")
      .setDesc(
        "Filesystem directory where local video files are stored. If set, timestamp links will point to local files (file:///path/video-id.mp4?t=SECONDS) instead of YouTube URLs. Leave empty to use YouTube URLs.",
      )
      .addText((text) => {
        text
          .setPlaceholder("/path/to/videos")
          .setValue(this.settings.localVideoDirectory || "")
          .onChange(async (value) => {
            // Normalize path: remove trailing slashes, ensure forward slashes
            const normalizedPath = value
              .trim()
              .replace(/\\/g, "/")
              .replace(/\/+$/, "");
            this.settings.localVideoDirectory = normalizedPath;
            await this.saveSettings();
          });
      });

    // PDF section
    new Setting(containerEl).setName("PDF").setHeading();

    new Setting(containerEl)
      .setName("Create PDF cover note")
      .setDesc("When enabled, a cover note will be created for PDF files")
      .addToggle((toggle) => {
        toggle
          .setValue(this.settings.createPdfCoverNote ?? false)
          .onChange(async (value) => {
            this.settings.createPdfCoverNote = value;
            await this.saveSettings();
          });
      });


    new Setting(containerEl)
      .setName("Default cover note name")
      .setDesc(
        "Template for cover note file names (when PDF cover notes are enabled). Supports {VideoName}, {ChannelName}, and {PdfDirectory} variables.",
      )
      .addText((text) => {
        text
          .setPlaceholder("{VideoName}")
          .setValue(this.settings.defaultCoverNoteName || "{VideoName}")
          .onChange(async (value) => {
            this.settings.defaultCoverNoteName = value || "{VideoName}";
            await this.saveSettings();
          });
      });


    new Setting(containerEl)
      .setName("PDF cover note location")
      .setDesc(
        "Location/path where PDF cover notes should be created. Leave empty to use the same location as the PDF file. Uses the FolderSuggest and supports '{ChannelName}' and '{VideoName}' template variables",
      )
      .addText((text) => {
        text
          .setPlaceholder("Notes/PDF Covers or Notes/{ChannelName}")
          .setValue(this.settings.pdfCoverNoteLocation || "")
          .onChange(async (value) => {
            // Normalize path: remove leading/trailing slashes, ensure forward slashes
            const normalizedPath = value
              .trim()
              .replace(/^\/+|\/+$/g, "")
              .replace(/\\/g, "/");
            this.settings.pdfCoverNoteLocation = normalizedPath;
            await this.saveSettings();
          });
        new FolderSuggest(this.app, text.inputEl);
      });

    new Setting(containerEl)
      .setName("PDF cover note template")
      .setDesc(
        "Path to a markdown template file for PDF cover notes. Leave empty to use the default template. Supports template variables: {ChannelName}, {VideoName}, {VideoUrl}, {Summary}, {PdfLink}, {VideoId}, {LengthSeconds}, {ViewCount}, {PublishDate}, {Description}, {ChannelId}, {IsLive}, {IsPrivate}, {IsUnlisted}, and {VideoDetails.*} for any videoDetails field.",
      )
      .addText((text) => {
        text
          .setPlaceholder("Templates/PDF Cover Note.md")
          .setValue(this.settings.pdfCoverNoteTemplate || "")
          .onChange(async (value) => {
            // Normalize path: remove leading/trailing slashes, ensure forward slashes
            const normalizedPath = value
              .trim()
              .replace(/^\/+|\/+$/g, "")
              .replace(/\\/g, "/");
            this.settings.pdfCoverNoteTemplate = normalizedPath;
            await this.saveSettings();
          });
        new FileSuggest(this.app, text.inputEl);
      });

    new Setting(containerEl)
      .setName("PDF attachment folder name")
      .setDesc(
        "Name of the folder to nest PDFs under when 'Use attachment folder for PDFs' and 'Create PDF cover note' are both enabled. Leave empty to use the PDF filename (without extension) as the folder name. Supports template variables: {ChannelName} and {VideoName}.",
      )
      .addText((text) => {
        text
          .setPlaceholder("attachments or {VideoName}")
          .setValue(this.settings.pdfAttachmentFolderName || "")
          .onChange(async (value) => {
            // Normalize: remove leading/trailing slashes, ensure forward slashes
            const normalizedPath = value
              .trim()
              .replace(/^\/+|\/+$/g, "")
              .replace(/\\/g, "/");
            this.settings.pdfAttachmentFolderName = normalizedPath;
            await this.saveSettings();
          });
      });

    // LLM section
    new Setting(containerEl).setName("LLM").setHeading();

    new Setting(containerEl)
      .setName("Use LLM processing")
      .setDesc("When enabled, transcripts will be processed by the selected LLM provider to clean up and format the content")
      .addToggle((toggle) =>
        toggle
          .setValue(this.settings.useLLMProcessing ?? false)
          .onChange(async (value) => {
            this.settings.useLLMProcessing = value;
            await this.saveSettings();
            // Refresh the settings display to show/hide LLM-related fields
            this.display();
          })
      );

    // Only show LLM provider settings if LLM processing is enabled
    if (this.settings.useLLMProcessing) {
      new Setting(containerEl)
        .setName("LLM provider")
        .setDesc("Select which LLM provider to use for transcript processing")
        .addDropdown((dropdown) => {
          dropdown
            .addOption("openai", "OpenAI")
            .addOption("gemini", "Google Gemini")
            .addOption("claude", "Anthropic Claude");

          // Add custom providers to the dropdown
          const customProviders = this.settings.customProviders || [];
          if (customProviders.length > 0) {
            customProviders.forEach((provider) => {
              dropdown.addOption(provider.id, `${provider.name} (Custom)`);
            });
          }

          dropdown
            .setValue(this.settings.llmProvider || "openai")
            .onChange(async (value: LLMProvider) => {
              this.settings.llmProvider = value;
              await this.saveSettings();
              // Refresh the settings display to show/hide relevant API key fields
              this.display();
            });
        });


      // Show OpenAI API key field if OpenAI is selected
      if (this.settings.llmProvider === "openai") {
        new Setting(containerEl)
          .setName("OpenAI API key")
          .setDesc(
            "Your OpenAI API key for processing transcripts (get one at https://platform.openai.com/api-keys)",
          )
          .addText((text) => {
            text.inputEl.type = "password";
            text
              .setPlaceholder("sk-...")
              .setValue(this.settings.openaiKey)
              .onChange(async (value) => {
                this.settings.openaiKey = value;
                await this.saveSettings();
              });
          });

        this.createOpenAIModelSetting(containerEl);
      }

      // Show Gemini API key field if Gemini is selected
      if (this.settings.llmProvider === "gemini") {
        new Setting(containerEl)
          .setName("Gemini API key")
          .setDesc(
            "Your Google Gemini API key for processing transcripts (get one at https://aistudio.google.com/app/apikey)",
          )
        .addText((text) => {
          text.inputEl.type = "password";
          text
            .setPlaceholder("AIza...")
            .setValue(this.settings.geminiKey)
            .onChange(async (value) => {
              this.settings.geminiKey = value;
              await this.saveSettings();
            });
        });

      this.createGeminiModelSetting(containerEl);
    }

      // Show Claude API key field if Claude is selected
      if (this.settings.llmProvider === "claude") {
        new Setting(containerEl)
          .setName("Claude API key")
          .setDesc(
            "Your Anthropic Claude API key for processing transcripts (get one at https://console.anthropic.com/)",
          )
          .addText((text) => {
            text.inputEl.type = "password";
            text
              .setPlaceholder("sk-ant-...")
              .setValue(this.settings.claudeKey)
              .onChange(async (value) => {
                this.settings.claudeKey = value;
                await this.saveSettings();
              });
          });

        new Setting(containerEl)
          .setName("Claude model")
          .setDesc(
            "Enter the Claude model ID to use for transcript processing. Examples: claude-opus-4-1-20250805, claude-sonnet-4-20250514, claude-haiku-4-5-20251001, or simplified versions like claude-opus-4, claude-sonnet-4, claude-haiku-4-5. Only Claude version 4 models are supported.",
          )
          .addText((text) => {
            text
              .setPlaceholder("claude-sonnet-4-20250514")
              .setValue(this.settings.claudeModel || DEFAULT_SETTINGS.claudeModel)
              .onChange(async (value) => {
                const trimmedValue = value.trim();
                if (trimmedValue === "") {
                  // Allow empty to use default
                  this.settings.claudeModel = DEFAULT_SETTINGS.claudeModel;
                  await this.saveSettings();
                } else if (validateClaudeModelName(trimmedValue)) {
                  this.settings.claudeModel = trimmedValue;
                  await this.saveSettings();
                } else {
                  new Notice(
                    `Invalid Claude model name: "${trimmedValue}". Must be a Claude version 4 model (e.g., claude-opus-4-1-20250805, claude-sonnet-4-20250514, claude-haiku-4-5-20251001).`,
                  );
                }
              });
          });
      }

      const promptSetting = new Setting(containerEl)
        .setName("Processing prompt")
        .setDesc("The prompt sent to the LLM for processing the transcript");

      const textarea = promptSetting.controlEl.createEl("textarea", {
        attr: {
          placeholder: DEFAULT_PROMPT,
          rows: "10",
        },
      });
      textarea.setCssProps({ width: "100%" });
      textarea.value = this.settings.prompt;
      textarea.addEventListener("input", (e) => {
        const target = e.target as HTMLTextAreaElement;
        this.settings.prompt = target.value;
        void this.saveSettings();
      });

      new Setting(containerEl)
        .setName("LLM timeout")
        .setDesc(
          "Timeout for LLM API requests in minutes (default: 1 minute / 60 seconds)",
        )
        .addText((text) => {
          text.inputEl.type = "number";
          text
            .setPlaceholder("5")
            .setValue(this.settings.openaiTimeout.toString())
            .onChange(async (value) => {
              const timeout = parseInt(value, 10);
              if (!isNaN(timeout) && timeout > 0) {
                this.settings.openaiTimeout = timeout;
                await this.saveSettings();
              }
            });
        });

      new Setting(containerEl)
        .setName("Force LLM output language")
        .setDesc(
          "When enabled, the LLM will be instructed to output in the same language as the selected transcript language. This ensures the processed transcript matches the original language.",
        )
        .addToggle((toggle) => {
          toggle
            .setValue(this.settings.forceLLMLanguage ?? false)
            .onChange(async (value) => {
              this.settings.forceLLMLanguage = value;
              await this.saveSettings();
            });
        });
      
      // Custom Providers Section
      new Setting(containerEl)
        .setName("Custom LLM Providers")
        .setDesc(
          "Add custom LLM providers (e.g., OpenRouter, Ollama, local models). These providers must use OpenAI-compatible API format.",
        )
        .setHeading();

      this.renderCustomProvidersList(containerEl);

      // Add Custom Provider Button
      new Setting(containerEl).addButton((button) => {
        button
          .setButtonText("Add custom provider")
          .setCta()
          .onClick(() => {
            this.showAddCustomProviderModal(containerEl);
          });
      });
    } // End of if (this.settings.useLLMProcessing)
  }

  /**
   * Refreshes model lists automatically on initialization
   * Validates that selected models are still available
   */
  private async refreshModelLists(): Promise<void> {
    // Refresh OpenAI models if API key is available
    if (this.settings.openaiKey && this.settings.openaiKey.trim() !== "") {
      try {
        const models = await fetchOpenAIModels(this.settings.openaiKey);
        this.cachedOpenAIModels = models;
        // Validate selected model is available
        const currentModel =
          this.settings.openaiModel || DEFAULT_SETTINGS.openaiModel;
        const modelExists = models.some((m) => m.id === currentModel);
        if (!modelExists) {
          // Fallback to default if current model is not available
          this.settings.openaiModel = DEFAULT_SETTINGS.openaiModel;
          await this.saveSettings();
        }
      } catch (error) {
        // Silently fail - user can manually refresh if needed
        console.debug("Failed to auto-refresh OpenAI models:", error);
      }
    }

    // Refresh Gemini models if API key is available
    if (this.settings.geminiKey && this.settings.geminiKey.trim() !== "") {
      try {
        const models = await fetchGeminiModels(this.settings.geminiKey);
        this.cachedGeminiModels = models;
        // Validate selected model is available
        const currentModel =
          this.settings.geminiModel || DEFAULT_SETTINGS.geminiModel;
        const modelExists = models.some((m) => m.id === currentModel);
        if (!modelExists) {
          // Fallback to default if current model is not available
          this.settings.geminiModel = DEFAULT_SETTINGS.geminiModel;
          await this.saveSettings();
        }
      } catch (error) {
        // Silently fail - user can manually refresh if needed
        console.debug("Failed to auto-refresh Gemini models:", error);
      }
    }
  }

  /**
   * Creates the OpenAI model selection setting with refresh functionality
   */
  private createOpenAIModelSetting(containerEl: HTMLElement): void {
    const setting = new Setting(containerEl)
      .setName("OpenAI model")
      .setDesc("Select the OpenAI model to use for transcript processing");

    const modelsToUse = this.cachedOpenAIModels || DEFAULT_OPENAI_MODELS;
    let currentValue =
      this.settings.openaiModel || DEFAULT_SETTINGS.openaiModel;

    // Ensure current model is available in the list
    const modelExists = modelsToUse.some((m) => m.id === currentValue);
    if (!modelExists) {
      // Fallback to default if current model is not available
      currentValue = DEFAULT_SETTINGS.openaiModel;
      this.settings.openaiModel = currentValue;
      void this.saveSettings();
    }

    setting.addDropdown((dropdown) => {
      populateModelDropdown(dropdown.selectEl, modelsToUse, currentValue);
      dropdown.onChange(async (value) => {
        this.settings.openaiModel = value;
        await this.saveSettings();
      });
    });

    const selectEl = setting.controlEl.querySelector(
      "select",
    ) as HTMLSelectElement;

    if (selectEl) {
      createModelRefreshButton(
        setting,
        selectEl,
        "OpenAI",
        this.settings.openaiKey,
        fetchOpenAIModels,
        (models) => {
          this.cachedOpenAIModels = models;
        },
        () => this.settings.openaiModel || DEFAULT_SETTINGS.openaiModel,
      );
    }
  }

  /**
   * Creates the Gemini model selection setting with refresh functionality
   */
  private createGeminiModelSetting(containerEl: HTMLElement): void {
    const setting = new Setting(containerEl)
      .setName("Gemini model")
      .setDesc("Select the Gemini model to use for transcript processing");

    const modelsToUse = this.cachedGeminiModels || DEFAULT_GEMINI_MODELS;
    let currentValue =
      this.settings.geminiModel || DEFAULT_SETTINGS.geminiModel;

    // Ensure current model is available in the list
    const modelExists = modelsToUse.some((m) => m.id === currentValue);
    if (!modelExists) {
      // Fallback to default if current model is not available
      currentValue = DEFAULT_SETTINGS.geminiModel;
      this.settings.geminiModel = currentValue;
      void this.saveSettings();
    }

    setting.addDropdown((dropdown) => {
      populateModelDropdown(dropdown.selectEl, modelsToUse, currentValue);
      dropdown.onChange(async (value) => {
        this.settings.geminiModel = value;
        await this.saveSettings();
      });
    });

    const selectEl = setting.controlEl.querySelector(
      "select",
    ) as HTMLSelectElement;

    if (selectEl) {
      createModelRefreshButton(
        setting,
        selectEl,
        "Gemini",
        this.settings.geminiKey,
        fetchGeminiModels,
        (models) => {
          this.cachedGeminiModels = models;
        },
        () => this.settings.geminiModel || DEFAULT_SETTINGS.geminiModel,
      );
    }
  }

  private renderCustomProvidersList(containerEl: HTMLElement): void {
    const customProviders = this.settings.customProviders || [];
    const providersList = containerEl.createDiv({
      attr: { style: "margin-bottom: 1em;" },
    });

    if (customProviders.length === 0) {
      providersList.createEl("p", {
        text: "No custom providers configured. Add one below.",
        attr: { style: "color: var(--text-muted); font-style: italic;" },
      });
    } else {
      customProviders.forEach((provider) => {
        const providerItem = providersList.createDiv({
          attr: {
            style:
              "display: flex; align-items: center; gap: 0.5em; margin-bottom: 0.5em; padding: 0.5em; background: var(--background-secondary); border-radius: 4px;",
          },
        });

        const infoDiv = providerItem.createDiv({ attr: { style: "flex: 1;" } });
        infoDiv.createEl("strong", {
          text: provider.name,
          attr: { style: "display: block;" },
        });
        infoDiv.createEl("span", {
          text: provider.endpoint,
          attr: {
            style:
              "font-family: monospace; font-size: 0.9em; color: var(--text-muted);",
          },
        });

        const editButton = providerItem.createEl("button", {
          text: "Edit",
          attr: { style: "font-size: 0.9em;" },
        });
        editButton.onclick = () => {
          this.showEditCustomProviderModal(containerEl, provider);
        };

        const removeButton = providerItem.createEl("button", {
          text: "Remove",
          attr: { style: "font-size: 0.9em;" },
        });
        removeButton.onclick = async () => {
          this.settings.customProviders = this.settings.customProviders.filter(
            (p) => p.id !== provider.id,
          );
          // If this was the selected provider, switch to OpenAI
          if (this.settings.llmProvider === provider.id) {
            this.settings.llmProvider = "openai";
          }
          await this.saveSettings();
          this.display();
        };
      });
    }
  }

  private showAddCustomProviderModal(containerEl: HTMLElement): void {
    const modal = new CustomProviderModal(
      this.app,
      null,
      async (provider) => {
        // Generate unique ID
        const existingIds = this.settings.customProviders.map((p) => p.id);
        let id = 1;
        while (existingIds.includes(`custom-${id}`)) {
          id++;
        }
        provider.id = `custom-${id}`;

        this.settings.customProviders.push(provider);
        await this.saveSettings();
        this.display();
      },
    );
    modal.open();
  }

  private showEditCustomProviderModal(
    containerEl: HTMLElement,
    provider: CustomLLMProvider,
  ): void {
    const modal = new CustomProviderModal(
      this.app,
      provider,
      async (updatedProvider) => {
        const index = this.settings.customProviders.findIndex(
          (p) => p.id === provider.id,
        );
        if (index !== -1) {
          this.settings.customProviders[index] = {
            ...updatedProvider,
            id: provider.id, // Keep the same ID
          };
          await this.saveSettings();
          this.display();
        }
      },
    );
    modal.open();
  }

}

import { Modal } from "obsidian";

class CustomProviderModal extends Modal {
  provider: CustomLLMProvider | null;
  onSubmit: (provider: CustomLLMProvider) => void;
  formData: Partial<CustomLLMProvider>;

  constructor(
    app: App,
    provider: CustomLLMProvider | null,
    onSubmit: (provider: CustomLLMProvider) => void,
  ) {
    super(app);
    this.provider = provider;
    this.onSubmit = onSubmit;
    this.formData = provider
      ? { ...provider }
      : {
          name: "",
          endpoint: "",
          apiKey: "",
          model: "",
          timeout: 1,
          customHeaders: {},
        };
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl("h2", {
      text: this.provider ? "Edit Custom Provider" : "Add Custom Provider",
    });

    contentEl.createEl("p", {
      text: "Configure a custom LLM provider (must use OpenAI-compatible API format)",
      attr: { style: "color: var(--text-muted); margin-bottom: 1em;" },
    });

    // Provider Name
    new Setting(contentEl)
      .setName("Provider name")
      .setDesc("A friendly name for this provider (e.g., 'OpenRouter', 'Ollama')")
      .addText((text) => {
        text
          .setPlaceholder("OpenRouter")
          .setValue(this.formData.name || "")
          .onChange((value) => {
            this.formData.name = value;
          });
        text.inputEl.focus();
      });

    // API Endpoint
    new Setting(contentEl)
      .setName("API endpoint")
      .setDesc(
        "Full URL to the API endpoint (e.g., https://openrouter.ai/api/v1/chat/completions)",
      )
      .addText((text) => {
        text
          .setPlaceholder("https://openrouter.ai/api/v1/chat/completions")
          .setValue(this.formData.endpoint || "")
          .onChange((value) => {
            this.formData.endpoint = value;
          });
        text.inputEl.style.width = "100%";
      });

    // API Key
    new Setting(contentEl)
      .setName("API key")
      .setDesc("Your API key for this provider")
      .addText((text) => {
        text.inputEl.type = "password";
        text
          .setPlaceholder("sk-...")
          .setValue(this.formData.apiKey || "")
          .onChange((value) => {
            this.formData.apiKey = value;
          });
        text.inputEl.style.width = "100%";
      });

    // Model
    new Setting(contentEl)
      .setName("Model")
      .setDesc("The model ID to use (e.g., 'openai/gpt-4o-mini')")
      .addText((text) => {
        text
          .setPlaceholder("openai/gpt-4o-mini")
          .setValue(this.formData.model || "")
          .onChange((value) => {
            this.formData.model = value;
          });
        text.inputEl.style.width = "100%";
      });

    // Timeout
    new Setting(contentEl)
      .setName("Timeout")
      .setDesc("Request timeout in minutes (default: 1)")
      .addText((text) => {
        text.inputEl.type = "number";
        text
          .setPlaceholder("1")
          .setValue(String(this.formData.timeout || 1))
          .onChange((value) => {
            const timeout = parseInt(value, 10);
            if (!isNaN(timeout) && timeout > 0) {
              this.formData.timeout = timeout;
            }
          });
      });

    // Custom Headers (Advanced)
    const headersContainer = contentEl.createDiv({
      attr: { style: "margin-top: 1em;" },
    });

    new Setting(headersContainer)
      .setName("Custom headers (optional)")
      .setDesc(
        "Add custom HTTP headers (e.g., HTTP-Referer, X-Title for OpenRouter)",
      );

    const headersList = headersContainer.createDiv({
      attr: { style: "margin-bottom: 1em;" },
    });

    const renderHeaders = () => {
      headersList.empty();
      const headers = this.formData.customHeaders || {};
      Object.entries(headers).forEach(([key, value]) => {
        const headerItem = headersList.createDiv({
          attr: {
            style:
              "display: flex; gap: 0.5em; margin-bottom: 0.5em; align-items: center;",
          },
        });

        const keyInput = headerItem.createEl("input", {
          type: "text",
          placeholder: "Header name",
          value: key,
          attr: { style: "flex: 1;" },
        });

        const valueInput = headerItem.createEl("input", {
          type: "text",
          placeholder: "Header value",
          value: value,
          attr: { style: "flex: 1;" },
        });

        const removeBtn = headerItem.createEl("button", { text: "Remove" });
        removeBtn.onclick = () => {
          delete this.formData.customHeaders![key];
          renderHeaders();
        };

        keyInput.addEventListener("change", () => {
          const newHeaders = { ...this.formData.customHeaders };
          delete newHeaders[key];
          newHeaders[keyInput.value] = valueInput.value;
          this.formData.customHeaders = newHeaders;
          renderHeaders();
        });

        valueInput.addEventListener("change", () => {
          this.formData.customHeaders![key] = valueInput.value;
        });
      });
    };

    renderHeaders();

    const addHeaderBtn = headersList.createEl("button", {
      text: "Add header",
      attr: { style: "margin-top: 0.5em;" },
    });
    addHeaderBtn.onclick = () => {
      if (!this.formData.customHeaders) {
        this.formData.customHeaders = {};
      }
      this.formData.customHeaders[""] = "";
      renderHeaders();
    };

    // Buttons
    const buttonContainer = contentEl.createDiv({
      attr: {
        style:
          "display: flex; gap: 0.5em; justify-content: flex-end; margin-top: 1.5em;",
      },
    });

    const cancelButton = buttonContainer.createEl("button", { text: "Cancel" });
    cancelButton.onclick = () => {
      this.close();
    };

    const saveButton = buttonContainer.createEl("button", {
      text: "Save",
      cls: "mod-cta",
    });
    saveButton.onclick = () => {
      if (
        !this.formData.name ||
        !this.formData.endpoint ||
        !this.formData.apiKey ||
        !this.formData.model
      ) {
        new Notice(
          "Please fill in all required fields (name, endpoint, API key, model)",
        );
        return;
      }

      // Validate URL format
      try {
        new URL(this.formData.endpoint);
      } catch {
        new Notice("Invalid API endpoint URL");
        return;
      }

      this.onSubmit(this.formData as CustomLLMProvider);
      this.close();
    };
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
