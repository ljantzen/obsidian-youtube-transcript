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
  VideoDetails,
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

    // This adds a command that fetches transcript from clipboard using default settings
    this.addCommand({
      id: "fetch-youtube-transcript-from-clipboard",
      name: "Fetch YouTube transcript from clipboard",
      callback: () => {
        this.fetchTranscriptFromClipboard();
      },
    });
  }

  onunload() {
    // Plugin cleanup if needed
  }

  async loadSettings() {
    const loadedData = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedData);

    // Backward compatibility: migrate from old "none" provider to useLLMProcessing toggle
    if (this.settings.useLLMProcessing === undefined) {
      // Check if old data had "none" as provider or no provider set
      const oldProvider = loadedData?.llmProvider;
      if (oldProvider === "none" || oldProvider === undefined) {
        this.settings.useLLMProcessing = false;
      } else {
        // Had a real provider, so enable LLM processing
        this.settings.useLLMProcessing = true;
      }
    }

    // Backward compatibility: if llmProvider is not set or was "none", infer from existing keys
    if (
      this.settings.llmProvider === undefined ||
      (loadedData?.llmProvider as string) === "none"
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
        this.settings.llmProvider = "openai"; // Default to openai
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

    // Ensure defaultDirectory has a default value if missing (backward compatibility)
    if (this.settings.defaultDirectory === undefined) {
      this.settings.defaultDirectory = DEFAULT_SETTINGS.defaultDirectory;
      await this.saveSettings();
    }

    // Validate that defaultDirectory is still in savedDirectories (if set)
    if (this.settings.defaultDirectory) {
      const savedDirs = this.settings.savedDirectories || [];
      if (!savedDirs.includes(this.settings.defaultDirectory)) {
        // Default directory no longer exists in saved directories, clear it
        this.settings.defaultDirectory = null;
        await this.saveSettings();
      }
    }

    // Ensure useAttachmentFolderForPdf has a default value if missing (backward compatibility)
    if (this.settings.useAttachmentFolderForPdf === undefined) {
      this.settings.useAttachmentFolderForPdf = DEFAULT_SETTINGS.useAttachmentFolderForPdf;
      await this.saveSettings();
    }

    // Ensure singleLineTranscript has a default value if missing (backward compatibility)
    if (this.settings.singleLineTranscript === undefined) {
      this.settings.singleLineTranscript = DEFAULT_SETTINGS.singleLineTranscript;
      await this.saveSettings();
    }

    // Ensure createPdfCoverNote has a default value if missing (backward compatibility)
    if (this.settings.createPdfCoverNote === undefined) {
      this.settings.createPdfCoverNote = DEFAULT_SETTINGS.createPdfCoverNote;
      await this.saveSettings();
    }

    // Ensure pdfCoverNoteLocation has a default value if missing (backward compatibility)
    if (this.settings.pdfCoverNoteLocation === undefined) {
      this.settings.pdfCoverNoteLocation = DEFAULT_SETTINGS.pdfCoverNoteLocation;
      await this.saveSettings();
    }

    // Ensure pdfCoverNoteTemplate has a default value if missing (backward compatibility)
    if (this.settings.pdfCoverNoteTemplate === undefined) {
      this.settings.pdfCoverNoteTemplate = DEFAULT_SETTINGS.pdfCoverNoteTemplate;
      await this.saveSettings();
    }

    // Migrate nestPdfUnderCoverNote to useAttachmentFolderForPdf (backward compatibility)
    if ((this.settings as any).nestPdfUnderCoverNote !== undefined) {
      // If nestPdfUnderCoverNote was enabled, enable useAttachmentFolderForPdf to preserve behavior
      if ((this.settings as any).nestPdfUnderCoverNote === true) {
        this.settings.useAttachmentFolderForPdf = true;
      }
      // Remove the old setting
      delete (this.settings as any).nestPdfUnderCoverNote;
      await this.saveSettings();
    }

    // Ensure pdfAttachmentFolderName has a default value if missing (backward compatibility)
    if (this.settings.pdfAttachmentFolderName === undefined) {
      this.settings.pdfAttachmentFolderName = DEFAULT_SETTINGS.pdfAttachmentFolderName;
      await this.saveSettings();
    }

    // Ensure preferredLanguage has a default value if missing (backward compatibility)
    if (this.settings.preferredLanguage === undefined) {
      this.settings.preferredLanguage = DEFAULT_SETTINGS.preferredLanguage;
      await this.saveSettings();
    }

    // Ensure forceLLMLanguage has a default value if missing (backward compatibility)
    if (this.settings.forceLLMLanguage === undefined) {
      this.settings.forceLLMLanguage = DEFAULT_SETTINGS.forceLLMLanguage;
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

  /**
   * Gets the attachment folder path from Obsidian settings
   * Returns null if not set or if attachment folder is disabled
   * Handles "below the current folder" case (returns "." which means relative to current file)
   */
  getAttachmentFolderPath(): string | null {
    // Access Obsidian's attachment folder setting through the vault config
    // Note: attachmentFolderPath is not in the public Vault type but exists at runtime
    const vaultConfig = (this.app.vault as unknown as { config?: { attachmentFolderPath?: string; attachmentSubfolder?: string } }).config;
    const attachmentFolderPath = vaultConfig?.attachmentFolderPath;

    if (!attachmentFolderPath || attachmentFolderPath.trim() === "") {
      return null;
    }

    // "." means "below the current folder" - return it as-is, caller will handle it
    if (attachmentFolderPath === ".") {
      return ".";
    }

    // Return the configured folder path
    return attachmentFolderPath;
  }

  /**
   * Gets the attachment subfolder name from Obsidian settings
   * Used when attachmentFolderPath is "." (below the current folder)
   * Returns "attachments" (lowercase) as default if not configured, matching Obsidian's default
   */
  getAttachmentSubfolderName(): string {
    const vaultConfig = (this.app.vault as unknown as { config?: { attachmentSubfolder?: string } }).config;
    const attachmentSubfolder = vaultConfig?.attachmentSubfolder;
    
    // Default to "attachments" (lowercase) if not configured, matching Obsidian's default behavior
    return attachmentSubfolder && attachmentSubfolder.trim() !== "" 
      ? attachmentSubfolder.trim() 
      : "attachments";
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
        useLLM: boolean,
        llmProvider: LLMProvider,
        selectedDirectory: string | null,
        tagWithChannelName: boolean,
        fileFormat: "markdown" | "pdf",
        languageCode: string | null,
      ) => {
        await this.processTranscript(
          url,
          createNewFile,
          includeVideoUrl,
          generateSummary,
          useLLM,
          llmProvider,
          selectedDirectory,
          tagWithChannelName,
          fileFormat,
          languageCode,
        );
      },
    ).open();
  }

  async fetchTranscriptFromClipboard() {
    try {
      // Read clipboard
      const clipboardText = await navigator.clipboard.readText();
      
      if (!clipboardText || clipboardText.trim() === "") {
        new Notice("No text found in clipboard", 10000);
        return;
      }

      // Validate YouTube URL
      const trimmedUrl = clipboardText.trim();
      const videoId = extractVideoId(trimmedUrl);
      
      if (!videoId) {
        new Notice("Invalid YouTube URL in clipboard. Please copy a valid YouTube URL or video ID.", 10000);
        return;
      }

      // Use default settings
      let createNewFile = this.settings.createNewFile ?? false;
      const includeVideoUrl = this.settings.includeVideoUrl ?? false;
      const generateSummary = this.settings.generateSummary ?? false;
      const tagWithChannelName = this.settings.tagWithChannelName ?? false;
      const fileFormat = this.settings.fileFormat ?? "markdown";

      // PDF format always requires creating a new file
      if (fileFormat === "pdf") {
        createNewFile = true;
      }

      // Determine if LLM processing should be used
      const useLLM = this.settings.useLLMProcessing && this.hasProviderKey(this.settings.llmProvider);
      const llmProvider = this.settings.llmProvider;

      // Determine selected directory - use default directory if set, otherwise null
      const selectedDirectory = this.settings.defaultDirectory || null;

      // Use preferred language setting, or null for auto-select
      const languageCode = this.settings.preferredLanguage && this.settings.preferredLanguage.trim() !== ""
        ? this.settings.preferredLanguage
        : null;

      // Process transcript with default settings
      await this.processTranscript(
        trimmedUrl,
        createNewFile,
        includeVideoUrl,
        generateSummary,
        useLLM,
        llmProvider,
        selectedDirectory,
        tagWithChannelName,
        fileFormat,
        languageCode,
      );
    } catch (error: unknown) {
      // Handle clipboard access errors
      if (error instanceof Error && error.name === "NotAllowedError") {
        new Notice("Clipboard access denied. Please grant clipboard permissions.", 10000);
      } else if (error instanceof Error && error.name === "NotFoundError") {
        new Notice("No text found in clipboard", 10000);
      } else {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        new Notice(`Error reading clipboard: ${errorMessage}`, 10000);
        console.error("Clipboard read error:", error);
      }
    }
  }

  async processTranscript(
    url: string,
    createNewFile: boolean,
    includeVideoUrl: boolean,
    generateSummary: boolean,
    useLLM: boolean,
    llmProvider: LLMProvider,
    selectedDirectory: string | null,
    tagWithChannelName: boolean,
    fileFormat: "markdown" | "pdf",
    languageCode: string | null,
  ) {
    const fetchingNotice = new Notice(
      "Fetching transcript from YouTube...",
      0,
    );
    try {
      // Use provided language code, or fall back to preferred languages setting, or null for auto-select
      // Note: preferredLanguage can be a comma-separated list, which will be handled in getYouTubeTranscript
      const languageToUse = languageCode !== null 
        ? languageCode 
        : (this.settings.preferredLanguage && this.settings.preferredLanguage.trim() !== "" 
            ? this.settings.preferredLanguage 
            : null);

      // Only use LLM if explicitly enabled and provider has a key
      const effectiveLLMProvider = useLLM && this.hasProviderKey(llmProvider) ? llmProvider : null;

      const result = await getYouTubeTranscript(
        this.app,
        url,
        generateSummary,
        effectiveLLMProvider,
        this.settings,
        (status: string | null) => {
          if (status === null) {
            fetchingNotice.hide();
          } else {
            fetchingNotice.setMessage(status);
          }
        },
        RetryConfirmationModal,
        languageToUse,
      );

      const { transcript, title, summary, channelName, videoDetails } = result;

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
        // Only require active file if no directory is selected (need to use current file's directory)
        // Exception: For PDFs with attachment folder enabled, we can use the attachment folder even without an active file
        // Note: If attachment folder is "." (below current folder), we can still use it if a default directory is set
        let canUseAttachmentFolder = false;
        if (fileFormat === "pdf" && this.settings.useAttachmentFolderForPdf) {
          const attachmentFolder = this.getAttachmentFolderPath();
          // Can use attachment folder if:
          // 1. It's set and not "." (absolute path) - can use without active file
          // 2. It's "." but we have a selected directory - can use selected directory as base
          canUseAttachmentFolder = attachmentFolder !== null && 
            (attachmentFolder !== "." || selectedDirectory !== null);
        }
        if (!activeFile && !selectedDirectory && !canUseAttachmentFolder) {
          throw new Error(
            "Please open a file first to determine the directory, or set a default directory in settings",
          );
        }

        await this.createTranscriptFile(
          activeFile || null,
          title,
          transcript,
          normalizedUrl,
          summary,
          includeVideoUrl,
          selectedDirectory,
          channelName,
          tagWithChannelName,
          fileFormat,
          videoDetails,
        );
        const formatNotice = fileFormat === "pdf" 
          ? `PDF file created successfully! (${transcript.length} characters)`
          : `Transcript file created successfully! (${transcript.length} characters)`;
        new Notice(formatNotice);
      } else {
        // PDF format cannot be inserted into existing files, must create new file
        if (fileFormat === "pdf") {
          new Notice("PDF format requires creating a new file. Please enable 'Create new file' in settings or use the modal to create a PDF.", 10000);
          return;
        }

        const activeView =
          this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeView) {
          new Notice("Please open a markdown file first", 10000);
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
      new Notice(`Error fetching transcript: ${errorMessage}`, 10000);
      console.error("Transcript fetch error:", error);
    } finally {
      fetchingNotice.hide();
    }
  }

  async createTranscriptFile(
    activeFile: TFile | null,
    videoTitle: string,
    transcript: string,
    videoUrl: string,
    summary: string | null,
    includeVideoUrl: boolean,
    selectedDirectory: string | null, // null = use current file's directory, string = use this directory
    channelName: string | null,
    tagWithChannelName: boolean,
    fileFormat: "markdown" | "pdf",
    videoDetails: VideoDetails | null,
  ) {
    // Apply note name template
    const noteNameTemplate = this.settings.defaultNoteName || "{VideoName}";
    let noteName = noteNameTemplate
      .replace(/{VideoName}/g, videoTitle)
      .replace(/{ChannelName}/g, channelName || "");
    // Clean up any empty segments from missing channel name
    noteName = noteName.replace(/\s+/g, " ").trim();
    const baseSanitizedTitle = sanitizeFilename(noteName || videoTitle);

    // Determine which directory to use
    let directory: string;
    
    // For PDFs, check if we should use the attachment folder
    if (
      fileFormat === "pdf" &&
      this.settings.useAttachmentFolderForPdf
    ) {
      const attachmentFolder = this.getAttachmentFolderPath();
      if (attachmentFolder) {
        // Handle explicit current folder (.) or relative paths (starting with ./)
        // "Subfolder under current folder" usually results in "./Attachments"
        if (attachmentFolder === "." || attachmentFolder.startsWith("./")) {
          // "below the current folder" - use selected directory or current file's directory + subfolder
          
          // Determine the subfolder name
          // If attachmentFolder is ".", we use the configured subfolder name (if any)
          // If attachmentFolder starts with "./", we extract the subfolder from the path
          let subfolderName = "";
          
          if (attachmentFolder === ".") {
             // If ".", check if there's a separate attachmentSubfolder setting
             // This covers "Same folder as current file" (if subfolder is empty/undefined)
             // OR complex configurations
             subfolderName = this.getAttachmentSubfolderName();
             if (subfolderName === "attachments") {
                 // If getAttachmentSubfolderName returned default "attachments" but config is just ".",
                 // it means "Same folder as current file".
                 // We should verify if "attachments" is actually configured or just a default fallback.
                 // However, previously we assumed "." meant "use subfolder".
                 // Let's assume "." implies same directory unless attachmentSubfolder is explicitly set.
                 
                 const vaultConfig = (this.app.vault as unknown as { config?: { attachmentSubfolder?: string } }).config;
                 if (!vaultConfig?.attachmentSubfolder) {
                     subfolderName = ""; // No subfolder, same directory
                 }
             }
          } else {
              // Extract subfolder from "./folderName"
              subfolderName = attachmentFolder.substring(2);
          }

          // If a directory was explicitly selected, use that as the base
          if (selectedDirectory !== null) {
            const baseDir = selectedDirectory;
            if (subfolderName && subfolderName.trim() !== "") {
                directory = baseDir === "" 
                    ? subfolderName 
                    : `${baseDir}/${subfolderName}`;
            } else {
                directory = baseDir;
            }
          } else {
            // Fall back to current file's directory
            if (!activeFile) {
              throw new Error(
                "Cannot use 'below the current folder' attachment setting: no active file and no directory specified",
              );
            }

            // Verify activeFile has a valid path
            if (!activeFile.path || activeFile.path.trim() === "") {
              throw new Error(
                "Active file has no path. Cannot determine attachment directory.",
              );
            }

            // Get the directory of the current file
            // Handle both files in root and files in subdirectories
            const lastSlashIndex = activeFile.path.lastIndexOf("/");
            const fileDir = lastSlashIndex >= 0
              ? activeFile.path.substring(0, lastSlashIndex)
              : ""; // File is in root

            // Combine
            if (subfolderName && subfolderName.trim() !== "") {
                directory = fileDir === "" ? subfolderName : `${fileDir}/${subfolderName}`;
            } else {
                directory = fileDir;
            }
          }
          
        } else {
          // Use the configured attachment folder (absolute path)
          directory = attachmentFolder;
        }
      } else {
        // Attachment folder not set, fall back to normal directory selection
        if (selectedDirectory === null) {
          if (!activeFile) {
            throw new Error(
              "Cannot determine directory: no active file and no directory specified",
            );
          }
          directory = activeFile.path.substring(
            0,
            activeFile.path.lastIndexOf("/"),
          );
        } else {
          directory = selectedDirectory;
        }
      }
    } else {
      // Normal directory selection for markdown files or when attachment folder is disabled
      if (selectedDirectory === null) {
        // Use current file's directory (activeFile must exist in this case)
        if (!activeFile) {
          throw new Error(
            "Cannot determine directory: no active file and no directory specified",
          );
        }
        directory = activeFile.path.substring(0, activeFile.path.lastIndexOf("/"));
      } else {
        // Use the selected directory
        directory = selectedDirectory;
      }
    }

    // Ensure directory exists (create if it doesn't)
    if (directory && directory.trim() !== "") {
      const dirFile = this.app.vault.getAbstractFileByPath(directory);
      if (!dirFile || !(dirFile instanceof TFolder)) {
        // Create the directory if it doesn't exist or if it exists as a file
        try {
          await this.app.vault.createFolder(directory);
        } catch (error) {
          // If folder creation fails, try to fall back to active file's directory if available
          // But preserve the attachment subfolder if we're using attachment folder
          if (activeFile) {
            const isUsingAttachmentFolder = fileFormat === "pdf" && 
              this.settings.useAttachmentFolderForPdf && 
              (this.getAttachmentFolderPath() === "." || this.getAttachmentFolderPath()?.startsWith("./"));
            
            if (isUsingAttachmentFolder) {
              // Preserve the attachment subfolder structure
              const lastSlashIndex = activeFile.path.lastIndexOf("/");
              const fileDir = lastSlashIndex >= 0 
                ? activeFile.path.substring(0, lastSlashIndex)
                : ""; // File is in root
              
              // Recalculate subfolder name using same logic as above
              let subfolderName = "";
              const attachmentFolder = this.getAttachmentFolderPath();
              
              if (attachmentFolder === ".") {
                  const vaultConfig = (this.app.vault as unknown as { config?: { attachmentSubfolder?: string } }).config;
                  if (vaultConfig?.attachmentSubfolder) {
                      subfolderName = vaultConfig.attachmentSubfolder.trim();
                  }
              } else if (attachmentFolder && attachmentFolder.startsWith("./")) {
                  subfolderName = attachmentFolder.substring(2);
              }

              directory = fileDir === "" 
                ? (subfolderName || "") 
                : (subfolderName ? `${fileDir}/${subfolderName}` : fileDir);

              // If directory became empty string (root), it technically exists, but let's be safe
              if (directory === "") directory = "/"; 
              
              if (directory !== "/") {
                  console.warn(
                    `Failed to create directory, retrying with: ${directory}`,
                    error,
                  );
                  // Try creating again with the recomputed path
                  try {
                    await this.app.vault.createFolder(directory);
                  } catch (retryError) {
                      // If it already exists, ignore
                      const exists = this.app.vault.getAbstractFileByPath(directory);
                      if (!exists) {
                        throw new Error(
                          `Failed to create directory ${directory}: ${retryError instanceof Error ? retryError.message : "Unknown error"}`,
                        );
                      }
                  }
              }
            } else {
              console.warn(
                `Failed to create directory ${directory}, using active file's directory:`,
                error,
              );
              directory = activeFile.path.substring(
                0,
                activeFile.path.lastIndexOf("/"),
              );
            }
          } else {
            // If no active file, throw the error since we can't fall back
            throw new Error(
              `Failed to create directory ${directory}: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
          }
        }
      }
    }

    // Determine file extension based on format
    const fileExtension = fileFormat === "pdf" ? "pdf" : "md";

    // Check if we should nest PDF under cover note (when useAttachmentFolderForPdf and cover notes are enabled)
    if (
      fileFormat === "pdf" &&
      this.settings.createPdfCoverNote &&
      this.settings.useAttachmentFolderForPdf
    ) {
      // Calculate cover note directory
      // Use a temporary PDF path based on the original directory for fallback calculation
      const tempPdfPath = directory
        ? `${directory}/${baseSanitizedTitle}.${fileExtension}`
        : `${baseSanitizedTitle}.${fileExtension}`;
      const coverNoteDirectory = this.calculateCoverNoteDirectory(
        tempPdfPath,
        videoTitle,
        channelName,
      );
      
      // Calculate attachment folder name
      const attachmentFolderName = this.calculatePdfAttachmentFolderName(
        baseSanitizedTitle,
        videoTitle,
        channelName,
      );
      
      // Update directory to nest PDF under cover note
      if (coverNoteDirectory && coverNoteDirectory.trim() !== "") {
        directory = `${coverNoteDirectory}/${attachmentFolderName}`;
      } else {
        directory = attachmentFolderName;
      }
      
      // Ensure the nested directory exists
      if (directory && directory.trim() !== "") {
        const dirFile = this.app.vault.getAbstractFileByPath(directory);
        if (!dirFile || !(dirFile instanceof TFolder)) {
          try {
            await this.app.vault.createFolder(directory);
          } catch (error) {
            console.warn(`Failed to create nested PDF directory: ${error}`);
            // Fall back to original directory
            // (directory will remain as calculated, but creation might fail)
          }
        }
      }
    }

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

    // Add frontmatter with videoDetails if available
    if (videoDetails) {
      const frontmatter: Record<string, unknown> = {
        title: videoTitle,
        url: videoUrl,
      };

      // Add common videoDetails fields to frontmatter
      if (videoDetails.videoId) frontmatter.videoId = videoDetails.videoId;
      if (videoDetails.author) frontmatter.channel = videoDetails.author;
      if (videoDetails.channelId) frontmatter.channelId = videoDetails.channelId;
      if (videoDetails.lengthSeconds) frontmatter.duration = videoDetails.lengthSeconds;
      if (videoDetails.viewCount) frontmatter.views = videoDetails.viewCount;
      if (videoDetails.publishDate) frontmatter.published = videoDetails.publishDate;
      if (videoDetails.description) frontmatter.description = videoDetails.description;
      if (videoDetails.isLiveContent !== undefined) frontmatter.isLive = videoDetails.isLiveContent;
      if (videoDetails.isPrivate !== undefined) frontmatter.isPrivate = videoDetails.isPrivate;
      if (videoDetails.isUnlisted !== undefined) frontmatter.isUnlisted = videoDetails.isUnlisted;

      // Add frontmatter block
      const frontmatterLines = ["---"];
      for (const [key, value] of Object.entries(frontmatter)) {
        if (value !== null && value !== undefined) {
          const stringValue = typeof value === "string" && value.includes("\n")
            ? `"${value.replace(/"/g, '\\"')}"`
            : typeof value === "string"
            ? `"${value}"`
            : String(value);
          frontmatterLines.push(`${key}: ${stringValue}`);
        }
      }
      frontmatterLines.push("---");
      parts.push(frontmatterLines.join("\n"));
    }

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

    // Create cover note for PDF if enabled
    if (fileFormat === "pdf" && this.settings.createPdfCoverNote) {
      await this.createPdfCoverNote(
        newFilePath,
        videoTitle,
        videoUrl,
        summary,
        channelName,
        tagWithChannelName,
        videoDetails,
      );
    }

    // Open the file (only for markdown files, PDFs will open in system viewer)
    if (fileFormat === "markdown") {
      await this.app.workspace.openLinkText(newFilePath, "", false);
    } else {
      // For PDF, just show a notice
      new Notice(`PDF file created: ${newFilePath}`);
    }
  }

  /**
   * Calculates the cover note directory based on settings and template variables
   * @param pdfFilePath The path to the PDF file (used as fallback if location is empty)
   * @param videoTitle The video title (for {VideoName} template variable)
   * @param channelName The channel name (for {ChannelName} template variable, can be null)
   * @returns The calculated cover note directory path
   */
  private calculateCoverNoteDirectory(
    pdfFilePath: string,
    videoTitle: string,
    channelName: string | null,
  ): string {
    // Process template variables in cover note location
    let coverNoteLocation = this.settings.pdfCoverNoteLocation || "";
    
    // Replace template variables
    if (channelName) {
      const sanitizedChannelName = sanitizeFilename(channelName);
      coverNoteLocation = coverNoteLocation.replace(/{ChannelName}/g, sanitizedChannelName);
    } else {
      coverNoteLocation = coverNoteLocation.replace(/{ChannelName}/g, "");
    }
    
    const sanitizedVideoName = sanitizeFilename(videoTitle);
    coverNoteLocation = coverNoteLocation.replace(/{VideoName}/g, sanitizedVideoName);
    
    // Clean up any double slashes or trailing slashes
    coverNoteLocation = coverNoteLocation.replace(/\/+/g, "/").replace(/^\/|\/$/g, "");

    // Determine cover note directory
    if (coverNoteLocation && coverNoteLocation.trim() !== "") {
      // Use the specified cover note location
      return coverNoteLocation;
    } else {
      // Use the same directory as the PDF file
      const pdfDir = pdfFilePath.substring(0, pdfFilePath.lastIndexOf("/"));
      return pdfDir || "";
    }
  }

  /**
   * Calculates the attachment folder name for nesting PDFs under cover notes
   * @param pdfFileNameWithoutExt The PDF filename without extension (used as fallback)
   * @param videoTitle The video title (for {VideoName} template variable)
   * @param channelName The channel name (for {ChannelName} template variable, can be null)
   * @returns The calculated attachment folder name
   */
  private calculatePdfAttachmentFolderName(
    pdfFileNameWithoutExt: string,
    videoTitle: string,
    channelName: string | null,
  ): string {
    let folderName = this.settings.pdfAttachmentFolderName || "";
    
    if (folderName.trim() === "") {
      // If empty, use PDF filename without extension
      return pdfFileNameWithoutExt;
    }
    
    // Replace template variables
    if (channelName) {
      const sanitizedChannelName = sanitizeFilename(channelName);
      folderName = folderName.replace(/{ChannelName}/g, sanitizedChannelName);
    } else {
      folderName = folderName.replace(/{ChannelName}/g, "");
    }
    
    const sanitizedVideoName = sanitizeFilename(videoTitle);
    folderName = folderName.replace(/{VideoName}/g, sanitizedVideoName);
    
    // Clean up any slashes (folder name should not contain path separators)
    folderName = folderName.replace(/\/+/g, "").trim();
    
    // If still empty after processing, use PDF filename
    if (folderName === "") {
      return pdfFileNameWithoutExt;
    }
    
    return folderName;
  }

  async createPdfCoverNote(
    pdfFilePath: string,
    videoTitle: string,
    videoUrl: string,
    summary: string | null,
    channelName: string | null,
    tagWithChannelName: boolean,
    videoDetails: VideoDetails | null,
  ) {
    // Calculate cover note directory
    let coverNoteDirectory = this.calculateCoverNoteDirectory(
      pdfFilePath,
      videoTitle,
      channelName,
    );

    // Ensure cover note directory exists
    if (coverNoteDirectory && coverNoteDirectory.trim() !== "") {
      const dirFile = this.app.vault.getAbstractFileByPath(coverNoteDirectory);
      if (!dirFile || !(dirFile instanceof TFolder)) {
        try {
          await this.app.vault.createFolder(coverNoteDirectory);
        } catch (error) {
          // If folder creation fails, fall back to PDF's directory
          const pdfDir = pdfFilePath.substring(0, pdfFilePath.lastIndexOf("/"));
          coverNoteDirectory = pdfDir || "";
          console.warn(
            `Failed to create cover note directory, using PDF directory:`,
            error,
          );
        }
      }
    }

    // Get PDF filename without extension for the cover note title
    const pdfFileName = pdfFilePath.substring(pdfFilePath.lastIndexOf("/") + 1);
    const pdfFileNameWithoutExt = pdfFileName.replace(/\.pdf$/, "");
    
    // Use absolute path from vault root for the PDF link (Obsidian supports this)
    // Remove leading slash if present, as Obsidian paths are relative to vault root
    const pdfLinkPath = pdfFilePath.startsWith("/") ? pdfFilePath.substring(1) : pdfFilePath;

    // Build cover note content - use template if specified, otherwise use default
    let coverNoteContent: string;
    
    if (this.settings.pdfCoverNoteTemplate && this.settings.pdfCoverNoteTemplate.trim() !== "") {
      // Use template file
      try {
        const templateFile = this.app.vault.getAbstractFileByPath(this.settings.pdfCoverNoteTemplate);
        if (templateFile && templateFile instanceof TFile) {
          const templateContent = await this.app.vault.read(templateFile);
          
          // Replace template variables
          let processedContent = templateContent;
          
          // Replace {ChannelName}
          if (channelName) {
            const sanitizedChannelName = sanitizeFilename(channelName);
            processedContent = processedContent.replace(/{ChannelName}/g, sanitizedChannelName);
          } else {
            processedContent = processedContent.replace(/{ChannelName}/g, "");
          }
          
          // Replace {VideoName}
          const sanitizedVideoName = sanitizeFilename(videoTitle);
          processedContent = processedContent.replace(/{VideoName}/g, sanitizedVideoName);
          
          // Replace {VideoUrl}
          processedContent = processedContent.replace(/{VideoUrl}/g, videoUrl);
          
          // Replace {Summary}
          const summaryText = summary || "";
          processedContent = processedContent.replace(/{Summary}/g, summaryText);
          
          // Replace {PdfLink}
          processedContent = processedContent.replace(/{PdfLink}/g, pdfLinkPath);
          
          // Replace videoDetails variables
          if (videoDetails) {
            processedContent = this.replaceVideoDetailsVariables(processedContent, videoDetails);
          }
          
          coverNoteContent = processedContent;
        } else {
          // Template file not found, use default
          console.warn(`Template file not found: ${this.settings.pdfCoverNoteTemplate}, using default template`);
          coverNoteContent = this.buildDefaultCoverNoteContent(
            videoTitle,
            videoUrl,
            summary,
            channelName,
            tagWithChannelName,
            pdfLinkPath,
          );
        }
      } catch (error) {
        // Error reading template, use default
        console.error(`Error reading template file: ${error}`);
        new Notice(`Error reading template file: ${error instanceof Error ? error.message : "Unknown error"}`, 10000);
        coverNoteContent = this.buildDefaultCoverNoteContent(
          videoTitle,
          videoUrl,
          summary,
          channelName,
          tagWithChannelName,
          pdfLinkPath,
        );
      }
    } else {
      // Use default template
      coverNoteContent = this.buildDefaultCoverNoteContent(
        videoTitle,
        videoUrl,
        summary,
        channelName,
        tagWithChannelName,
        pdfLinkPath,
      );
    }

    // Create cover note file - apply cover note name template
    // Extract PDF directory name (just the folder name, not full path)
    const pdfDirPath = pdfFilePath.substring(0, pdfFilePath.lastIndexOf("/"));
    const pdfDirectory = pdfDirPath.substring(pdfDirPath.lastIndexOf("/") + 1) || "";
    
    const coverNoteTemplate = this.settings.defaultCoverNoteName || "{VideoName}";
    let coverNoteName = coverNoteTemplate
      .replace(/{VideoName}/g, videoTitle)
      .replace(/{ChannelName}/g, channelName || "")
      .replace(/{PdfDirectory}/g, pdfDirectory);
    // Clean up any empty segments from missing channel name
    coverNoteName = coverNoteName.replace(/\s+/g, " ").trim();
    const sanitizedCoverNoteName = sanitizeFilename(coverNoteName || videoTitle);
    
    const coverNoteFileName = `${sanitizedCoverNoteName}.md`;
    const coverNotePath = coverNoteDirectory
      ? `${coverNoteDirectory}/${coverNoteFileName}`
      : coverNoteFileName;

    // Check if cover note already exists and handle naming conflicts
    let finalCoverNotePath = coverNotePath;
    let coverNoteCounter = 1;
    while (this.app.vault.getAbstractFileByPath(finalCoverNotePath)) {
      const baseName = coverNoteDirectory
        ? `${coverNoteDirectory}/${sanitizedCoverNoteName}`
        : sanitizedCoverNoteName;
      finalCoverNotePath = `${baseName} (${coverNoteCounter}).md`;
      coverNoteCounter++;
    }

    try {
      await this.app.vault.create(finalCoverNotePath, coverNoteContent);
      new Notice(`Cover note created: ${finalCoverNotePath}`);
      // Open the cover note
      await this.app.workspace.openLinkText(finalCoverNotePath, "", false);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Error creating cover note:", error);
      new Notice(`Error creating cover note: ${errorMessage}`, 10000);
    }
  }

  private buildDefaultCoverNoteContent(
    videoTitle: string,
    videoUrl: string,
    summary: string | null,
    channelName: string | null,
    tagWithChannelName: boolean,
    pdfLinkPath: string,
  ): string {
    const coverNoteParts: string[] = [];

    // Add channel tag if enabled and channel name is available
    if (tagWithChannelName && channelName) {
      const sanitizedTag = sanitizeTagName(channelName);
      if (sanitizedTag) {
        coverNoteParts.push(`#${sanitizedTag}`);
      }
    }

    // Add video URL if available
    coverNoteParts.push(`![${videoTitle}](${videoUrl})`);

    // Add link to PDF (using absolute path from vault root)
    coverNoteParts.push(`[[${pdfLinkPath}|View PDF Transcript]]`);

    // Add summary if available
    if (summary) {
      coverNoteParts.push(`## Summary\n\n${summary}`);
    }

    return coverNoteParts.join("\n\n");
  }

  /**
   * Replaces videoDetails variables in template content
   * Supports {VideoDetails.*} syntax for any field in videoDetails
   */
  private replaceVideoDetailsVariables(
    content: string,
    videoDetails: VideoDetails,
  ): string {
    let processedContent = content;

    // Replace common videoDetails fields with specific variable names
    const commonFields: Record<string, string> = {
      VideoId: videoDetails.videoId || "",
      LengthSeconds: videoDetails.lengthSeconds || "",
      ViewCount: videoDetails.viewCount || "",
      PublishDate: videoDetails.publishDate || "",
      Description: videoDetails.description || videoDetails.shortDescription || "",
      ChannelId: videoDetails.channelId || "",
      IsLive: videoDetails.isLiveContent ? "true" : "false",
      IsPrivate: videoDetails.isPrivate ? "true" : "false",
      IsUnlisted: videoDetails.isUnlisted ? "true" : "false",
    };

    // Replace common field variables
    for (const [key, value] of Object.entries(commonFields)) {
      const regex = new RegExp(`\\{${key}\\}`, "g");
      processedContent = processedContent.replace(regex, String(value));
    }

    // Replace {VideoDetails.*} pattern for any field
    const videoDetailsRegex = /\{VideoDetails\.([^}]+)\}/g;
    processedContent = processedContent.replace(
      videoDetailsRegex,
      (match, fieldPath) => {
        const value = this.getNestedValue(videoDetails, fieldPath);
        return value !== undefined && value !== null ? String(value) : "";
      },
    );

    return processedContent;
  }

  /**
   * Gets a nested value from an object using dot notation
   */
  private getNestedValue(obj: unknown, path: string): unknown {
    const parts = path.split(".");
    let current: unknown = obj;
    for (const part of parts) {
      if (
        current &&
        typeof current === "object" &&
        part in current
      ) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }
    return current;
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
        new Notice("The editor is not available", 10000);
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
        10000,
      );
    }
  }
}
