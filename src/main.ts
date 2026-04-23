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
  TranscriptSegment,
  VideoDetails,
  FileFormat,
  ProcessTranscriptOptions,
  TranscriptFileOptions,
} from "./types";
import { DEFAULT_SETTINGS, DEFAULT_PROMPT } from "./settings";
import { extractVideoId, sanitizeFilename, validateClaudeModelName, sanitizeTagName } from "./utils";
import { hasProviderKey as hasProviderKeyFn } from "./providerUtils";
import { replaceTemplateVariables } from "./utils/templateVariables";
import { normalizePath, normalizeVaultPath } from "./utils/pathUtils";
import { getYouTubeTranscript } from "./youtube";
import { getFormatHandler } from "./fileFormatHandlers";
import {
  YouTubeUrlModal,
  RetryConfirmationModal,
  DuplicateNoteErrorModal,
  MultipleFormatsWithCoverNoteModal,
  TranscriptFetchErrorModal,
} from "./modals";
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
    await this.runSettingsMigrations(loadedData);
  }

  private async runSettingsMigrations(loadedData: Record<string, unknown> | null) {
    let changed = false;

    // useLLMProcessing: infer from old "none" provider
    if (loadedData?.useLLMProcessing === undefined) {
      const oldProvider = loadedData?.llmProvider;
      this.settings.useLLMProcessing = oldProvider !== "none" && oldProvider !== undefined;
      changed = true;
    }

    // llmProvider: infer from saved keys if was "none" or missing
    if (
      this.settings.llmProvider === undefined ||
      (loadedData?.llmProvider as string) === "none"
    ) {
      if (this.settings.openaiKey?.trim()) {
        this.settings.llmProvider = "openai";
      } else if (this.settings.geminiKey?.trim()) {
        this.settings.llmProvider = "gemini";
      } else if (this.settings.claudeKey?.trim()) {
        this.settings.llmProvider = "claude";
      } else {
        this.settings.llmProvider = DEFAULT_SETTINGS.llmProvider;
      }
      changed = true;
    }

    // claudeModel: migrate v3 model names to v4
    if (this.settings.claudeModel && !validateClaudeModelName(this.settings.claudeModel)) {
      this.settings.claudeModel = this.settings.claudeModel.includes("opus")
        ? "claude-opus-4-20250514"
        : DEFAULT_SETTINGS.claudeModel;
      changed = true;
    }

    // prompt: repair empty saved value
    if (!this.settings.prompt || this.settings.prompt.trim() === "") {
      this.settings.prompt = DEFAULT_PROMPT;
      changed = true;
    }

    // openaiTimeout: repair zero/negative saved value
    if (!this.settings.openaiTimeout || this.settings.openaiTimeout <= 0) {
      this.settings.openaiTimeout = DEFAULT_SETTINGS.openaiTimeout;
      changed = true;
    }

    // includeTimestamps: coerce non-boolean saved value
    if (typeof this.settings.includeTimestamps !== "boolean") {
      this.settings.includeTimestamps =
        (this.settings.includeTimestamps as unknown) === true ||
        String(this.settings.includeTimestamps).toLowerCase() === "true";
      changed = true;
    }

    // fileFormat (string) → fileFormats (array)
    if ((this.settings as any).fileFormat !== undefined) {
      const oldFormat = (this.settings as any).fileFormat;
      delete (this.settings as any).fileFormat;
      this.settings.fileFormats = [oldFormat];
      changed = true;
    }

    // fileFormats: repair empty array (Object.assign won't override a saved [])
    if (this.settings.fileFormats.length === 0) {
      this.settings.fileFormats = DEFAULT_SETTINGS.fileFormats;
      changed = true;
    }

    // defaultDirectory: cross-validate against savedDirectories
    if (
      this.settings.defaultDirectory &&
      !(this.settings.savedDirectories ?? []).includes(this.settings.defaultDirectory)
    ) {
      this.settings.defaultDirectory = null;
      changed = true;
    }

    // Migrate PDF cover note settings to generic cover note settings
    if ((loadedData as any)?.createPdfCoverNote !== undefined) {
      this.settings.createCoverNote = (loadedData as any).createPdfCoverNote;
      changed = true;
    }
    if ((loadedData as any)?.pdfCoverNoteLocation !== undefined) {
      this.settings.coverNoteLocation = (loadedData as any).pdfCoverNoteLocation;
      changed = true;
    }
    if ((loadedData as any)?.pdfAttachmentFolder !== undefined) {
      this.settings.attachmentFolder = (loadedData as any).pdfAttachmentFolder;
      changed = true;
    }
    if ((loadedData as any)?.pdfCoverNoteTemplate !== undefined) {
      this.settings.coverNoteTemplate = (loadedData as any).pdfCoverNoteTemplate;
      changed = true;
    }

    // Remove obsolete fields
    for (const field of ["nestPdfUnderCoverNote", "useAttachmentFolderForPdf", "pdfAttachmentFolderName", "createPdfCoverNote", "pdfCoverNoteLocation", "pdfAttachmentFolder", "pdfCoverNoteTemplate", "srtLocation", "defaultCoverNoteName"]) {
      if ((this.settings as any)[field] !== undefined) {
        delete (this.settings as any)[field];
        changed = true;
      }
    }

    if (changed) await this.saveSettings();
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  hasProviderKey(provider: LLMProvider): boolean {
    return hasProviderKeyFn(provider, this.settings);
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
        fileFormats: ("markdown" | "pdf" | "srt")[],
        languageCode: string | null,
      ) => {
        // Check for conflict: Markdown + (PDF or SRT) with cover notes enabled
        const hasMarkdown = fileFormats.includes("markdown");
        const hasPdfOrSrt = fileFormats.includes("pdf") || fileFormats.includes("srt");
        const disableCoverNote = hasMarkdown && hasPdfOrSrt && this.settings.createCoverNote;
        if (disableCoverNote) {
          new MultipleFormatsWithCoverNoteModal(this.app).open();
        }

        // Process each selected format
        for (const fileFormat of fileFormats) {
          await this.processTranscript({
            url, createNewFile, includeVideoUrl, generateSummary, useLLM,
            llmProvider, selectedDirectory, tagWithChannelName,
            fileFormat, languageCode, disableCoverNote, fileFormats,
          });
        }
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

      // Extract all YouTube URLs from clipboard
      const { extractAllVideoUrls } = await import("./utils");
      const urls = extractAllVideoUrls(clipboardText);

      if (urls.length === 0) {
        new Notice("No YouTube URLs found in clipboard. Please copy a valid YouTube URL or video ID.", 10000);
        return;
      }

      // Use default settings
      let createNewFile = this.settings.createNewFile ?? false;
      const includeVideoUrl = this.settings.includeVideoUrl ?? false;
      const generateSummary = this.settings.generateSummary ?? false;
      const tagWithChannelName = this.settings.tagWithChannelName ?? false;
      const fileFormats = (this.settings.fileFormats && this.settings.fileFormats.length > 0)
        ? this.settings.fileFormats
        : ["markdown"];

      // PDF and SRT formats always require creating a new file
      if (fileFormats.includes("pdf") || fileFormats.includes("srt")) {
        createNewFile = true;
      }

      // Check for conflict: Markdown + (PDF or SRT) with cover notes enabled
      const hasMarkdown = fileFormats.includes("markdown");
      const hasPdfOrSrt = fileFormats.includes("pdf") || fileFormats.includes("srt");
      const disableCoverNote = hasMarkdown && hasPdfOrSrt && this.settings.createCoverNote;
      if (disableCoverNote) {
        new MultipleFormatsWithCoverNoteModal(this.app).open();
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

      // Process each URL sequentially
      for (let i = 0; i < urls.length; i++) {
        // Show progress for multi-URL batch
        if (urls.length > 1) {
          new Notice(`Processing video ${i + 1} of ${urls.length}…`, 3000);
        }
        // Process each selected format for this URL
        for (const fileFormat of fileFormats) {
          await this.processTranscript({
            url: urls[i],
            createNewFile, includeVideoUrl, generateSummary, useLLM,
            llmProvider, selectedDirectory, tagWithChannelName,
            fileFormat: fileFormat as FileFormat,
            languageCode, disableCoverNote,
          });
        }
      }
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

  findDuplicateNote(videoId: string): TFile | null {
    const property = this.settings.duplicateCheckProperty || "url";
    for (const file of this.app.vault.getMarkdownFiles()) {
      const cache = this.app.metadataCache.getFileCache(file);
      const propValue = cache?.frontmatter?.[property];
      if (typeof propValue === "string" && extractVideoId(propValue) === videoId) {
        return file;
      }
    }
    return null;
  }

  async processTranscript(options: ProcessTranscriptOptions) {
    const {
      url, createNewFile, includeVideoUrl, generateSummary, useLLM,
      llmProvider, selectedDirectory, tagWithChannelName, fileFormat,
      languageCode, disableCoverNote = false, fileFormats = [],
    } = options;
    if (createNewFile && this.settings.checkForDuplicates) {
      const videoId = extractVideoId(url);
      if (videoId) {
        const existingNote = this.findDuplicateNote(videoId);
        if (existingNote) {
          new DuplicateNoteErrorModal(
            this.app,
            existingNote.path.replace(/\.md$/, ""),
          ).open();
          return;
        }
      }
    }

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

      // SRT uses raw timing data — LLM processing would destroy cue boundaries
      // Only use LLM if explicitly enabled, provider has a key, and format is not SRT
      const effectiveLLMProvider = (useLLM && this.hasProviderKey(llmProvider) && fileFormat !== "srt") ? llmProvider : null;

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

      const { transcript, title, summary, channelName, videoDetails, segments } = result;

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
        // Only require active file if no directory is selected and we can't derive one from location settings
        const hasCoverNoteDirectory =
          (fileFormat === "pdf" || fileFormat === "srt") &&
          !disableCoverNote &&
          this.settings.createCoverNote &&
          !!this.settings.coverNoteLocation?.trim();
        if (!activeFile && !selectedDirectory && !hasCoverNoteDirectory) {
          throw new Error(
            "Please open a file first to determine the directory, or set a default directory in settings",
          );
        }

        await this.createTranscriptFile({
          activeFile: activeFile || null,
          videoTitle: title,
          transcript,
          videoUrl: normalizedUrl,
          summary,
          includeVideoUrl,
          selectedDirectory,
          channelName,
          tagWithChannelName,
          fileFormat,
          videoDetails,
          segments,
          disableCoverNote,
        });
        const formatNotice = fileFormat === "pdf"
          ? `PDF file created successfully! (${transcript.length} characters)`
          : fileFormat === "srt"
          ? `SRT file created successfully! (${segments.length} cues)`
          : `Transcript file created successfully! (${transcript.length} characters)`;
        new Notice(formatNotice);
      } else {
        // PDF and SRT formats cannot be inserted into existing files, must create new file
        if (fileFormat === "pdf") {
          new Notice("PDF format requires creating a new file. Please enable 'Create new file' in settings or use the modal to create a PDF.", 10000);
          return;
        }
        if (fileFormat === "srt") {
          new Notice("SRT format requires creating a new file. Please enable 'Create new file' in settings or use the modal to create an SRT file.", 10000);
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
      new TranscriptFetchErrorModal(this.app, errorMessage).open();
      console.error("Transcript fetch error:", error);
    } finally {
      fetchingNotice.hide();
    }
  }

  async createTranscriptFile(options: TranscriptFileOptions) {
    const {
      activeFile, videoTitle, transcript, videoUrl, summary, includeVideoUrl,
      selectedDirectory, channelName, tagWithChannelName, fileFormat,
      videoDetails, segments = [], disableCoverNote = false, fileFormats = [],
    } = options;
    // Apply file name template based on format
    let baseSanitizedTitle: string;
    if (fileFormat === "srt") {
      const srtNameTemplate = this.settings.defaultSrtFileName || "{VideoName}";
      let srtName = replaceTemplateVariables(srtNameTemplate, { videoTitle, channelName });
      srtName = srtName.replace(/\s+/g, " ").trim();
      baseSanitizedTitle = sanitizeFilename(srtName || videoTitle);
    } else {
      const noteNameTemplate = this.settings.defaultNoteName || "{VideoName}";
      let noteName = replaceTemplateVariables(noteNameTemplate, { videoTitle, channelName });
      // Clean up any empty segments from missing channel name
      noteName = noteName.replace(/\s+/g, " ").trim();
      baseSanitizedTitle = sanitizeFilename(noteName || videoTitle);
    }

    // Determine which directory to use
    let directory: string;
    const shouldNestUnderCoverNote = (fileFormat === "pdf" || fileFormat === "srt") &&
      !disableCoverNote &&
      this.settings.createCoverNote;

    if (shouldNestUnderCoverNote) {
      // Nest PDF and SRT files under cover note location
      const baseDirectory = selectedDirectory !== null
        ? selectedDirectory
        : (activeFile ? activeFile.path.substring(0, activeFile.path.lastIndexOf("/")) : "");

      let coverNoteDirectory = this.settings.coverNoteLocation || "";

      if (coverNoteDirectory) {
        coverNoteDirectory = replaceTemplateVariables(coverNoteDirectory, { videoTitle, channelName });
        coverNoteDirectory = coverNoteDirectory.replace(/\/+/g, "/").replace(/^\/|\/$/g, "");
      } else {
        coverNoteDirectory = baseDirectory;
      }

      const attachmentFolder = this.settings.attachmentFolder?.trim()
        .replace(/[/\\]+/g, "").trim() || baseSanitizedTitle;
      if (coverNoteDirectory && coverNoteDirectory.trim() !== "") {
        directory = `${coverNoteDirectory}/${attachmentFolder}`;
      } else {
        directory = attachmentFolder;
      }
    } else if (selectedDirectory !== null) {
      directory = selectedDirectory;
    } else if (activeFile) {
      const lastSlashIndex = activeFile.path.lastIndexOf("/");
      directory = lastSlashIndex >= 0
        ? activeFile.path.substring(0, lastSlashIndex)
        : ""; // File is in root
    } else {
      throw new Error(
        "Cannot determine directory: no active file and no directory specified"
      );
    }

    // Determine file extension based on format
    const handler = getFormatHandler(fileFormat);
    const fileExtension = handler.extension;

    // Ensure directory exists (create if it doesn't)
    // This is done AFTER determining the final directory (including nesting logic)
    if (directory && directory.trim() !== "") {
      const dirFile = this.app.vault.getAbstractFileByPath(directory);
      if (!dirFile || !(dirFile instanceof TFolder)) {
        // Create the directory if it doesn't exist or if it exists as a file
        try {
          await this.app.vault.createFolder(directory);
        } catch (error) {
          // Check if the folder already exists - if so, ignore the error
          const exists = this.app.vault.getAbstractFileByPath(directory);
          if (!exists || !(exists instanceof TFolder)) {
            throw new Error(
              `Failed to create directory ${directory}: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
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

    // For SRT, generate cue content from raw segments (ignore markdownContent)
    try {
      await handler.createFile(this.app, newFilePath, markdownContent, segments);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      if (errorMessage.includes("already exists") || errorMessage.includes("file exists")) {
        // Race condition: resolve next available path and retry once
        const baseName = directory
          ? `${directory}/${baseSanitizedTitle}`
          : baseSanitizedTitle;
        while (this.app.vault.getAbstractFileByPath(newFilePath)) {
          newFilePath = `${baseName} (${counter}).${fileExtension}`;
          counter++;
        }
        await handler.createFile(this.app, newFilePath, markdownContent, segments);
      } else {
        throw error;
      }
    }

    // Create cover note for PDF or SRT if enabled
    if ((fileFormat === "pdf" || fileFormat === "srt") && !disableCoverNote && this.settings.createCoverNote) {
      // Compute expected SRT file path if SRT format is enabled in settings
      let srtFilePath: string | null = null;
      if (this.settings.fileFormats?.includes("srt") && fileFormat === "pdf") {
        // When creating a PDF, compute where the SRT will be created
        const srtNameTemplate = this.settings.defaultSrtFileName || "{VideoName}";
        let srtName = replaceTemplateVariables(srtNameTemplate, { videoTitle, channelName });
        srtName = srtName.replace(/\s+/g, " ").trim();
        const srtBaseName = sanitizeFilename(srtName || videoTitle);

        // Compute SRT directory using same nesting logic as createTranscriptFile
        let srtDir: string;
        const baseDirectory = selectedDirectory !== null
          ? selectedDirectory
          : (activeFile ? activeFile.path.substring(0, activeFile.path.lastIndexOf("/")) : "");

        let coverNoteDirectory = this.settings.coverNoteLocation || "";
        if (coverNoteDirectory) {
          coverNoteDirectory = replaceTemplateVariables(coverNoteDirectory, { videoTitle, channelName });
          coverNoteDirectory = coverNoteDirectory.replace(/\/+/g, "/").replace(/^\/|\/$/g, "");
        } else {
          coverNoteDirectory = baseDirectory;
        }

        const attachmentFolder = this.settings.attachmentFolder?.trim()
          .replace(/[/\\]+/g, "").trim() || sanitizeFilename(videoTitle);
        if (coverNoteDirectory && coverNoteDirectory.trim() !== "") {
          srtDir = `${coverNoteDirectory}/${attachmentFolder}`;
        } else {
          srtDir = attachmentFolder;
        }

        srtFilePath = srtDir ? `${srtDir}/${srtBaseName}.srt` : `${srtBaseName}.srt`;
      }

      await this.createCoverNote(
        newFilePath,
        videoTitle,
        videoUrl,
        summary,
        channelName,
        tagWithChannelName,
        videoDetails,
        srtFilePath,
      );
    }

    // Open the file (only for markdown files, PDFs will open in system viewer)
    await handler.postCreate(this.app, newFilePath);
  }

  /**
   * Calculates the cover note directory based on settings and template variables
   * @param attachmentFilePath The path to the attachment file (PDF or SRT, used as fallback if location is empty)
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
    let coverNoteLocation = this.settings.coverNoteLocation || "";

    // Replace template variables
    coverNoteLocation = replaceTemplateVariables(coverNoteLocation, { videoTitle, channelName });

    // Clean up any double slashes or trailing slashes
    coverNoteLocation = coverNoteLocation.replace(/\/+/g, "/").replace(/^\/|\/$/g, "");

    // Determine cover note directory
    if (coverNoteLocation && coverNoteLocation.trim() !== "") {
      // Use the specified cover note location
      return coverNoteLocation;
    } else {
      // When cover note location is empty, use the attachment file's directory
      // If nesting is enabled (createCoverNote), the file is in a nested subfolder,
      // so we need the parent directory for the cover note
      const attachmentDir = pdfFilePath.substring(0, pdfFilePath.lastIndexOf("/"));

      if (this.settings.createCoverNote) {
        // File is nested - use parent directory for cover note
        // e.g., PDF at "Attachments/VideoTitle/video.pdf" -> cover note dir is "Attachments"
        const parentDir = attachmentDir.substring(0, attachmentDir.lastIndexOf("/"));
        return parentDir || ""; // Return empty string if file is in root (no parent)
      } else {
        // File is not nested - use its directory directly
        return attachmentDir || "";
      }
    }
  }

  async createCoverNote(
    pdfFilePath: string,
    videoTitle: string,
    videoUrl: string,
    summary: string | null,
    channelName: string | null,
    tagWithChannelName: boolean,
    videoDetails: VideoDetails | null,
    srtFilePath: string | null = null,
  ) {
    // Calculate cover note directory
    let coverNoteDirectory = this.calculateCoverNoteDirectory(
      pdfFilePath,
      videoTitle,
      channelName,
    );

    // Ensure cover note directory exists (only if not root directory)
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

    // Get attachment filename without extension for reference
    const attachmentFileName = pdfFilePath.substring(pdfFilePath.lastIndexOf("/") + 1);

    // Use absolute path from vault root for links (Obsidian supports this)
    const pdfLinkPath = normalizeVaultPath(pdfFilePath);

    // Compute SRT link path similarly
    const srtLinkPath = srtFilePath ? normalizeVaultPath(srtFilePath) : null;

    // Build cover note content - use template if specified, otherwise use default
    let coverNoteContent: string;

    if (this.settings.coverNoteTemplate && this.settings.coverNoteTemplate.trim() !== "") {
      // Use template file
      try {
        const templateFile = this.app.vault.getAbstractFileByPath(this.settings.coverNoteTemplate);
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

          // Replace {SrtLink}
          processedContent = processedContent.replace(/{SrtLink}/g, srtLinkPath ?? "");

          // Replace {PdfDirectory} with full path of PDF's directory (excluding filename)
          const pdfDirPath = pdfFilePath.substring(0, pdfFilePath.lastIndexOf("/"));
          const pdfDirectory = pdfDirPath || "";
          processedContent = processedContent.replace(/{PdfDirectory}/g, pdfDirectory);

          // Replace videoDetails variables
          if (videoDetails) {
            processedContent = this.replaceVideoDetailsVariables(processedContent, videoDetails);
          }
          
          coverNoteContent = processedContent;
        } else {
          // Template file not found, use default
          console.warn(`Template file not found: ${this.settings.coverNoteTemplate}, using default template`);
          coverNoteContent = this.buildDefaultCoverNoteContent(
            videoTitle,
            videoUrl,
            summary,
            channelName,
            tagWithChannelName,
            pdfLinkPath,
            srtLinkPath,
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
          srtLinkPath,
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
        srtLinkPath,
      );
    }

    // Create cover note file - use video title as cover note name
    const sanitizedCoverNoteName = sanitizeFilename(videoTitle);
    
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
    srtLinkPath: string | null = null,
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

    // Add link to SRT if available
    if (srtLinkPath) {
      coverNoteParts.push(`[[${srtLinkPath}|View SRT Transcript]]`);
    }

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
