import {
  Plugin,
  MarkdownView,
  PluginSettingTab,
  Setting,
  Notice,
  App,
  Modal,
  requestUrl,
  TFile,
} from "obsidian";

interface YouTubeTranscriptPluginSettings {
  autoFetch: boolean;
  openaiKey: string;
  prompt: string;
  openaiTimeout: number; // Timeout in minutes
}

interface CaptionTrack {
  languageCode: string;
  baseUrl: string;
}

const DEFAULT_PROMPT = `Please process the following YouTube video transcript. Your task is to:

1. Create an accurate and complete transcription with complete sentences
2. Remove all self-promotion, calls to action, and promotional content (e.g., "like and subscribe", "check out my channel", "visit my website", etc.)
3. Maintain the original meaning and context
4. Ensure proper grammar and sentence structure
5. Keep the content focused on the actual video content

Return only the cleaned transcript without any additional commentary or explanation.`;

const DEFAULT_SETTINGS: YouTubeTranscriptPluginSettings = {
  autoFetch: false,
  openaiKey: "",
  prompt: DEFAULT_PROMPT,
  openaiTimeout: 5, // Default 5 minutes
};

export default class YouTubeTranscriptPlugin extends Plugin {
  settings: YouTubeTranscriptPluginSettings;

  async onload() {
    await this.loadSettings();

    // This creates an icon in the left ribbon.
    this.addRibbonIcon("youtube", "Youtube transcript", (evt: MouseEvent) => {
      // Called when the user clicks the icon.
      this.fetchTranscript();
    });

    // This adds a settings tab so the user can configure various aspects of the plugin
    this.addSettingTab(new YouTubeTranscriptSettingTab(this.app, this));

    // This adds a simple command that can be triggered anywhere
    this.addCommand({
      id: "fetch-youtube-transcript",
      name: "Fetch YouTube transcript",
      callback: () => {
        this.fetchTranscript();
      },
    });
  }

  onunload() {}

  async loadSettings() {
    const loadedData = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedData);

    // Ensure prompt has a default value if empty
    if (!this.settings.prompt || this.settings.prompt.trim() === "") {
      this.settings.prompt = DEFAULT_PROMPT;
      await this.saveSettings();
    }

