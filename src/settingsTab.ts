import { App, PluginSettingTab, Setting, Notice, Plugin } from "obsidian";
import type {
  YouTubeTranscriptPluginSettings,
  LLMProvider,
} from "./types";
import { DEFAULT_SETTINGS, DEFAULT_PROMPT } from "./settings";
import { validateClaudeModelName } from "./utils";

export class YouTubeTranscriptSettingTab extends PluginSettingTab {
  plugin: Plugin;
  settings: YouTubeTranscriptPluginSettings;
  saveSettings: () => Promise<void>;

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

      new Setting(containerEl)
        .setName("OpenAI model")
        .setDesc("Select the OpenAI model to use for transcript processing")
        .addDropdown((dropdown) => {
          dropdown
            .addOption("gpt-4o-mini", "GPT-4o Mini (fast, cost-effective)")
            .addOption("gpt-4o", "GPT-4o (high quality)")
            .addOption("gpt-4-turbo", "GPT-4 Turbo")
            .addOption("gpt-4", "GPT-4")
            .addOption("gpt-3.5-turbo", "GPT-3.5 Turbo")
            .setValue(this.settings.openaiModel || DEFAULT_SETTINGS.openaiModel)
            .onChange(async (value) => {
              this.settings.openaiModel = value;
              await this.saveSettings();
            });
        });
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

      new Setting(containerEl)
        .setName("Gemini model")
        .setDesc("Select the Gemini model to use for transcript processing")
        .addDropdown((dropdown) => {
          dropdown
            .addOption("gemini-3-pro", "Gemini 3 Pro")
            .addOption("gemini-3-flash", "Gemini 3 Flash")
            .addOption("gemini-flash-latest", "Gemini 2.0 Flash")
            .addOption("gemini-2.5-pro", "Gemini 2.5 Pro")
            .addOption("gemini-2.5-flash", "Gemini 2.5 Flash")
            .addOption("gemini-2.0-pro", "Gemini 2.0 Pro")
            .addOption("gemini-2.0-flash", "Gemini 2.0 Flash")
            .setValue(this.settings.geminiModel || DEFAULT_SETTINGS.geminiModel)
            .onChange(async (value) => {
              this.settings.geminiModel = value;
              await this.saveSettings();
            });
        });
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
}
