import {
  Plugin,
  MarkdownView,
  Notice,
  TFile,
} from "obsidian";
import type {
  YouTubeTranscriptPluginSettings,
  LLMProvider,
} from "./types";
import { DEFAULT_SETTINGS, DEFAULT_PROMPT } from "./settings";
import { extractVideoId, sanitizeFilename, validateClaudeModelName } from "./utils";
import { getYouTubeTranscript } from "./youtube";
import { YouTubeUrlModal, RetryConfirmationModal } from "./modals";
import { YouTubeTranscriptSettingTab } from "./settingsTab";
import { UserCancelledError } from "./llm/openai";

export default class YouTubeTranscriptPlugin extends Plugin {
  settings: YouTubeTranscriptPluginSettings;

  async onload() {
    await this.loadSettings();

    // This creates an icon in the left ribbon.
    this.addRibbonIcon("youtube", "Youtube transcript", () => {
      this.fetchTranscript();
    });

    // This adds a settings tab so the user can configure various aspects of the plugin
    this.addSettingTab(
      new YouTubeTranscriptSettingTab(
        this.app,
        this,
        this.settings,
        () => this.saveSettings(),
      ),
    );

    // This adds a simple command that can be triggered anywhere
    this.addCommand({
      id: "fetch-youtube-transcript",
      name: "Fetch YouTube transcript",
      callback: () => {
        this.fetchTranscript();
      },
    });
  }

  onunload() {
    // Plugin cleanup if needed
  }

  async loadSettings() {
    const loadedData = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedData);

    // Backward compatibility: if llmProvider is not set, infer from existing keys
    if (
      this.settings.llmProvider === undefined ||
      this.settings.llmProvider === "none"
    ) {
      if (this.settings.openaiKey && this.settings.openaiKey.trim() !== "") {
        this.settings.llmProvider = "openai";
      } else if (
        this.settings.geminiKey &&
        this.settings.geminiKey.trim() !== ""
      ) {
        this.settings.llmProvider = "gemini";
      } else if (
        this.settings.claudeKey &&
        this.settings.claudeKey.trim() !== ""
      ) {
        this.settings.llmProvider = "claude";
      } else {
        this.settings.llmProvider = "none";
      }
      await this.saveSettings();
    }

    // Ensure new API key fields exist (backward compatibility)
    if (this.settings.geminiKey === undefined) {
      this.settings.geminiKey = "";
      await this.saveSettings();
    }
    if (this.settings.claudeKey === undefined) {
      this.settings.claudeKey = "";
      await this.saveSettings();
    }

    // Ensure model fields exist (backward compatibility)
    if (this.settings.openaiModel === undefined) {
      this.settings.openaiModel = DEFAULT_SETTINGS.openaiModel;
      await this.saveSettings();
    }
    if (this.settings.geminiModel === undefined) {
      this.settings.geminiModel = DEFAULT_SETTINGS.geminiModel;
      await this.saveSettings();
    }
    if (this.settings.claudeModel === undefined) {
      this.settings.claudeModel = DEFAULT_SETTINGS.claudeModel;
      await this.saveSettings();
    } else if (!validateClaudeModelName(this.settings.claudeModel)) {
      // Migrate old version 3 models to version 4
      const oldModel = this.settings.claudeModel;
      if (oldModel.includes("sonnet")) {
        this.settings.claudeModel = DEFAULT_SETTINGS.claudeModel;
      } else if (oldModel.includes("opus")) {
        this.settings.claudeModel = "claude-opus-4-20250514";
      } else {
        this.settings.claudeModel = DEFAULT_SETTINGS.claudeModel;
      }
      await this.saveSettings();
    }

    // Ensure prompt has a default value if empty
    if (!this.settings.prompt || this.settings.prompt.trim() === "") {
      this.settings.prompt = DEFAULT_PROMPT;
      await this.saveSettings();
    }

    // Ensure timeout has a default value if missing (backward compatibility)
    if (
      this.settings.openaiTimeout === undefined ||
      this.settings.openaiTimeout <= 0
    ) {
      this.settings.openaiTimeout = DEFAULT_SETTINGS.openaiTimeout;
      await this.saveSettings();
    }

    // Ensure includeVideoUrl has a default value if missing (backward compatibility)
    if (this.settings.includeVideoUrl === undefined) {
      this.settings.includeVideoUrl = DEFAULT_SETTINGS.includeVideoUrl;
      await this.saveSettings();
    }

    // Ensure generateSummary has a default value if missing (backward compatibility)
    if (this.settings.generateSummary === undefined) {
      this.settings.generateSummary = DEFAULT_SETTINGS.generateSummary;
      await this.saveSettings();
    }
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  hasProviderKey(provider: LLMProvider): boolean {
    switch (provider) {
      case "openai":
        return !!(
          this.settings.openaiKey && this.settings.openaiKey.trim() !== ""
        );
      case "gemini":
        return !!(
          this.settings.geminiKey && this.settings.geminiKey.trim() !== ""
        );
      case "claude":
        return !!(
          this.settings.claudeKey && this.settings.claudeKey.trim() !== ""
        );
      default:
        return false;
    }
  }

