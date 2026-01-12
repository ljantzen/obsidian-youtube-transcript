import { App, PluginSettingTab, Setting, Notice, Plugin } from "obsidian";
import type {
  YouTubeTranscriptPluginSettings,
  LLMProvider,
} from "./types";
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
import { FolderSuggest } from "./suggester";
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

    new Setting(containerEl)
      .setName("LLM provider")
      .setDesc("Select which LLM provider to use for transcript processing")
      .addDropdown((dropdown) => {
        dropdown
          .addOption("none", "None (raw transcript)")
          .addOption("openai", "OpenAI")
          .addOption("gemini", "Google Gemini")
          .addOption("claude", "Anthropic Claude")
          .setValue(this.settings.llmProvider || "none")
          .onChange(async (value: LLMProvider) => {
            this.settings.llmProvider = value;
            await this.saveSettings();
            // Refresh the settings display to show/hide relevant API key fields
            this.display();
          });
      });

    // Show OpenAI API key field if OpenAI is selected or if it's the current provider
    if (
      this.settings.llmProvider === "openai" ||
      this.settings.llmProvider === "none"
    ) {
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

    new Setting(containerEl).setName("File Creation").setHeading();

    new Setting(containerEl)
      .setName("Use default directory")
      .setDesc(
        "When enabled, new transcript files will be created in the default directory instead of the current file's directory",
      )
      .addToggle((toggle) => {
        toggle
          .setValue(this.settings.useDefaultDirectory)
          .onChange(async (value) => {
            this.settings.useDefaultDirectory = value;
            await this.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Default directory")
      .setDesc(
        "Directory path where new transcript files will be created (leave empty to use current file's directory). Example: 'Transcripts' or 'Notes/YouTube'",
      )
      .addText((text) => {
        new FolderSuggest(this.app, text.inputEl);
        text
          .setPlaceholder("Transcripts")
          .setValue(this.settings.defaultDirectory)
          .onChange(async (value) => {
            // Normalize path: remove leading/trailing slashes and ensure forward slashes
            const normalizedPath = value.trim().replace(/^\/+|\/+$/g, "").replace(/\\/g, "/");
            this.settings.defaultDirectory = normalizedPath;
            await this.saveSettings();
          });
      });

    new Setting(containerEl).setName("Content Options").setHeading();

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
          .setValue(
            this.settings.timestampFrequency?.toString() || "0",
          )
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
        const currentModel = this.settings.openaiModel || DEFAULT_SETTINGS.openaiModel;
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
        const currentModel = this.settings.geminiModel || DEFAULT_SETTINGS.geminiModel;
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
}
