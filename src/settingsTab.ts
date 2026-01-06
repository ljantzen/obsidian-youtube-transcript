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
        .setDesc("Select the Claude model to use for transcript processing")
        .addDropdown((dropdown) => {
          // Claude version 4 models only
          dropdown
            .addOption(
              "claude-opus-4-1-20250805",
              "Claude Opus 4.1 (latest, GA)",
            )
            .addOption("claude-opus-4-20250514", "Claude Opus 4 (GA)")
            .addOption(
              "claude-sonnet-4-20250514",
              "Claude Sonnet 4 (recommended, GA)",
            );
          // Simplified names (without dates)
          dropdown
            .addOption("claude-opus-4-1", "Claude Opus 4.1 (no date)")
            .addOption("claude-opus-4", "Claude Opus 4 (no date)")
            .addOption("claude-sonnet-4", "Claude Sonnet 4 (no date)")
            .setValue(this.settings.claudeModel || DEFAULT_SETTINGS.claudeModel)
            .onChange(async (value) => {
              if (validateClaudeModelName(value)) {
                this.settings.claudeModel = value;
                await this.saveSettings();
              } else {
                new Notice(
                  `Invalid Claude model name: "${value}". Please select a valid model from the dropdown.`,
                );
                // Reset to default if invalid
                dropdown.setValue(
                  this.settings.claudeModel || DEFAULT_SETTINGS.claudeModel,
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