  fetchTranscript() {
    new YouTubeUrlModal(
      this.app,
      this.settings,
      {
        hasProviderKey: (provider: LLMProvider) => this.hasProviderKey(provider),
      },
      async (
        url: string,
        createNewFile: boolean,
        includeVideoUrl: boolean,
        generateSummary: boolean,
        llmProvider: LLMProvider,
      ) => {
        try {
          const fetchingNotice = new Notice(
            "Fetching transcript from YouTube...",
            0,
          );
          const result = await getYouTubeTranscript(
            this.app,
            url,
            generateSummary,
            llmProvider,
            this.settings,
            (status: string) => {
              fetchingNotice.setMessage(status);
            },
            RetryConfirmationModal,
          );
          fetchingNotice.hide();

          const { transcript, title, summary } = result;

          if (!transcript || transcript.trim().length === 0) {
            throw new Error("Transcript is empty");
          }

          // Normalize the URL to watch format
          const videoId = extractVideoId(url);
          const normalizedUrl = videoId
            ? `https://www.youtube.com/watch?v=${videoId}`
            : url;

          if (createNewFile) {
            const activeFile = this.app.workspace.getActiveFile();
            if (!activeFile) {
              throw new Error(
                "Please open a file first to determine the directory",
              );
            }

            await this.createTranscriptFile(
              activeFile,
              title,
              transcript,
              normalizedUrl,
              summary,
              includeVideoUrl,
            );
            new Notice(
              `Transcript file created successfully! (${transcript.length} characters)`,
            );
          } else {
            const activeView =
              this.app.workspace.getActiveViewOfType(MarkdownView);
            if (!activeView) {
              new Notice("Please open a markdown file first");
              return;
            }

            this.insertTranscript(
              activeView,
              transcript,
              title,
              normalizedUrl,
              summary,
              includeVideoUrl,
            );
            new Notice(
              `Transcript fetched successfully! (${transcript.length} characters)`,
            );
          }
        } catch (error: unknown) {
          // If user cancelled, don't show an error - just silently abort
          if (error instanceof UserCancelledError) {
            return;
          }
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          new Notice(`Error fetching transcript: ${errorMessage}`);
          console.error("Transcript fetch error:", error);
        }
      },
    ).open();
  }

  async createTranscriptFile(
    activeFile: TFile,
    videoTitle: string,
    transcript: string,
    videoUrl: string,
    summary: string | null,
    includeVideoUrl: boolean,
  ) {
    const baseSanitizedTitle = sanitizeFilename(videoTitle);
    let sanitizedTitle = baseSanitizedTitle;

    const activeFilePath = activeFile.path;
    const directory = activeFilePath.substring(
      0,
      activeFilePath.lastIndexOf("/"),
    );

    // Handle duplicate filenames
    let newFilePath = directory
      ? `${directory}/${sanitizedTitle}.md`
      : `${sanitizedTitle}.md`;
    let counter = 1;
    while (await this.app.vault.adapter.exists(newFilePath)) {
      sanitizedTitle = `${baseSanitizedTitle} (${counter})`;
      newFilePath = directory
        ? `${directory}/${sanitizedTitle}.md`
        : `${sanitizedTitle}.md`;
      counter++;
    }

    // Build file content with URL, summary, and transcript
    const parts: string[] = [];

    if (includeVideoUrl) {
      parts.push(`![${videoTitle}](${videoUrl})`);
    }

    parts.push(transcript);

    const fileContent = parts.join("\n\n");

    // Create the file, handling race conditions
    try {
      const fileExists = await this.app.vault.adapter.exists(newFilePath);

      if (fileExists) {
        let fallbackCounter = counter;
        let fallbackPath = directory
          ? `${directory}/${baseSanitizedTitle} (${fallbackCounter}).md`
          : `${baseSanitizedTitle} (${fallbackCounter}).md`;
        while (await this.app.vault.adapter.exists(fallbackPath)) {
          fallbackCounter++;
          fallbackPath = directory
            ? `${directory}/${baseSanitizedTitle} (${fallbackCounter}).md`
            : `${baseSanitizedTitle} (${fallbackCounter}).md`;
        }
        await this.app.vault.create(fallbackPath, fileContent);
        newFilePath = fallbackPath;
      } else {
        await this.app.vault.create(newFilePath, fileContent);
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      if (
        errorMessage.includes("already exists") ||
        errorMessage.includes("file exists") ||
        (await this.app.vault.adapter.exists(newFilePath))
      ) {
        let fallbackCounter = counter;
        let fallbackPath = directory
          ? `${directory}/${baseSanitizedTitle} (${fallbackCounter}).md`
          : `${baseSanitizedTitle} (${fallbackCounter}).md`;
        while (await this.app.vault.adapter.exists(fallbackPath)) {
          fallbackCounter++;
          fallbackPath = directory
            ? `${directory}/${baseSanitizedTitle} (${fallbackCounter}).md`
            : `${baseSanitizedTitle} (${fallbackCounter}).md`;
        }
        await this.app.vault.create(fallbackPath, fileContent);
        newFilePath = fallbackPath;
      } else {
        throw error;
      }
    }

    // Open the file
    await this.app.workspace.openLinkText(newFilePath, "", false);
  }

  insertTranscript(
    view: MarkdownView,
    transcript: string,
    videoTitle: string,
    videoUrl: string,
    summary: string | null,
    includeVideoUrl: boolean,
  ) {
    try {
      const editor = view.editor;
      if (!editor) {
        console.error("Editor not available");
        new Notice("The editor is not available");
        return;
      }

      const cursor = editor.getCursor();

      const parts: string[] = [];

      if (includeVideoUrl) {
        parts.push(`![${videoTitle}](${videoUrl})`);
      }

      parts.push(transcript);

      const contentToInsert = parts.join("\n\n");

      editor.replaceRange(contentToInsert, cursor);

      const lines = contentToInsert.split("\n");
      const newCursor = {
        line: cursor.line + lines.length,
        ch:
          lines.length > 1
            ? lines[lines.length - 1].length
            : cursor.ch + contentToInsert.length,
      };
      editor.setCursor(newCursor);
    } catch (error) {
      console.error("Error inserting transcript:", error);
      new Notice(
        `Error inserting transcript: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}
