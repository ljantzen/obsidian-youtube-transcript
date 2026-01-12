import {
  Plugin,
  MarkdownView,
  Notice,
  TFile,
  TFolder,
} from "obsidian";
import type {
  YouTubeTranscriptPluginSettings,
  LLMProvider,
} from "./types";
import { DEFAULT_SETTINGS, DEFAULT_PROMPT } from "./settings";
import { extractVideoId, sanitizeFilename, validateClaudeModelName, sanitizeTagName } from "./utils";
import { getYouTubeTranscript } from "./youtube";
import { YouTubeUrlModal, RetryConfirmationModal } from "./modals";
import { YouTubeTranscriptSettingTab } from "./settingsTab";
import { UserCancelledError } from "./llm/openai";
import { generatePdfFromMarkdown } from "./pdfGenerator";

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

    // Ensure tagWithChannelName has a default value if missing (backward compatibility)
    if (this.settings.tagWithChannelName === undefined) {
      this.settings.tagWithChannelName = DEFAULT_SETTINGS.tagWithChannelName;
      await this.saveSettings();
    }

    // Ensure timestamp settings have default values if missing (backward compatibility)
    if (this.settings.includeTimestamps === undefined) {
      this.settings.includeTimestamps = DEFAULT_SETTINGS.includeTimestamps;
      await this.saveSettings();
    }
    if (this.settings.timestampFrequency === undefined) {
      this.settings.timestampFrequency = DEFAULT_SETTINGS.timestampFrequency;
      await this.saveSettings();
    }
    if (this.settings.includeTimestampsInLLM === undefined) {
      this.settings.includeTimestampsInLLM =
        DEFAULT_SETTINGS.includeTimestampsInLLM;
      await this.saveSettings();
    }

    // Ensure localVideoDirectory has a default value if missing (backward compatibility)
    if (this.settings.localVideoDirectory === undefined) {
      this.settings.localVideoDirectory = DEFAULT_SETTINGS.localVideoDirectory;
      await this.saveSettings();
    }

    // Ensure savedDirectories has a default value if missing (backward compatibility)
    if (this.settings.savedDirectories === undefined) {
      this.settings.savedDirectories = DEFAULT_SETTINGS.savedDirectories;
      await this.saveSettings();
    }

    // Ensure fileFormat has a default value if missing (backward compatibility)
    if (this.settings.fileFormat === undefined) {
      this.settings.fileFormat = DEFAULT_SETTINGS.fileFormat;
      await this.saveSettings();
    }

    // Ensure createNewFile has a default value if missing (backward compatibility)
    if (this.settings.createNewFile === undefined) {
      this.settings.createNewFile = DEFAULT_SETTINGS.createNewFile;
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
        selectedDirectory: string | null,
        tagWithChannelName: boolean,
        fileFormat: "markdown" | "pdf",
      ) => {
        const fetchingNotice = new Notice(
          "Fetching transcript from YouTube...",
          0,
        );
        try {
          const result = await getYouTubeTranscript(
            this.app,
            url,
            generateSummary,
            llmProvider,
            this.settings,
            (status: string | null) => {
              if (status === null) {
                fetchingNotice.hide();
              } else {
                fetchingNotice.setMessage(status);
              }
            },
            RetryConfirmationModal,
          );

          const { transcript, title, summary, channelName } = result;

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
              selectedDirectory,
              channelName,
              tagWithChannelName,
              fileFormat,
            );
            const formatNotice = fileFormat === "pdf" 
              ? `PDF file created successfully! (${transcript.length} characters)`
              : `Transcript file created successfully! (${transcript.length} characters)`;
            new Notice(formatNotice);
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
              channelName,
              tagWithChannelName,
            );
            new Notice(
              `Transcript fetched successfully! (${transcript.length} characters)`,
            );
          }
        } catch (error: unknown) {
          // If user cancelled, don't show an error - just silently abort
          if (error instanceof UserCancelledError) {
            fetchingNotice.hide();
            return;
          }
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          new Notice(`Error fetching transcript: ${errorMessage}`);
          console.error("Transcript fetch error:", error);
        } finally {
          fetchingNotice.hide();
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
    selectedDirectory: string | null, // null = use current file's directory, string = use this directory
    channelName: string | null,
    tagWithChannelName: boolean,
    fileFormat: "markdown" | "pdf",
  ) {
    const baseSanitizedTitle = sanitizeFilename(videoTitle);

    // Determine which directory to use
    let directory: string;
    if (selectedDirectory === null) {
      // Use current file's directory
      directory = activeFile.path.substring(0, activeFile.path.lastIndexOf("/"));
    } else {
      // Use the selected directory
      directory = selectedDirectory;
    }

    // Ensure directory exists (create if it doesn't)
    if (directory && directory.trim() !== "") {
      const dirFile = this.app.vault.getAbstractFileByPath(directory);
      if (!dirFile || !(dirFile instanceof TFolder)) {
        // Create the directory if it doesn't exist or if it exists as a file
        try {
          await this.app.vault.createFolder(directory);
        } catch (error) {
          // If folder creation fails, fall back to active file's directory
          console.warn(
            `Failed to create directory ${directory}, using active file's directory:`,
            error,
          );
          directory = activeFile.path.substring(
            0,
            activeFile.path.lastIndexOf("/"),
          );
        }
      }
    }

    // Determine file extension based on format
    const fileExtension = fileFormat === "pdf" ? "pdf" : "md";

    // Find an available path by checking if file exists (using getAbstractFileByPath which is synchronous)
    let newFilePath = directory
      ? `${directory}/${baseSanitizedTitle}.${fileExtension}`
      : `${baseSanitizedTitle}.${fileExtension}`;
    let counter = 1;
    while (this.app.vault.getAbstractFileByPath(newFilePath)) {
      const baseName = directory
        ? `${directory}/${baseSanitizedTitle}`
        : baseSanitizedTitle;
      newFilePath = `${baseName} (${counter}).${fileExtension}`;
      counter++;
    }

    // Build file content with URL, summary, and transcript
    const parts: string[] = [];

    // Add channel tag if enabled and channel name is available
    if (tagWithChannelName && channelName) {
      const sanitizedTag = sanitizeTagName(channelName);
      if (sanitizedTag) {
        parts.push(`#${sanitizedTag}`);
      }
    }

    if (includeVideoUrl) {
      parts.push(`![${videoTitle}](${videoUrl})`);
    }

    parts.push(transcript);

    const markdownContent = parts.join("\n\n");

    // Create the file based on format
    try {
      if (fileFormat === "pdf") {
        try {
          // Generate PDF from markdown
          const pdfBuffer = await generatePdfFromMarkdown(
            this.app,
            markdownContent,
          );
          // Create PDF file as binary
          await this.app.vault.createBinary(newFilePath, pdfBuffer);
        } catch (pdfError: unknown) {
          const pdfErrorMessage =
            pdfError instanceof Error ? pdfError.message : "Unknown error";
          // If PDF generation fails, show error and suggest using markdown
          new Notice(
            `PDF generation failed: ${pdfErrorMessage}. Please try markdown format instead.`,
            10000,
          );
          throw pdfError;
        }
      } else {
        // Create markdown file as text
        await this.app.vault.create(newFilePath, markdownContent);
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      // Handle race condition: if file was created between check and create
      if (
        errorMessage.includes("already exists") ||
        errorMessage.includes("file exists")
      ) {
        // Find next available path and try again
        const baseName = directory
          ? `${directory}/${baseSanitizedTitle}`
          : baseSanitizedTitle;
        while (this.app.vault.getAbstractFileByPath(newFilePath)) {
          newFilePath = `${baseName} (${counter}).${fileExtension}`;
          counter++;
        }
        if (fileFormat === "pdf") {
          const pdfBuffer = await generatePdfFromMarkdown(
            this.app,
            markdownContent,
          );
          await this.app.vault.createBinary(newFilePath, pdfBuffer);
        } else {
          await this.app.vault.create(newFilePath, markdownContent);
        }
      } else {
        throw error;
      }
    }

    // Open the file (only for markdown files, PDFs will open in system viewer)
    if (fileFormat === "markdown") {
      await this.app.workspace.openLinkText(newFilePath, "", false);
    } else {
      // For PDF, just show a notice
      new Notice(`PDF file created: ${newFilePath}`);
    }
  }

  insertTranscript(
    view: MarkdownView,
    transcript: string,
    videoTitle: string,
    videoUrl: string,
    summary: string | null,
    includeVideoUrl: boolean,
    channelName: string | null,
    tagWithChannelName: boolean,
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

      // Add channel tag if enabled and channel name is available
      if (tagWithChannelName && channelName) {
        const sanitizedTag = sanitizeTagName(channelName);
        if (sanitizedTag) {
          parts.push(`#${sanitizedTag}`);
        }
      }

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