    // Ensure timeout has a default value if missing (backward compatibility)
    if (this.settings.openaiTimeout === undefined || this.settings.openaiTimeout <= 0) {
      this.settings.openaiTimeout = DEFAULT_SETTINGS.openaiTimeout;
      await this.saveSettings();
    }
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  fetchTranscript() {
    new YouTubeUrlModal(
      this.app,
      async (url: string, createNewFile: boolean) => {
        try {
          const fetchingNotice = new Notice(
            "Fetching transcript from YouTube...",
            0,
          );
          const result = await this.getTranscript(url, (status: string) => {
            // Update notice with processing status
            fetchingNotice.setMessage(status);
          });
          fetchingNotice.hide();

          const { transcript, title } = result;

          if (!transcript || transcript.trim().length === 0) {
            throw new Error("Transcript is empty");
          }

          //console.log("Transcript fetched, length:", transcript.length);

          if (createNewFile) {
            // Get the active file to determine the directory
            const activeFile = this.app.workspace.getActiveFile();
            if (!activeFile) {
              throw new Error(
                "Please open a file first to determine the directory",
              );
            }

            await this.createTranscriptFile(activeFile, title, transcript);
            new Notice(
              `Transcript file created successfully! (${transcript.length} characters)`,
            );
          } else {
            // Get the active view at the time of insertion (not when modal opens)
            const activeView =
              this.app.workspace.getActiveViewOfType(MarkdownView);
            if (!activeView) {
              new Notice("Please open a markdown file first");
              return;
            }

            this.insertTranscript(activeView, transcript);
            new Notice(
              `Transcript fetched successfully! (${transcript.length} characters)`,
            );
          }
        } catch (error: unknown) {
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
  ) {
    // Sanitize the filename
    let sanitizedTitle = this.sanitizeFilename(videoTitle);

    // Get the directory of the active file
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
      const baseName = sanitizedTitle;
      sanitizedTitle = `${baseName} (${counter})`;
      newFilePath = directory
        ? `${directory}/${sanitizedTitle}.md`
        : `${sanitizedTitle}.md`;
      counter++;
    }

    // Create the file
    const file = await this.app.vault.create(newFilePath, transcript);

    // Open the new file
    await this.app.workspace.openLinkText(newFilePath, "", false);
  }

  sanitizeFilename(filename: string): string {
    // Remove or replace invalid filename characters
    return filename
      .replace(/[<>:"/\\|?*]/g, "") // Remove invalid characters
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim()
      .substring(0, 100); // Limit length
  }

  extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/, // Direct video ID
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  }

  async getTranscript(
    url: string,
    statusCallback?: (status: string) => void,
  ): Promise<{ transcript: string; title: string }> {
    const videoId = this.extractVideoId(url);
    if (!videoId) {
      throw new Error("Invalid YouTube URL or video ID");
    }

    // Step 1: Fetch the YouTube watch page HTML
    if (statusCallback) statusCallback("Fetching video page...");
    const watchPageUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const watchPageResponse = await requestUrl({
      url: watchPageUrl,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (watchPageResponse.status < 200 || watchPageResponse.status >= 300) {
      throw new Error(
        `Failed to fetch video page: ${watchPageResponse.status}`,
      );
    }

    const pageHtml = watchPageResponse.text;

    // Step 2: Extract the InnerTube API key from the HTML
    const apiKeyMatch = pageHtml.match(
      /"INNERTUBE_API_KEY":\s*"([a-zA-Z0-9_-]+)"/,
    );
    if (!apiKeyMatch || !apiKeyMatch[1]) {
      throw new Error("Could not extract InnerTube API key from YouTube page");
    }
    const apiKey = apiKeyMatch[1];

    // Step 3: Use the InnerTube API with the extracted key
    if (statusCallback) statusCallback("Fetching video information...");
    const innertubeResponse = await requestUrl({
      url: `https://www.youtube.com/youtubei/v1/player?key=${apiKey}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: "WEB",
            clientVersion: "2.20231219.00.00",
            hl: "en",
            gl: "US",
          },
        },
        videoId: videoId,
      }),
    });

    if (innertubeResponse.status < 200 || innertubeResponse.status >= 300) {
      throw new Error(
        `Failed to fetch video info: ${innertubeResponse.status} ${innertubeResponse.text?.substring(0, 200) || "Unknown error"}`,
      );
    }

    const videoData = innertubeResponse.json;

    // Extract video title
    const videoTitle = videoData?.videoDetails?.title || "YouTube Transcript";

    // Extract caption tracks
    const captionTracks =
      videoData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!captionTracks || captionTracks.length === 0) {
      throw new Error("No captions available for this video");
    }

    // Prefer English, fallback to first available
    let captionTrack = captionTracks.find(
      (track: CaptionTrack) => track.languageCode === "en",
    );
    if (!captionTrack) {
      captionTrack = captionTracks[0];
    }

    // Step 4: Fetch the transcript XML using the baseUrl
    if (statusCallback) statusCallback("Fetching transcript data...");
    const transcriptUrl = captionTrack.baseUrl;
    const transcriptResponse = await requestUrl(transcriptUrl);

    if (transcriptResponse.status < 200 || transcriptResponse.status >= 300) {
      throw new Error(
        `Failed to fetch transcript: ${transcriptResponse.status} ${transcriptResponse.text?.substring(0, 200) || "Unknown error"}`,
      );
    }

    const transcriptXml = transcriptResponse.text;
    if (!transcriptXml || !transcriptXml.trim()) {
      throw new Error(
        "Transcript URL returned empty response. The video may not have captions available.",
      );
    }

    //console.log("Transcript XML fetched, length:", transcriptXml.length);
    const parsedTranscript = await this.parseTranscript(
      transcriptXml,
      statusCallback,
    );
    //console.log("Transcript parsed, length:", parsedTranscript.length);
    return { transcript: parsedTranscript, title: videoTitle };
  }

  async getTranscriptViaInnerTube(
    videoId: string,
    statusCallback?: (status: string) => void,
  ): Promise<{ transcript: string; title: string }> {
    // Fallback: Try InnerTube API (may require valid API key)
    const innertubeResponse = await requestUrl({
      url: "https://www.youtube.com/youtubei/v1/player",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: "WEB",
            clientVersion: "2.20231219.00.00",
            hl: "en",
            gl: "US",
          },
        },
        videoId: videoId,
      }),
    });

    if (innertubeResponse.status < 200 || innertubeResponse.status >= 300) {
      throw new Error(
        `Failed to fetch video info via InnerTube API: ${innertubeResponse.status}. Please ensure the video has captions available.`,
      );
    }

    const videoData = innertubeResponse.json;

    // Extract video title
    const videoTitle = videoData?.videoDetails?.title || "YouTube Transcript";

    // Extract caption tracks
    const captionTracks =
      videoData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!captionTracks || captionTracks.length === 0) {
      throw new Error("No captions available for this video");
    }

    // Prefer English, fallback to first available
    let captionTrack = captionTracks.find(
      (track: CaptionTrack) => track.languageCode === "en",
    );
    if (!captionTrack) {
      captionTrack = captionTracks[0];
    }

    // Fetch the transcript XML
    // Ensure the URL has the proper format parameter
    let transcriptUrl = captionTrack.baseUrl;
    if (!transcriptUrl.includes("fmt=")) {
      transcriptUrl += (transcriptUrl.includes("?") ? "&" : "?") + "fmt=xml3";
    }
    const transcriptResponse = await requestUrl(transcriptUrl);

    if (transcriptResponse.status < 200 || transcriptResponse.status >= 300) {
      throw new Error(
        `Failed to fetch transcript: ${transcriptResponse.status}`,
      );
    }

    const transcriptXml = transcriptResponse.text;
    if (!transcriptXml || !transcriptXml.trim()) {
      throw new Error("Transcript URL returned empty response.");
    }

    const transcript = await this.parseTranscript(
      transcriptXml,
      statusCallback,
    );
    return { transcript, title: videoTitle };
  }

  decodeHtmlEntities(text: string): string {
    // Create a temporary textarea element to decode HTML entities
    const textarea = document.createElement("textarea");
    textarea.innerHTML = text;
    return textarea.value;
  }

  async parseTranscript(
    transcriptXml: string,
    statusCallback?: (status: string) => void,
  ): Promise<string> {
    // Parse XML and extract text
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(transcriptXml, "text/xml");

    // Check for XML parsing errors
    const parserError = xmlDoc.querySelector("parsererror");
    if (parserError) {
      console.error("XML parsing error:", parserError.textContent);
      console.error(
        "Transcript XML content:",
        transcriptXml.substring(0, 1000),
      );
      throw new Error(
        "Failed to parse transcript XML. The transcript format may have changed.",
      );
    }

    // Try different possible tag names for transcript text
    let textElements: HTMLCollectionOf<Element> =
      xmlDoc.getElementsByTagName("text");
    if (textElements.length === 0) {
      // Try alternative tag names
      textElements = xmlDoc.getElementsByTagName("transcript");
      if (textElements.length === 0) {
        textElements = xmlDoc.getElementsByTagName("p");
      }
    }

    const transcriptParts: string[] = [];
    for (let i = 0; i < textElements.length; i++) {
      const element = textElements[i];
      // Get text content, handling both direct text and nested elements
      let text = element.textContent || "";

      // If the element has a text node directly, use that
      if (!text && element.firstChild) {
        text = element.firstChild.textContent || "";
      }

      // Decode HTML entities (e.g., &quot; -> ", &#39; -> ')
      if (text) {
        text = this.decodeHtmlEntities(text);
      }

      if (text && text.trim()) {
        transcriptParts.push(text.trim());
      }
    }

    // If still no content, try querySelectorAll with a broader search
    if (transcriptParts.length === 0) {
      const allTextNodes = xmlDoc.querySelectorAll("*");
      for (let i = 0; i < allTextNodes.length; i++) {
        const node = allTextNodes[i];
        let text = node.textContent || "";
        // Decode HTML entities
        if (text) {
          text = this.decodeHtmlEntities(text);
        }
        // Skip if it's a parent element that contains other elements (to avoid duplicates)
        if (text && text.trim() && node.children.length === 0) {
          transcriptParts.push(text.trim());
        }
      }
    }

    if (transcriptParts.length === 0) {
      // Log the XML structure for debugging
      console.error(
        "Transcript XML structure:",
        transcriptXml.substring(0, 500),
      );
      throw new Error(
        "No transcript content found. The video may not have captions, or the format is unsupported.",
      );
    }

    const rawTranscript = transcriptParts.join(" ");
    //console.log( "Raw transcript assembled, length:", rawTranscript.length, "parts:", transcriptParts.length,);

    // Process through OpenAI if API key is provided
    if (this.settings.openaiKey && this.settings.openaiKey.trim() !== "") {
      //console.log("Processing transcript with OpenAI...");
      const processed = await this.processWithOpenAI(
        rawTranscript,
        statusCallback,
      );
      //console.log("OpenAI processing complete, length:", processed.length);
      return processed;
    }

    //console.log("Returning raw transcript");
    return rawTranscript;
  }

  async processWithOpenAI(
    transcript: string,
    statusCallback?: (status: string) => void,
  ): Promise<string> {
    if (!this.settings.openaiKey || this.settings.openaiKey.trim() === "") {
      return transcript;
    }

    if (statusCallback)
      statusCallback(
        "Processing transcript with OpenAI (this may take a moment)...",
      );

    const prompt = this.settings.prompt || DEFAULT_PROMPT;
    const fullPrompt = `${prompt}\n\nTranscript:\n${transcript}`;

    try {
      // Add timeout wrapper using configured timeout
      const timeoutMinutes = this.settings.openaiTimeout || 5;
      const timeoutMs = timeoutMinutes * 60 * 1000;
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () =>
            reject(
              new Error(
                `OpenAI request timed out after ${timeoutMinutes} minute${timeoutMinutes !== 1 ? "s" : ""}`,
              ),
            ),
          timeoutMs,
        );
      });

      const requestPromise = requestUrl({
        url: "https://api.openai.com/v1/chat/completions",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.settings.openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: fullPrompt,
            },
          ],
          temperature: 0.3,
        }),
      });

      const response = await Promise.race([requestPromise, timeoutPromise]);

      if (response.status < 200 || response.status >= 300) {
        const errorData = response.json || {};
        throw new Error(
          `OpenAI API error: ${response.status} - ${errorData.error?.message || response.text || "Unknown error"}`,
        );
      }

      const data = response.json;
      const processedTranscript = data.choices?.[0]?.message?.content;

      if (!processedTranscript) {
        throw new Error("No response from OpenAI");
      }

      return processedTranscript.trim();
    } catch (error: unknown) {
      console.error("OpenAI processing error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to process transcript with OpenAI: ${errorMessage}`);
    }
  }

  insertTranscript(view: MarkdownView, transcript: string) {
    try {
      const editor = view.editor;
      if (!editor) {
        console.error("Editor not available");
        new Notice("The editor is not available");
        return;
      }

      const cursor = editor.getCursor();
      //console.log("Inserting transcript at cursor position:", cursor);

      // Format transcript as a blockquote
      // Split into reasonable line lengths for readability
      const words = transcript.split(" ");
      const lines: string[] = [];
      let currentLine = "";

      for (const word of words) {
        if ((currentLine + word).length > 80 && currentLine.length > 0) {
          lines.push(currentLine.trim());
          currentLine = word + " ";
        } else {
          currentLine += word + " ";
        }
      }
      if (currentLine.trim()) {
        lines.push(currentLine.trim());
      }

      const formattedTranscript = "\n\n" + lines.join("\n") + "\n\n";
      //console.log( "Formatted transcript length:", formattedTranscript.length, "lines:", lines.length,);

      editor.replaceRange(formattedTranscript, cursor);
      //console.log("Transcript inserted successfully");
    } catch (error) {
      console.error("Error inserting transcript:", error);
      new Notice(`Error inserting transcript: ${error.message}`);
    }
  }
}

class YouTubeUrlModal extends Modal {
  onSubmit: (url: string, createNewFile: boolean) => void | Promise<void>;

  constructor(
    app: App,
    onSubmit: (url: string, createNewFile: boolean) => void | Promise<void>,
  ) {
    super(app);
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;

    contentEl.createEl("h2", { text: "Enter YouTube URL" });

    const input = contentEl.createEl("input", {
      type: "text",
      placeholder: "https://www.youtube.com/watch?v=... or video ID",
      attr: {
        style: "width: 100%; margin-bottom: 1em;",
      },
    });

    // Add checkbox for creating new file
    const checkboxContainer = contentEl.createDiv({
      attr: { style: "margin-bottom: 1em;" },
    });
    const checkbox = checkboxContainer.createEl("input", {
      type: "checkbox",
      attr: {
        id: "create-new-file-checkbox",
      },
    });
    const checkboxLabel = checkboxContainer.createEl("label", {
      text: "Create new file (based on video title)",
      attr: {
        for: "create-new-file-checkbox",
        style: "margin-left: 0.5em; cursor: pointer;",
      },
    });

    const buttonContainer = contentEl.createDiv({
      attr: { style: "text-align: right;" },
    });

    const cancelButton = buttonContainer.createEl("button", { text: "Cancel" });
    cancelButton.onclick = () => this.close();

    const submitButton = buttonContainer.createEl("button", {
      text: "Fetch transcript",
    });
    submitButton.setCssProps({ "margin-left": "0.5em" });
    submitButton.onclick = () => {
      const url = input.value.trim();
      if (url) {
        const createNewFile = checkbox.checked;
        void this.onSubmit(url, createNewFile);
        this.close();
      }
    };

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const url = input.value.trim();
        if (url) {
          const createNewFile = checkbox.checked;
          void this.onSubmit(url, createNewFile);
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

class YouTubeTranscriptSettingTab extends PluginSettingTab {
  plugin: YouTubeTranscriptPlugin;

  constructor(app: App, plugin: YouTubeTranscriptPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName("YouTube transcript settings")
      .setHeading();

    new Setting(containerEl)
      .setName("OpenAI API key")
      .setDesc(
        "Your OpenAI API key for processing transcripts (optional but recommended)",
      )
      .addText((text) => {
        text.inputEl.type = "password";
        text
          .setPlaceholder("sk-...")
          .setValue(this.plugin.settings.openaiKey)
          .onChange(async (value) => {
            this.plugin.settings.openaiKey = value;
            await this.plugin.saveSettings();
          });
      });

    const promptSetting = new Setting(containerEl)
      .setName("Processing prompt")
      .setDesc("The prompt sent to OpenAI for processing the transcript");

    const textarea = promptSetting.controlEl.createEl("textarea", {
      attr: {
        placeholder: DEFAULT_PROMPT,
        rows: "10",
      },
    });
    textarea.setCssProps({ width: "100%" });
    textarea.value = this.plugin.settings.prompt;
    textarea.addEventListener("input", (e) => {
      const target = e.target as HTMLTextAreaElement;
      this.plugin.settings.prompt = target.value;
      this.plugin.saveSettings();
    });

    new Setting(containerEl)
      .setName("OpenAI timeout")
      .setDesc(
        "Timeout for OpenAI API requests in minutes (default: 5 minutes)",
      )
      .addText((text) => {
        text.inputEl.type = "number";
        text
          .setPlaceholder("5")
          .setValue(this.plugin.settings.openaiTimeout.toString())
          .onChange(async (value) => {
            const timeout = parseInt(value, 10);
            if (!isNaN(timeout) && timeout > 0) {
              this.plugin.settings.openaiTimeout = timeout;
              await this.plugin.saveSettings();
            }
          });
      });

    containerEl.createEl("hr");

    new Setting(containerEl)
      .setName("Auto-fetch transcripts")
      .setDesc(
        "Automatically fetch transcripts when YouTube links are detected",
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.autoFetch)
          .onChange(async (value) => {
            this.plugin.settings.autoFetch = value;
            await this.plugin.saveSettings();
          }),
      );
  }
}
