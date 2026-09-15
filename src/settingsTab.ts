import {
  App,
  PluginSettingTab,
  Setting,
  Notice,
  Plugin,
  type SettingDefinitionItem,
} from "obsidian";
import type {
  YouTubeTranscriptPluginSettings,
  CustomLLMProvider,
  FrontmatterFieldId,
} from "./types";
import {
  DEFAULT_SETTINGS,
  DEFAULT_PROMPT,
  DEFAULT_OPENAI_MODELS,
  DEFAULT_GEMINI_MODELS,
  DEFAULT_CLAUDE_MODELS,
} from "./settings";
import {
  normalizeVaultPath,
  normalizeFilesystemPath,
  normalizeFolderName,
  normalizeLanguageList,
  valueOrDefault,
  trimmedOrDefault,
  resolveClaudeModel,
  resolveDirectoryDeletion,
  resolveProviderDeletion,
} from "./utils";
import {
  fetchOpenAIModels,
  fetchGeminiModels,
  fetchClaudeModels,
  type ModelInfo,
} from "./llm/modelFetcher";
import { FolderSuggest } from "./suggester";
import {
  FRONTMATTER_FIELD_ORDER,
  FRONTMATTER_FIELD_LABELS,
  DEFAULT_FRONTMATTER_FIELDS,
} from "./utils/frontmatter";
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
  cachedClaudeModels: ModelInfo[] | null = null;

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

  // Declarative settings API (Obsidian 1.13.0+). display() below remains the
  // fallback for older Obsidian versions and is kept behaviorally in sync via
  // the shared normalization helpers imported from ./utils.

  getControlValue(key: string): unknown {
    return (this.settings as unknown as Record<string, unknown>)[key];
  }

  async setControlValue(key: string, value: unknown): Promise<void> {
    const settings = this.settings as unknown as Record<string, unknown>;
    switch (key) {
      case "defaultNoteName":
      case "defaultSrtFileName":
        value = valueOrDefault(value as string, "{VideoName}");
        break;
      case "duplicateCheckProperty":
        value = trimmedOrDefault(value as string, "url");
        break;
      case "preferredLanguage":
        value = normalizeLanguageList(value as string);
        break;
      case "localVideoDirectory":
        value = normalizeFilesystemPath(value as string);
        break;
      case "attachmentFolder":
        value = normalizeFolderName(value as string);
        break;
      case "defaultCoverNoteName":
        value = (value as string).trim();
        break;
      case "coverNoteTemplate":
        value = normalizeVaultPath(value as string);
        break;
      case "claudeModel": {
        const resolved = resolveClaudeModel(value as string, DEFAULT_SETTINGS.claudeModel);
        value = resolved.value;
        break;
      }
    }

    settings[key] = value;
    await this.saveSettings();

    if (
      key === "useLLMProcessing" ||
      key === "llmProvider" ||
      key === "savedDirectories" ||
      key === "defaultDirectory" ||
      key === "customProviders" ||
      key === "srtUseReadingSpeed"
    ) {
      this.update();
    } else {
      this.refreshDomState();
    }
  }

  getSettingDefinitions(): SettingDefinitionItem[] {
    const version = this.plugin.manifest.version;
    const savedDirs = this.settings.savedDirectories || [];

    return [
      { name: "Version", desc: `Plugin version: ${version}` },
      {
        type: "group",
        heading: "Files and folders",
        items: [
          {
            name: "Available file formats",
            desc: "Select which file formats should be available in the transcript creation modal",
          },
          ...this.fileFormats.map((format) => ({
            name: this.fileFormatNames[format],
            render: (setting: Setting) => this.configureFileFormatSetting(setting, format),
          })),
        ],
      },
      {
        type: "group",
        heading: "Transcript directories",
        items: [
          {
            name: "Default directory",
            desc: "Select which saved directory to use by default when creating new transcript files. Leave as 'None' to use the current file's directory.",
            visible: () => savedDirs.length > 0,
            control: {
              type: "dropdown",
              key: "defaultDirectory",
              defaultValue: "",
              options: {
                "": "None (use current file's directory)",
                ...Object.fromEntries(savedDirs.filter((d) => d?.trim()).map((d) => [d, d])),
              },
            },
          },
        ],
      },
      {
        type: "list",
        heading: "Manage directories",
        emptyState: "No directories saved. Add one below.",
        items: savedDirs.map((dir) => ({
          name: dir,
          desc: this.settings.defaultDirectory === dir ? "(Default)" : undefined,
        })),
        onDelete: (index) => {
          void (async () => {
            const result = resolveDirectoryDeletion(savedDirs, this.settings.defaultDirectory, index);
            this.settings.savedDirectories = result.savedDirectories;
            this.settings.defaultDirectory = result.defaultDirectory;
            await this.saveSettings();
            this.update();
          })();
        },
      },
      {
        name: "Add directory",
        render: (_setting, group) => this.renderAddDirectoryRow(group.listEl, () => this.update()),
      },
      {
        type: "group",
        heading: "Transcript",
        items: [
          { name: "Create new markdown file", desc: "When enabled, the modal will default to creating a new markdown file instead of inserting into the current file (can be overridden in the modal.  If PDF is selected as output format, this setting is ignored, as PDF files will always be created.)", control: { type: "toggle", key: "createNewFile" } },
          { name: "Default note name", desc: "Template for note file names. Supports {VideoName} and {ChannelName} variables.", control: { type: "text", key: "defaultNoteName", placeholder: "{VideoName}" } },
          { name: "Preferred languages", desc: "Comma-separated list of preferred transcript language codes in order of preference (e.g., 'en,es,fr' for English, then Spanish, then French). Languages will be tried in order until one is available. Leave empty for auto-select (prefers English). You can override this in the modal when multiple languages are available.", control: { type: "text", key: "preferredLanguage", placeholder: "en,es,fr" } },
          { name: "Include video URL", desc: "When enabled, the video URL will be included in the transcript (can be overridden in the modal)", control: { type: "toggle", key: "includeVideoUrl" } },
          { name: "Generate summary", desc: "When enabled and an LLM provider is selected, generate a summary of the video (can be overridden in the modal)", control: { type: "toggle", key: "generateSummary" } },
          { name: "Tag with channel name", desc: "When enabled, notes will be tagged with the YouTube channel name (can be overridden in the modal)", control: { type: "toggle", key: "tagWithChannelName" } },
          { name: "Single line transcript", desc: "When enabled, the transcript will be kept on a single line without line breaks. Timestamps (if enabled) will be inline. Useful for compact formatting or when copying to other applications.", control: { type: "toggle", key: "singleLineTranscript" } },
          { name: "Allow clipboard access", desc: 'When enabled, the plugin reads the clipboard to prefill the URL field when the modal opens, and powers the "Fetch from clipboard" command. Disable if you prefer the plugin never accesses the clipboard.', control: { type: "toggle", key: "allowClipboardAccess" } },
          { name: "Prevent duplicate notes", desc: "When enabled, creating a transcript will be blocked if a note already exists with a matching value in the frontmatter property below", control: { type: "toggle", key: "checkForDuplicates" } },
          { name: "Duplicate check property", desc: 'The frontmatter property used to detect duplicates. Defaults to "url", which the plugin writes automatically.', control: { type: "text", key: "duplicateCheckProperty", placeholder: "url" } },
        ],
      },
      {
        type: "group",
        heading: "Frontmatter",
        items: [
          {
            name: "Frontmatter fields",
            desc: "Choose which properties are written to each note's frontmatter, and optionally rename the property key used for each one. Disabled fields are omitted entirely.",
          },
          ...FRONTMATTER_FIELD_ORDER.map((id) => ({
            name: FRONTMATTER_FIELD_LABELS[id],
            render: (setting: Setting) => this.configureFrontmatterFieldSetting(setting, id),
          })),
        ],
      },
      {
        type: "group",
        heading: "Timestamp",
        items: [
          { name: "Include timestamps", desc: "When enabled, timestamps will be included in transcripts as clickable links to the video at that time", control: { type: "toggle", key: "includeTimestamps" } },
          { name: "Timestamp frequency", desc: "How often to show timestamps: 0 = every sentence, >0 = every N seconds (e.g., 30 = every 30 seconds)", control: { type: "number", key: "timestampFrequency", placeholder: "0", min: 0, defaultValue: 0 } },
          { name: "Include timestamps in LLM output", desc: "When enabled, timestamps will be preserved in LLM-processed transcripts. When disabled, timestamps are removed before LLM processing.", control: { type: "toggle", key: "includeTimestampsInLLM" } },
          { name: "Local video directory", desc: "Filesystem directory where local video files are stored. If set, timestamp links will point to local files (file:///path/video-id.mp4?t=SECONDS) instead of YouTube URLs. Leave empty to use YouTube URLs.", control: { type: "text", key: "localVideoDirectory", placeholder: "/path/to/videos" } },
        ],
      },
      {
        type: "group",
        heading: "PDF",
        items: [
          { name: "Create cover note", desc: "When enabled, a cover note will be created for PDF and/or SRT files", control: { type: "toggle", key: "createCoverNote" } },
          {
            name: "Cover note location",
            desc: "Location/path where cover notes should be created. Leave empty to use the same location as the PDF/SRT files. Supports '{ChannelName}' and '{VideoName}' template variables",
            render: (setting) => this.renderCoverNoteLocationField(setting),
          },
          { name: "Attachment folder", desc: "Folder name used to nest PDF and SRT files under the cover note location. Leave empty to use the video title as the folder name.", control: { type: "text", key: "attachmentFolder", placeholder: "attachments" } },
          { name: "Default SRT file name", desc: "Template for SRT file names. Supports {VideoName} and {ChannelName} variables.", control: { type: "text", key: "defaultSrtFileName", placeholder: "{VideoName}" } },
          { name: "Use reading speed for SRT timing", desc: "When enabled, each SRT cue's duration is computed from its word count at the reading speed below, instead of the actual transcript segment timing.", control: { type: "toggle", key: "srtUseReadingSpeed" } },
          {
            name: "SRT reading speed (WPM)",
            desc: "Words per minute used to compute SRT cue duration when reading-speed timing is enabled.",
            visible: () => this.settings.srtUseReadingSpeed,
            control: { type: "number", key: "srtReadingSpeedWpm", placeholder: "180", min: 1, defaultValue: 180 },
          },
          {
            name: "Cover note template",
            desc: "Path to a markdown template file for cover notes. Leave empty to use the default template. Supports template variables: {ChannelName}, {VideoName}, {VideoUrl}, {Summary}, {PdfLink}, {SrtLink}, {VideoId}, {LengthSeconds}, {ViewCount}, {PublishDate}, {Description}, {ChannelId}, {IsLive}, {IsPrivate}, {IsUnlisted}, and {VideoDetails.*} for any videoDetails field.",
            control: { type: "file", key: "coverNoteTemplate", placeholder: "Templates/Cover Note.md", filter: (file) => file.extension === "md" },
          },
          { name: "Cover note file name", desc: "Template for cover note file names. Supports {VideoName} and {ChannelName}. Default: {VideoName}", control: { type: "text", key: "defaultCoverNoteName", placeholder: "{VideoName}" } },
        ],
      },
      {
        type: "group",
        heading: "LLM",
        items: [
          { name: "Use LLM processing", desc: "When enabled, transcripts will be processed by the selected LLM provider to clean up and format the content", control: { type: "toggle", key: "useLLMProcessing" } },
          {
            name: "LLM provider",
            desc: "Select which LLM provider to use for transcript processing",
            visible: () => this.settings.useLLMProcessing,
            control: {
              type: "dropdown",
              key: "llmProvider",
              defaultValue: "openai",
              options: {
                openai: "OpenAI",
                gemini: "Google Gemini",
                claude: "Anthropic Claude",
                ...Object.fromEntries(
                  (this.settings.customProviders || []).map((p) => [p.id, `${p.name} (Custom)`]),
                ),
              },
            },
          },
          {
            name: "OpenAI API key",
            desc: "Your OpenAI API key for processing transcripts (get one at https://platform.openai.com/api-keys)",
            visible: () => this.settings.useLLMProcessing && this.settings.llmProvider === "openai",
            render: (setting) => this.renderOpenAIKeyField(setting),
          },
          {
            name: "OpenAI model",
            desc: "Select the OpenAI model to use for transcript processing",
            visible: () => this.settings.useLLMProcessing && this.settings.llmProvider === "openai",
            render: (setting) => this.createOpenAIModelSetting(setting),
          },
          {
            name: "Gemini API key",
            desc: "Your Google Gemini API key for processing transcripts (get one at https://aistudio.google.com/app/apikey)",
            visible: () => this.settings.useLLMProcessing && this.settings.llmProvider === "gemini",
            render: (setting) => this.renderGeminiKeyField(setting),
          },
          {
            name: "Gemini model",
            desc: "Select the Gemini model to use for transcript processing",
            visible: () => this.settings.useLLMProcessing && this.settings.llmProvider === "gemini",
            render: (setting) => this.createGeminiModelSetting(setting),
          },
          {
            name: "Claude API key",
            desc: "Your Anthropic Claude API key for processing transcripts (get one at https://console.anthropic.com/)",
            visible: () => this.settings.useLLMProcessing && this.settings.llmProvider === "claude",
            render: (setting) => this.renderClaudeKeyField(setting),
          },
          {
            name: "Claude model",
            desc: "Select the Claude model to use for transcript processing",
            visible: () => this.settings.useLLMProcessing && this.settings.llmProvider === "claude",
            render: (setting) => this.createClaudeModelSetting(setting),
          },
          {
            name: "Processing prompt",
            desc: "The prompt sent to the LLM for processing the transcript",
            visible: () => this.settings.useLLMProcessing,
            control: { type: "textarea", key: "prompt", placeholder: DEFAULT_PROMPT, rows: 10 },
          },
          {
            name: "LLM timeout",
            desc: "Timeout for LLM API requests in minutes (default: 1 minute / 60 seconds)",
            visible: () => this.settings.useLLMProcessing,
            control: { type: "number", key: "openaiTimeout", placeholder: "5", min: 1, defaultValue: 1 },
          },
          {
            name: "Force LLM output language",
            desc: "When enabled, the LLM will be instructed to output in the same language as the selected transcript language. This ensures the processed transcript matches the original language.",
            visible: () => this.settings.useLLMProcessing,
            control: { type: "toggle", key: "forceLLMLanguage" },
          },
        ],
      },
      {
        type: "list",
        heading: "Custom LLM providers",
        visible: () => this.settings.useLLMProcessing,
        emptyState: "No custom providers configured. Add one below.",
        items: (this.settings.customProviders || []).map((provider) => ({
          name: provider.name,
          desc: provider.endpoint,
          action: (el: HTMLElement, index: number) => {
            const current = this.settings.customProviders[index];
            if (current) this.showEditCustomProviderModal(el, current);
          },
        })),
        addItem: {
          name: "Add custom provider",
          action: (el: HTMLElement) => this.showAddCustomProviderModal(el),
        },
        onDelete: (index) => {
          void (async () => {
            const provider = this.settings.customProviders[index];
            if (!provider) return;
            const result = resolveProviderDeletion(
              this.settings.customProviders,
              this.settings.llmProvider,
              provider.id,
            );
            this.settings.customProviders = result.customProviders;
            this.settings.llmProvider = result.llmProvider;
            await this.saveSettings();
            this.update();
          })();
        },
      },
    ];
  }

  private configureFrontmatterFieldSetting(
    setting: Setting,
    id: FrontmatterFieldId,
  ): void {
    const defaultConfig = DEFAULT_FRONTMATTER_FIELDS[id];
    const fieldConfig = this.settings.frontmatterFields[id] ?? defaultConfig;

    setting
      .setName(FRONTMATTER_FIELD_LABELS[id])
      .addToggle((toggle) => {
        toggle.setValue(fieldConfig.enabled).onChange(async (value) => {
          this.settings.frontmatterFields[id].enabled = value;
          await this.saveSettings();
          this.warnIfDuplicateCheckPropertyMissing();
        });
      })
      .addText((text) => {
        text
          .setPlaceholder(defaultConfig.key)
          .setValue(fieldConfig.key)
          .onChange(async (value) => {
            this.settings.frontmatterFields[id].key =
              value.trim() || defaultConfig.key;
            await this.saveSettings();
          });
        text.inputEl.addEventListener("blur", () =>
          this.warnIfDuplicateCheckPropertyMissing(),
        );
      });
  }

  private readonly fileFormats: ("markdown" | "pdf" | "srt")[] = ["markdown", "pdf", "srt"];
  private readonly fileFormatNames: Record<"markdown" | "pdf" | "srt", string> = {
    markdown: "Markdown (.md)",
    pdf: "PDF",
    srt: "SRT Subtitles (.srt)",
  };

  private configureFileFormatSetting(
    setting: Setting,
    format: "markdown" | "pdf" | "srt",
  ): void {
    setting.setName(this.fileFormatNames[format]).addToggle((toggle) => {
      toggle
        .setValue(this.settings.fileFormats?.includes(format) ?? false)
        .onChange(async (value) => {
          const selected = new Set(this.settings.fileFormats || []);
          if (value) {
            selected.add(format);
          } else {
            selected.delete(format);
          }

          // Ensure at least one format is always selected
          if (selected.size === 0) {
            toggle.setValue(true);
            return;
          }

          this.settings.fileFormats = this.fileFormats.filter((f) => selected.has(f));
          await this.saveSettings();
        });
    });
  }

  private renderAddDirectoryRow(containerEl: HTMLElement, onAdded: () => void): void {
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
        const normalizedDir = normalizeVaultPath(newDir);
        const savedDirs = this.settings.savedDirectories || [];
        if (!savedDirs.includes(normalizedDir)) {
          this.settings.savedDirectories = [...savedDirs, normalizedDir];
          await this.saveSettings();
          addDirectoryInput.value = "";
          onAdded();
        }
      }
    };
  }

  private renderCoverNoteLocationField(setting: Setting): void {
    setting
      .addText((text) => {
        text
          .setPlaceholder("Notes/Transcripts or Notes/{ChannelName}")
          .setValue(this.settings.coverNoteLocation || "")
          .onChange(async (value) => {
            this.settings.coverNoteLocation = normalizeVaultPath(value);
            await this.saveSettings();
          });
        new FolderSuggest(this.app, text.inputEl);
      });
  }

  private renderOpenAIKeyField(setting: Setting): void {
    setting.addText((text) => {
      text.inputEl.type = "password";
      text
        .setPlaceholder("sk-...")
        .setValue(this.settings.openaiKey)
        .onChange(async (value) => {
          this.settings.openaiKey = value;
          await this.saveSettings();
        });
    });
  }

  private renderGeminiKeyField(setting: Setting): void {
    setting.addText((text) => {
      text.inputEl.type = "password";
      text
        .setPlaceholder("AIza...")
        .setValue(this.settings.geminiKey)
        .onChange(async (value) => {
          this.settings.geminiKey = value;
          await this.saveSettings();
        });
    });
  }

  private renderClaudeKeyField(setting: Setting): void {
    setting.addText((text) => {
      text.inputEl.type = "password";
      text
        .setPlaceholder("sk-ant-...")
        .setValue(this.settings.claudeKey)
        .onChange(async (value) => {
          this.settings.claudeKey = value;
          await this.saveSettings();
        });
    });
  }

  /**
   * Warns the user if duplicate detection is enabled but no enabled
   * frontmatter field currently writes the configured duplicate check
   * property (e.g. because it was renamed or disabled below).
   */
  private warnIfDuplicateCheckPropertyMissing(): void {
    if (!this.settings.checkForDuplicates) return;

    const property = (this.settings.duplicateCheckProperty || "url").trim();
    const isWritten = FRONTMATTER_FIELD_ORDER.some((id) => {
      const field = this.settings.frontmatterFields[id];
      return field?.enabled && field.key === property;
    });

    if (!isWritten) {
      new Notice(
        `No enabled frontmatter field writes the property "${property}". Duplicate detection ("Prevent duplicate notes") will not work until this is fixed.`,
        8000,
      );
    }
  }

  /**
   * Refreshes model lists automatically on initialization
   * Validates that selected models are still available
   */
  /**
   * Creates the OpenAI model selection setting with refresh functionality
   */
  private createOpenAIModelSetting(setting: Setting): void {
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
  private createGeminiModelSetting(setting: Setting): void {
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

  /**
   * Creates the Claude model selection setting with refresh functionality
   */
  private createClaudeModelSetting(setting: Setting): void {
    const modelsToUse = this.cachedClaudeModels || DEFAULT_CLAUDE_MODELS;
    let currentValue =
      this.settings.claudeModel || DEFAULT_SETTINGS.claudeModel;

    // Ensure current model is available in the list
    const modelExists = modelsToUse.some((m) => m.id === currentValue);
    if (!modelExists) {
      // Fallback to default if current model is not available
      currentValue = DEFAULT_SETTINGS.claudeModel;
      this.settings.claudeModel = currentValue;
      void this.saveSettings();
    }

    setting.addDropdown((dropdown) => {
      populateModelDropdown(dropdown.selectEl, modelsToUse, currentValue);
      dropdown.onChange(async (value) => {
        this.settings.claudeModel = value;
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
        "Claude",
        this.settings.claudeKey,
        fetchClaudeModels,
        (models) => {
          this.cachedClaudeModels = models;
        },
        () => this.settings.claudeModel || DEFAULT_SETTINGS.claudeModel,
      );
    }
  }

  private showAddCustomProviderModal(_containerEl: HTMLElement): void {
    const modal = new CustomProviderModal(
      this.app,
      null,
      (provider) => {
        // Generate unique ID
        const existingIds = this.settings.customProviders.map((p) => p.id);
        let id = 1;
        while (existingIds.includes(`custom-${id}`)) {
          id++;
        }
        provider.id = `custom-${id}`;

        this.settings.customProviders.push(provider);
        void this.saveSettings().then(() => this.update());
      },
    );
    modal.open();
  }

  private showEditCustomProviderModal(
    _containerEl: HTMLElement,
    provider: CustomLLMProvider,
  ): void {
    const modal = new CustomProviderModal(
      this.app,
      provider,
      (updatedProvider) => {
        const index = this.settings.customProviders.findIndex(
          (p) => p.id === provider.id,
        );
        if (index !== -1) {
          this.settings.customProviders[index] = {
            ...updatedProvider,
            id: provider.id, // Keep the same ID
          };
          void this.saveSettings().then(() => this.update());
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
        text.inputEl.addClass("youtube-transcript-full-width");
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
        text.inputEl.addClass("youtube-transcript-full-width");
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
        text.inputEl.addClass("youtube-transcript-full-width");
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
