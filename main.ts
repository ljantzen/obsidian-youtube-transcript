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

type LLMProvider = "openai" | "gemini" | "claude" | "none";

interface YouTubeTranscriptPluginSettings {
  llmProvider: LLMProvider;
  openaiKey: string;
  openaiModel: string;
  geminiKey: string;
  geminiModel: string;
  claudeKey: string;
  claudeModel: string;
  prompt: string;
  openaiTimeout: number; // Timeout in minutes
  includeVideoUrl: boolean;
  generateSummary: boolean;
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
  llmProvider: "none",
  openaiKey: "",
  openaiModel: "gpt-4o-mini",
  geminiKey: "",
  geminiModel: "gemini-1.5-flash",
  claudeKey: "",
  claudeModel: "claude-3-5-sonnet-20241022",
  prompt: DEFAULT_PROMPT,
  openaiTimeout: 1, // Default 1 minute (60 seconds)
  includeVideoUrl: false,
  generateSummary: false,
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

    // Backward compatibility: if llmProvider is not set, infer from existing keys
    if (this.settings.llmProvider === undefined || this.settings.llmProvider === "none") {
      if (this.settings.openaiKey && this.settings.openaiKey.trim() !== "") {
        this.settings.llmProvider = "openai";
      } else if (this.settings.geminiKey && this.settings.geminiKey.trim() !== "") {
        this.settings.llmProvider = "gemini";
      } else if (this.settings.claudeKey && this.settings.claudeKey.trim() !== "") {
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

  fetchTranscript() {
    new YouTubeUrlModal(
      this.app,
      this,
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
          const result = await this.getTranscript(
            url,
            generateSummary,
            llmProvider,
            (status: string) => {
              // Update notice with processing status
              fetchingNotice.setMessage(status);
            },
          );
          fetchingNotice.hide();

          const { transcript, title, summary } = result;

          if (!transcript || transcript.trim().length === 0) {
            throw new Error("Transcript is empty");
          }

          // Normalize the URL to watch format
          const videoId = this.extractVideoId(url);
          const normalizedUrl = videoId
            ? `https://www.youtube.com/watch?v=${videoId}`
            : url;

          //console.log("Transcript fetched, length:", transcript.length);

          if (createNewFile) {
            // Get the active file to determine the directory
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
            // Get the active view at the time of insertion (not when modal opens)
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

    // Build file content with URL, summary, and transcript
    const parts: string[] = [];

    if (includeVideoUrl) {
      parts.push(`![${videoTitle}](${videoUrl})`);
    }

    // The transcript already includes markdown headers from OpenAI
    parts.push(transcript);

    const fileContent = parts.join("\n\n");

    // Create the file
    const file = await this.app.vault.create(newFilePath, fileContent);

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
    generateSummary: boolean,
    llmProvider: LLMProvider,
    statusCallback?: (status: string) => void,
  ): Promise<{ transcript: string; title: string; summary: string | null }> {
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
    const parsedResult = await this.parseTranscript(
      transcriptXml,
      generateSummary,
      llmProvider,
      statusCallback,
    );
    //console.log("Transcript parsed, length:", parsedResult.transcript.length);
    return {
      transcript: parsedResult.transcript,
      title: videoTitle,
      summary: parsedResult.summary,
    };
  }

  async getTranscriptViaInnerTube(
    videoId: string,
    generateSummary: boolean,
    statusCallback?: (status: string) => void,
  ): Promise<{ transcript: string; title: string; summary: string | null }> {
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

    const parsedResult = await this.parseTranscript(
      transcriptXml,
      generateSummary,
      this.settings.llmProvider,
      statusCallback,
    );
    return {
      transcript: parsedResult.transcript,
      title: videoTitle,
      summary: parsedResult.summary,
    };
  }

  decodeHtmlEntities(text: string): string {
    // Create a temporary textarea element to decode HTML entities
    const textarea = document.createElement("textarea");
    textarea.innerHTML = text;
    return textarea.value;
  }

  hasProviderKey(provider: LLMProvider): boolean {
    switch (provider) {
      case "openai":
        return !!(this.settings.openaiKey && this.settings.openaiKey.trim() !== "");
      case "gemini":
        return !!(this.settings.geminiKey && this.settings.geminiKey.trim() !== "");
      case "claude":
        return !!(this.settings.claudeKey && this.settings.claudeKey.trim() !== "");
      default:
        return false;
    }
  }

  getProviderName(provider: LLMProvider): string {
    switch (provider) {
      case "openai":
        return "OpenAI";
      case "gemini":
        return "Gemini";
      case "claude":
        return "Claude";
      default:
        return "LLM";
    }
  }

  async parseTranscript(
    transcriptXml: string,
    generateSummary: boolean,
    llmProvider: LLMProvider,
    statusCallback?: (status: string) => void,
  ): Promise<{ transcript: string; summary: string | null }> {
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

    // Process through LLM if provider is configured (use provided provider or fallback to settings)
    const providerToUse = llmProvider || this.settings.llmProvider;
    if (providerToUse && providerToUse !== "none") {
      const hasKey = this.hasProviderKey(providerToUse);
      if (hasKey) {
        //console.log(`Processing transcript with ${providerToUse}...`);
        const processed = await this.processWithLLM(
          rawTranscript,
          generateSummary,
          providerToUse,
          statusCallback,
        );
        //console.log(`${providerToUse} processing complete, length:`, processed.transcript.length);
        //console.log("Summary generated:", processed.summary ? "Yes" : "No");
        return processed;
      }
    }

    // If summary was requested but no LLM provider/key, return raw transcript
    //console.log("Returning raw transcript");
    if (generateSummary) {
      const providerName = this.getProviderName(providerToUse || "none");
      console.warn(`Summary generation requested but ${providerName} API key is not configured`);
      new Notice(`Summary generation requested but ${providerName} API key is not configured. Using raw transcript instead.`);
    }
    return { transcript: rawTranscript, summary: null };
  }

  async processWithLLM(
    transcript: string,
    generateSummary: boolean,
    provider: LLMProvider,
    statusCallback?: (status: string) => void,
  ): Promise<{ transcript: string; summary: string | null }> {
    if (!provider || provider === "none" || !this.hasProviderKey(provider)) {
      const providerName = this.getProviderName(provider || "none");
      console.log(`processWithLLM: No ${providerName} key, returning transcript without summary`);
      new Notice(`${providerName} processing requested but API key is not configured. Using raw transcript instead.`);
      return { transcript, summary: null };
    }

    switch (provider) {
      case "openai":
        return await this.processWithOpenAI(transcript, generateSummary, statusCallback);
      case "gemini":
        return await this.processWithGemini(transcript, generateSummary, statusCallback);
      case "claude":
        return await this.processWithClaude(transcript, generateSummary, statusCallback);
      default:
        new Notice(`Unsupported LLM provider: ${provider}`);
        return { transcript, summary: null };
    }
  }

  async processWithOpenAI(
    transcript: string,
    generateSummary: boolean,
    statusCallback?: (status: string) => void,
  ): Promise<{ transcript: string; summary: string | null }> {
    if (!this.settings.openaiKey || this.settings.openaiKey.trim() === "") {
      console.log("processWithOpenAI: No OpenAI key, returning transcript without summary");
      new Notice("OpenAI processing requested but API key is not configured. Using raw transcript instead.");
      return { transcript, summary: null };
    }
    
    console.log("processWithOpenAI: generateSummary =", generateSummary);

    if (statusCallback)
      statusCallback(
        "Processing transcript with OpenAI (this may take a moment)...",
      );

    let prompt = this.settings.prompt || DEFAULT_PROMPT;
    
    // Build the full prompt with summary instructions if needed
    let fullPrompt = prompt;
    
    if (generateSummary) {
      fullPrompt += `\n\nIMPORTANT: You must provide a concise summary (2-3 sentences) of the video content, focusing on the main topics, key points, and overall message.`;
      fullPrompt += `\n\nYou MUST format your response EXACTLY as follows:\n`;
      fullPrompt += `\n## Summary\n\n[Your 2-3 sentence summary here]\n\n## Transcript\n\n[Your processed transcript here]\n`;
      fullPrompt += `\nDo NOT include any other text before or after these sections. Start directly with "## Summary".`;
    } else {
      fullPrompt += `\n\nPlease format your response as follows:\n`;
      fullPrompt += `- Start with a "## Transcript" markdown header followed by the processed transcript\n`;
    }
    
    fullPrompt += `\nTranscript:\n${transcript}`;

    const makeRequest = async (): Promise<{ transcript: string; summary: string | null }> => {
      // Add timeout wrapper using configured timeout
      const timeoutMinutes = this.settings.openaiTimeout || 1;
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
          model: this.settings.openaiModel || DEFAULT_SETTINGS.openaiModel,
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
        
        // Handle rate limiting (429) specifically
        if (response.status === 429) {
          const rateLimitError = errorData.error?.message || "Rate limit exceeded";
          const retryAfter = response.headers?.["retry-after"] || response.headers?.["Retry-After"];
          let errorMsg = `OpenAI rate limit exceeded (429). You've made too many requests too quickly.`;
          if (retryAfter) {
            errorMsg += ` Please wait ${retryAfter} seconds before retrying.`;
          } else {
            errorMsg += ` Please wait a few minutes before retrying.`;
          }
          throw new Error(errorMsg);
        }
        
        throw new Error(
          `OpenAI API error: ${response.status} - ${errorData.error?.message || response.text || "Unknown error"}`,
        );
      }

      const data = response.json;
      const responseContent = data.choices?.[0]?.message?.content;

      if (!responseContent) {
        throw new Error("No response from OpenAI");
      }

      return this.parseLLMResponse(responseContent.trim(), generateSummary);
    };

    try {
      return await makeRequest();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      
      // Check if it's a timeout error
      if (errorMessage.includes("timed out")) {
        // Prompt user if they want to retry
        const shouldRetry = await new RetryConfirmationModal(
          this.app,
          errorMessage,
        ).waitForResponse();

        if (shouldRetry) {
          if (statusCallback)
            statusCallback(
              "Retrying OpenAI processing...",
            );
          try {
            return await makeRequest();
          } catch (retryError: unknown) {
            const retryErrorMessage =
              retryError instanceof Error ? retryError.message : "Unknown error";
            throw new Error(
              `Failed to process transcript with OpenAI after retry: ${retryErrorMessage}`,
            );
          }
        } else {
          // User chose not to retry, return raw transcript
          new Notice("Using raw transcript (OpenAI processing skipped)");
          return { transcript, summary: null };
        }
      }
      
      // Check if it's a rate limit error (429)
      // Check for various formats: "429", "rate limit", "too many requests", etc.
      const isRateLimitError = 
        errorMessage.toLowerCase().includes("rate limit") ||
        errorMessage.includes("429") ||
        errorMessage.toLowerCase().includes("too many requests");
      
      if (isRateLimitError) {
        // Prompt user if they want to retry or use raw transcript
        const shouldRetry = await new RetryConfirmationModal(
          this.app,
          errorMessage + "\n\nYou can retry after waiting a few minutes, or use the raw transcript without OpenAI processing.",
        ).waitForResponse();

        if (shouldRetry) {
          if (statusCallback)
            statusCallback(
              "Waiting before retrying OpenAI processing (rate limit)...",
            );
          // Wait 60 seconds before retrying for rate limits
          await new Promise((resolve) => setTimeout(resolve, 60000));
          if (statusCallback)
            statusCallback(
              "Retrying OpenAI processing...",
            );
          try {
            return await makeRequest();
          } catch (retryError: unknown) {
            const retryErrorMessage =
              retryError instanceof Error ? retryError.message : "Unknown error";
            // If still rate limited, offer to use raw transcript
            const isStillRateLimited = 
              retryErrorMessage.toLowerCase().includes("rate limit") ||
              retryErrorMessage.includes("429") ||
              retryErrorMessage.toLowerCase().includes("too many requests");
            if (isStillRateLimited) {
              new Notice("Still rate limited. Using raw transcript instead.");
              return { transcript, summary: null };
            }
            throw new Error(
              `Failed to process transcript with OpenAI after retry: ${retryErrorMessage}`,
            );
          }
        } else {
          // User chose not to retry, return raw transcript
          new Notice("Using raw transcript (OpenAI processing skipped due to rate limit)");
          return { transcript, summary: null };
        }
      }
      
      // For other errors, throw as before
      console.error("OpenAI processing error:", error);
      throw new Error(
        `Failed to process transcript with OpenAI: ${errorMessage}`,
      );
    }
  }

  async processWithGemini(
    transcript: string,
    generateSummary: boolean,
    statusCallback?: (status: string) => void,
  ): Promise<{ transcript: string; summary: string | null }> {
    if (!this.settings.geminiKey || this.settings.geminiKey.trim() === "") {
      console.log("processWithGemini: No Gemini key, returning transcript without summary");
      new Notice("Gemini processing requested but API key is not configured. Using raw transcript instead.");
      return { transcript, summary: null };
    }
    
    console.log("processWithGemini: generateSummary =", generateSummary);

    if (statusCallback)
      statusCallback(
        "Processing transcript with Gemini (this may take a moment)...",
      );

    let prompt = this.settings.prompt || DEFAULT_PROMPT;
    
    // Build the full prompt with summary instructions if needed
    let fullPrompt = prompt;
    
    if (generateSummary) {
      fullPrompt += `\n\nIMPORTANT: You must provide a concise summary (2-3 sentences) of the video content, focusing on the main topics, key points, and overall message.`;
      fullPrompt += `\n\nYou MUST format your response EXACTLY as follows:\n`;
      fullPrompt += `\n## Summary\n\n[Your 2-3 sentence summary here]\n\n## Transcript\n\n[Your processed transcript here]\n`;
      fullPrompt += `\nDo NOT include any other text before or after these sections. Start directly with "## Summary".`;
    } else {
      fullPrompt += `\n\nPlease format your response as follows:\n`;
      fullPrompt += `- Start with a "## Transcript" markdown header followed by the processed transcript\n`;
    }
    
    fullPrompt += `\nTranscript:\n${transcript}`;

    const makeRequest = async (): Promise<{ transcript: string; summary: string | null }> => {
      const timeoutMinutes = this.settings.openaiTimeout || 1;
      const timeoutMs = timeoutMinutes * 60 * 1000;
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () =>
            reject(
              new Error(
                `Gemini request timed out after ${timeoutMinutes} minute${timeoutMinutes !== 1 ? "s" : ""}`,
              ),
            ),
          timeoutMs,
        );
      });

      // Gemini API endpoint (using Google AI Studio API)
      const model = this.settings.geminiModel || DEFAULT_SETTINGS.geminiModel;
      const requestPromise = requestUrl({
        url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.settings.geminiKey}`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: fullPrompt,
            }],
          }],
          generationConfig: {
            temperature: 0.3,
          },
        }),
      });

      const response = await Promise.race([requestPromise, timeoutPromise]);

      if (response.status < 200 || response.status >= 300) {
        const errorData = response.json || {};
        
        if (response.status === 429) {
          const retryAfter = response.headers?.["retry-after"] || response.headers?.["Retry-After"];
          let errorMsg = `Gemini rate limit exceeded (429). You've made too many requests too quickly.`;
          if (retryAfter) {
            errorMsg += ` Please wait ${retryAfter} seconds before retrying.`;
          } else {
            errorMsg += ` Please wait a few minutes before retrying.`;
          }
          throw new Error(errorMsg);
        }
        
        throw new Error(
          `Gemini API error: ${response.status} - ${errorData.error?.message || response.text || "Unknown error"}`,
        );
      }

      const data = response.json;
      const responseContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!responseContent) {
        throw new Error("No response from Gemini");
      }

      return this.parseLLMResponse(responseContent.trim(), generateSummary);
    };

    try {
      return await makeRequest();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      
      if (errorMessage.includes("timed out")) {
        const shouldRetry = await new RetryConfirmationModal(
          this.app,
          errorMessage,
        ).waitForResponse();

        if (shouldRetry) {
          if (statusCallback)
            statusCallback("Retrying Gemini processing...");
          try {
            return await makeRequest();
          } catch (retryError: unknown) {
            const retryErrorMessage =
              retryError instanceof Error ? retryError.message : "Unknown error";
            throw new Error(
              `Failed to process transcript with Gemini after retry: ${retryErrorMessage}`,
            );
          }
        } else {
          new Notice("Using raw transcript (Gemini processing skipped)");
          return { transcript, summary: null };
        }
      }
      
      const isRateLimitError = 
        errorMessage.toLowerCase().includes("rate limit") ||
        errorMessage.includes("429") ||
        errorMessage.toLowerCase().includes("too many requests");
      
      if (isRateLimitError) {
        const shouldRetry = await new RetryConfirmationModal(
          this.app,
          errorMessage + "\n\nYou can retry after waiting a few minutes, or use the raw transcript without Gemini processing.",
        ).waitForResponse();

        if (shouldRetry) {
          if (statusCallback)
            statusCallback("Waiting before retrying Gemini processing (rate limit)...");
          await new Promise((resolve) => setTimeout(resolve, 60000));
          if (statusCallback)
            statusCallback("Retrying Gemini processing...");
          try {
            return await makeRequest();
          } catch (retryError: unknown) {
            const retryErrorMessage =
              retryError instanceof Error ? retryError.message : "Unknown error";
            const isStillRateLimited = 
              retryErrorMessage.toLowerCase().includes("rate limit") ||
              retryErrorMessage.includes("429") ||
              retryErrorMessage.toLowerCase().includes("too many requests");
            if (isStillRateLimited) {
              new Notice("Still rate limited. Using raw transcript instead.");
              return { transcript, summary: null };
            }
            throw new Error(
              `Failed to process transcript with Gemini after retry: ${retryErrorMessage}`,
            );
          }
        } else {
          new Notice("Using raw transcript (Gemini processing skipped due to rate limit)");
          return { transcript, summary: null };
        }
      }
      
      console.error("Gemini processing error:", error);
      throw new Error(
        `Failed to process transcript with Gemini: ${errorMessage}`,
      );
    }
  }

  async processWithClaude(
    transcript: string,
    generateSummary: boolean,
    statusCallback?: (status: string) => void,
  ): Promise<{ transcript: string; summary: string | null }> {
    if (!this.settings.claudeKey || this.settings.claudeKey.trim() === "") {
      console.log("processWithClaude: No Claude key, returning transcript without summary");
      new Notice("Claude processing requested but API key is not configured. Using raw transcript instead.");
      return { transcript, summary: null };
    }
    
    console.log("processWithClaude: generateSummary =", generateSummary);

    if (statusCallback)
      statusCallback(
        "Processing transcript with Claude (this may take a moment)...",
      );

    let prompt = this.settings.prompt || DEFAULT_PROMPT;
    
    // Build the full prompt with summary instructions if needed
    let fullPrompt = prompt;
    
    if (generateSummary) {
      fullPrompt += `\n\nIMPORTANT: You must provide a concise summary (2-3 sentences) of the video content, focusing on the main topics, key points, and overall message.`;
      fullPrompt += `\n\nYou MUST format your response EXACTLY as follows:\n`;
      fullPrompt += `\n## Summary\n\n[Your 2-3 sentence summary here]\n\n## Transcript\n\n[Your processed transcript here]\n`;
      fullPrompt += `\nDo NOT include any other text before or after these sections. Start directly with "## Summary".`;
    } else {
      fullPrompt += `\n\nPlease format your response as follows:\n`;
      fullPrompt += `- Start with a "## Transcript" markdown header followed by the processed transcript\n`;
    }
    
    fullPrompt += `\nTranscript:\n${transcript}`;

    const makeRequest = async (): Promise<{ transcript: string; summary: string | null }> => {
      const timeoutMinutes = this.settings.openaiTimeout || 1;
      const timeoutMs = timeoutMinutes * 60 * 1000;
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () =>
            reject(
              new Error(
                `Claude request timed out after ${timeoutMinutes} minute${timeoutMinutes !== 1 ? "s" : ""}`,
              ),
            ),
          timeoutMs,
        );
      });

      // Claude API endpoint (Anthropic)
      const requestPromise = requestUrl({
        url: "https://api.anthropic.com/v1/messages",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.settings.claudeKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: this.settings.claudeModel || DEFAULT_SETTINGS.claudeModel,
          max_tokens: 4096,
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
        
        if (response.status === 429) {
          const retryAfter = response.headers?.["retry-after"] || response.headers?.["Retry-After"];
          let errorMsg = `Claude rate limit exceeded (429). You've made too many requests too quickly.`;
          if (retryAfter) {
            errorMsg += ` Please wait ${retryAfter} seconds before retrying.`;
          } else {
            errorMsg += ` Please wait a few minutes before retrying.`;
          }
          throw new Error(errorMsg);
        }
        
        throw new Error(
          `Claude API error: ${response.status} - ${errorData.error?.message || response.text || "Unknown error"}`,
        );
      }

      const data = response.json;
      const responseContent = data.content?.[0]?.text;

      if (!responseContent) {
        throw new Error("No response from Claude");
      }

      return this.parseLLMResponse(responseContent.trim(), generateSummary);
    };

    try {
      return await makeRequest();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      
      if (errorMessage.includes("timed out")) {
        const shouldRetry = await new RetryConfirmationModal(
          this.app,
          errorMessage,
        ).waitForResponse();

        if (shouldRetry) {
          if (statusCallback)
            statusCallback("Retrying Claude processing...");
          try {
            return await makeRequest();
          } catch (retryError: unknown) {
            const retryErrorMessage =
              retryError instanceof Error ? retryError.message : "Unknown error";
            throw new Error(
              `Failed to process transcript with Claude after retry: ${retryErrorMessage}`,
            );
          }
        } else {
          new Notice("Using raw transcript (Claude processing skipped)");
          return { transcript, summary: null };
        }
      }
      
      const isRateLimitError = 
        errorMessage.toLowerCase().includes("rate limit") ||
        errorMessage.includes("429") ||
        errorMessage.toLowerCase().includes("too many requests");
      
      if (isRateLimitError) {
        const shouldRetry = await new RetryConfirmationModal(
          this.app,
          errorMessage + "\n\nYou can retry after waiting a few minutes, or use the raw transcript without Claude processing.",
        ).waitForResponse();

        if (shouldRetry) {
          if (statusCallback)
            statusCallback("Waiting before retrying Claude processing (rate limit)...");
          await new Promise((resolve) => setTimeout(resolve, 60000));
          if (statusCallback)
            statusCallback("Retrying Claude processing...");
          try {
            return await makeRequest();
          } catch (retryError: unknown) {
            const retryErrorMessage =
              retryError instanceof Error ? retryError.message : "Unknown error";
            const isStillRateLimited = 
              retryErrorMessage.toLowerCase().includes("rate limit") ||
              retryErrorMessage.includes("429") ||
              retryErrorMessage.toLowerCase().includes("too many requests");
            if (isStillRateLimited) {
              new Notice("Still rate limited. Using raw transcript instead.");
              return { transcript, summary: null };
            }
            throw new Error(
              `Failed to process transcript with Claude after retry: ${retryErrorMessage}`,
            );
          }
        } else {
          new Notice("Using raw transcript (Claude processing skipped due to rate limit)");
          return { transcript, summary: null };
        }
      }
      
      console.error("Claude processing error:", error);
      throw new Error(
        `Failed to process transcript with Claude: ${errorMessage}`,
      );
    }
  }

  parseLLMResponse(
    responseContent: string,
    generateSummary: boolean,
  ): { transcript: string; summary: string | null } {
    const trimmedContent = responseContent.trim();
    
    // Parse the response to extract summary and transcript with headers
    let summary: string | null = null;
    let processedTranscript: string;
    
    if (generateSummary) {
      // Try multiple patterns to extract summary (more flexible matching)
      let summaryMatch = trimmedContent.match(/##\s+Summary\s*\n\n(.*?)(?=\n##\s+Transcript|$)/s);
      
      if (!summaryMatch) {
        summaryMatch = trimmedContent.match(/##\s+Summary\s*\n(.*?)(?=\n##\s+Transcript|$)/s);
      }
      
      if (!summaryMatch) {
        summaryMatch = trimmedContent.match(/(?:##\s+)?Summary[:\-]?\s*\n\n?(.*?)(?=\n##\s+Transcript|\n##\s+Summary|$)/is);
      }
      
      if (summaryMatch && summaryMatch[1]) {
        summary = summaryMatch[1].trim();
      }
      
      const hasSummarySection = /##\s+Summary/i.test(trimmedContent);
      const hasTranscriptSection = /##\s+Transcript/i.test(trimmedContent);
      
      if (hasSummarySection && hasTranscriptSection) {
        processedTranscript = trimmedContent;
        if (!summary) {
          const summaryMatch = trimmedContent.match(/##\s+Summary\s*\n\n?(.*?)(?=\n##\s+Transcript|$)/is);
          if (summaryMatch && summaryMatch[1]) {
            summary = summaryMatch[1].trim();
          } else {
            const summaryIndex = trimmedContent.search(/##\s+Summary/i);
            const transcriptIndex = trimmedContent.search(/##\s+Transcript/i);
            if (transcriptIndex > summaryIndex && summaryIndex !== -1) {
              const afterSummary = trimmedContent.substring(summaryIndex);
              const beforeTranscript = afterSummary.substring(0, afterSummary.search(/##\s+Transcript/i));
              summary = beforeTranscript.replace(/##\s+Summary\s*/i, '').trim();
            }
          }
        }
        const hasSummaryInOutput = /##\s+Summary/i.test(processedTranscript);
        if (!hasSummaryInOutput) {
          console.warn('Summary section detected in response but not found in final transcript. Reconstructing...');
          const transcriptMatch = trimmedContent.match(/##\s+Transcript\s*\n\n?(.*?)$/is);
          const transcriptContent = transcriptMatch ? transcriptMatch[1].trim() : trimmedContent;
          processedTranscript = `## Summary\n\n${summary || 'Summary not extracted'}\n\n## Transcript\n\n${transcriptContent}`;
        }
      } else {
        console.warn('LLM response did not follow expected format with Summary and Transcript sections');
        
        if (summary) {
          const transcriptMatch = trimmedContent.match(/##\s+Transcript\s*\n\n?(.*?)$/s);
          const transcriptContent = transcriptMatch ? transcriptMatch[1].trim() : trimmedContent.replace(/##\s+Summary\s*\n\n?.*?$/is, '').trim();
          processedTranscript = `## Summary\n\n${summary}\n\n## Transcript\n\n${transcriptContent || trimmedContent}`;
        } else if (hasSummarySection) {
          const summaryIndex = trimmedContent.indexOf('## Summary');
          const transcriptIndex = trimmedContent.indexOf('## Transcript');
          
          if (transcriptIndex > summaryIndex) {
            const summaryText = trimmedContent.substring(summaryIndex + 10, transcriptIndex).trim();
            const transcriptText = trimmedContent.substring(transcriptIndex + 14).trim();
            summary = summaryText;
            processedTranscript = `## Summary\n\n${summary}\n\n## Transcript\n\n${transcriptText}`;
          } else {
            const afterSummary = trimmedContent.substring(summaryIndex + 10).trim();
            const firstPara = afterSummary.split('\n\n')[0] || afterSummary.split('\n')[0] || afterSummary.substring(0, 300);
            summary = firstPara.trim();
            processedTranscript = `## Summary\n\n${summary}\n\n## Transcript\n\n${afterSummary}`;
          }
        } else {
          const firstPara = trimmedContent.split('\n\n')[0] || trimmedContent.split('\n')[0];
          if (firstPara && firstPara.length < 500 && !firstPara.startsWith('##')) {
            summary = firstPara.trim();
            processedTranscript = `## Summary\n\n${summary}\n\n## Transcript\n\n${trimmedContent}`;
          } else {
            summary = 'Video transcript processed and cleaned.';
            processedTranscript = `## Summary\n\n${summary}\n\n## Transcript\n\n${trimmedContent}`;
          }
        }
      }
      
      if (generateSummary && !/##\s+Summary/i.test(processedTranscript)) {
        console.warn('Summary was requested but not found in LLM response. Adding fallback summary.');
        if (!summary) {
          summary = 'Summary generation requested but LLM response did not include a summary section.';
        }
        if (/##\s+Transcript/i.test(processedTranscript)) {
          processedTranscript = processedTranscript.replace(
            /(##\s+Transcript)/i,
            `## Summary\n\n${summary}\n\n$1`
          );
        } else {
          processedTranscript = `## Summary\n\n${summary}\n\n## Transcript\n\n${processedTranscript}`;
        }
      }
      
      if (generateSummary) {
        const finalCheck = /##\s+Summary/i.test(processedTranscript);
        if (!finalCheck) {
          console.error('CRITICAL: Summary section still missing after all attempts!');
          processedTranscript = `## Summary\n\n${summary || 'Summary could not be generated'}\n\n## Transcript\n\n${processedTranscript}`;
        }
      }
    } else {
      processedTranscript = trimmedContent;
    }
    
    if (!processedTranscript || processedTranscript.length === 0) {
      processedTranscript = trimmedContent;
    }

    if (generateSummary) {
      const hasSummaryInTranscript = processedTranscript.includes('## Summary');
      if (summary || hasSummaryInTranscript) {
        new Notice("LLM processing complete with summary");
        console.log("Summary generation successful. Summary present:", !!summary, "Summary in transcript:", hasSummaryInTranscript);
      } else {
        new Notice("LLM processing complete (summary may be missing)");
        console.warn("Summary was requested but not found. Response preview:", trimmedContent.substring(0, 500));
      }
    } else {
      new Notice("LLM processing complete");
    }

    return { transcript: processedTranscript, summary };
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
      //console.log("Inserting transcript at cursor position:", cursor);

      // Build formatted content with URL, summary, and transcript
      const parts: string[] = [];

      if (includeVideoUrl) {
        parts.push(`![${videoTitle}](${videoUrl})`);
      }

      // The transcript already includes markdown headers from OpenAI
      // Preserve the structure - don't split lines that contain headers
      parts.push(transcript);

      const formattedContent = "\n\n" + parts.join("\n\n") + "\n\n";
      //console.log( "Formatted transcript length:", formattedContent.length, "lines:", lines.length,);

      editor.replaceRange(formattedContent, cursor);
      //console.log("Transcript inserted successfully");
    } catch (error) {
      console.error("Error inserting transcript:", error);
      new Notice(`Error inserting transcript: ${error.message}`);
    }
  }
}

class RetryConfirmationModal extends Modal {
  result: boolean | null = null;
  resolvePromise: ((value: boolean) => void) | null = null;

  constructor(app: App, errorMessage: string) {
    super(app);
    this.errorMessage = errorMessage;
  }

  errorMessage: string;

  onOpen() {
    const { contentEl } = this;

    contentEl.createEl("h2", { text: "OpenAI Request Timed Out" });

    contentEl.createEl("p", {
      text: this.errorMessage,
    });

    contentEl.createEl("p", {
      text: "Would you like to retry the OpenAI processing?",
    });

    const buttonContainer = contentEl.createDiv({
      attr: { style: "text-align: right; margin-top: 1em;" },
    });

    const cancelButton = buttonContainer.createEl("button", {
      text: "Skip (use raw transcript)",
    });
    cancelButton.onclick = () => {
      this.result = false;
      if (this.resolvePromise) {
        this.resolvePromise(false);
      }
      this.close();
    };

    const retryButton = buttonContainer.createEl("button", {
      text: "Retry",
    });
    retryButton.setCssProps({ "margin-left": "0.5em" });
    retryButton.onclick = () => {
      this.result = true;
      if (this.resolvePromise) {
        this.resolvePromise(true);
      }
      this.close();
    };
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
    // If modal was closed without clicking a button, default to false
    if (this.result === null && this.resolvePromise) {
      this.resolvePromise(false);
    }
  }

  waitForResponse(): Promise<boolean> {
    return new Promise((resolve) => {
      this.resolvePromise = resolve;
      this.open();
    });
  }
}

class YouTubeUrlModal extends Modal {
  onSubmit: (
    url: string,
    createNewFile: boolean,
    includeVideoUrl: boolean,
    generateSummary: boolean,
    llmProvider: LLMProvider,
  ) => void | Promise<void>;
  plugin: YouTubeTranscriptPlugin;

  constructor(
    app: App,
    plugin: YouTubeTranscriptPlugin,
    onSubmit: (
      url: string,
      createNewFile: boolean,
      includeVideoUrl: boolean,
      generateSummary: boolean,
      llmProvider: LLMProvider,
    ) => void | Promise<void>,
  ) {
    super(app);
    this.onSubmit = onSubmit;
    this.plugin = plugin;
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
    const createNewFileContainer = contentEl.createDiv({
      attr: { style: "margin-bottom: 1em;" },
    });
    const createNewFileCheckbox = createNewFileContainer.createEl("input", {
      type: "checkbox",
      attr: {
        id: "create-new-file-checkbox",
      },
    });
    const createNewFileLabel = createNewFileContainer.createEl("label", {
      text: "Create new file (based on video title)",
      attr: {
        for: "create-new-file-checkbox",
        style: "margin-left: 0.5em; cursor: pointer;",
      },
    });

    // Add checkbox for including video URL
    const includeUrlContainer = contentEl.createDiv({
      attr: { style: "margin-bottom: 1em;" },
    });
    const includeUrlCheckbox = includeUrlContainer.createEl("input", {
      type: "checkbox",
      attr: {
        id: "include-video-url-checkbox",
      },
    });
    if (this.plugin.settings.includeVideoUrl) {
      includeUrlCheckbox.checked = true;
    }
    const includeUrlLabel = includeUrlContainer.createEl("label", {
      text: "Include video URL",
      attr: {
        for: "include-video-url-checkbox",
        style: "margin-left: 0.5em; cursor: pointer;",
      },
    });

    // Add provider selection dropdown
    const providerContainer = contentEl.createDiv({
      attr: { style: "margin-bottom: 1em; display: flex; align-items: center; gap: 0.5em;" },
    });
    const providerLabel = providerContainer.createEl("label", {
      text: "LLM provider:",
      attr: {
        style: "white-space: nowrap;",
      },
    });
    const providerDropdown = providerContainer.createEl("select", {
      attr: {
        id: "llm-provider-dropdown",
        style: "flex: 1;",
      },
    });
    providerDropdown.add(new Option("None (raw transcript)", "none"));
    providerDropdown.add(new Option("OpenAI", "openai"));
    providerDropdown.add(new Option("Google Gemini", "gemini"));
    providerDropdown.add(new Option("Anthropic Claude", "claude"));
    providerDropdown.value = this.plugin.settings.llmProvider || "none";

    // Add checkbox for generating summary
    const generateSummaryContainer = contentEl.createDiv({
      attr: { style: "margin-bottom: 1em;" },
    });
    const generateSummaryCheckbox = generateSummaryContainer.createEl("input", {
      type: "checkbox",
      attr: {
        id: "generate-summary-checkbox",
      },
    });
    if (this.plugin.settings.generateSummary) {
      generateSummaryCheckbox.checked = true;
    }
    
    const generateSummaryLabel = generateSummaryContainer.createEl("label", {
      text: `Generate summary (requires ${this.plugin.getProviderName(providerDropdown.value as LLMProvider)} API key)`,
      attr: {
        for: "generate-summary-checkbox",
        style: "margin-left: 0.5em; cursor: pointer;",
      },
    });
    
    // Update summary label based on selected provider
    const updateSummaryLabel = () => {
      const selectedProvider = providerDropdown.value as LLMProvider;
      const providerName = this.plugin.getProviderName(selectedProvider);
      generateSummaryLabel.textContent = `Generate summary (requires ${providerName} API key)`;
    };
    
    providerDropdown.addEventListener("change", updateSummaryLabel);

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
        const createNewFile = createNewFileCheckbox.checked;
        const includeVideoUrl = includeUrlCheckbox.checked;
        const generateSummary = generateSummaryCheckbox.checked;
        const llmProvider = providerDropdown.value as LLMProvider;
        void this.onSubmit(url, createNewFile, includeVideoUrl, generateSummary, llmProvider);
        this.close();
      }
    };

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const url = input.value.trim();
        if (url) {
          const createNewFile = createNewFileCheckbox.checked;
          const includeVideoUrl = includeUrlCheckbox.checked;
          const generateSummary = generateSummaryCheckbox.checked;
          const llmProvider = providerDropdown.value as LLMProvider;
          void this.onSubmit(url, createNewFile, includeVideoUrl, generateSummary, llmProvider);
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
      .setName("LLM provider")
      .setDesc("Select which LLM provider to use for transcript processing")
      .addDropdown((dropdown) => {
        dropdown
          .addOption("none", "None (raw transcript)")
          .addOption("openai", "OpenAI")
          .addOption("gemini", "Google Gemini")
          .addOption("claude", "Anthropic Claude")
          .setValue(this.plugin.settings.llmProvider || "none")
          .onChange(async (value: LLMProvider) => {
            this.plugin.settings.llmProvider = value;
            await this.plugin.saveSettings();
            // Refresh the settings display to show/hide relevant API key fields
            this.display();
          });
      });

    // Show OpenAI API key field if OpenAI is selected or if it's the current provider
    if (this.plugin.settings.llmProvider === "openai" || this.plugin.settings.llmProvider === "none") {
      new Setting(containerEl)
        .setName("OpenAI API key")
        .setDesc(
          "Your OpenAI API key for processing transcripts (get one at https://platform.openai.com/api-keys)",
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

      new Setting(containerEl)
        .setName("OpenAI Model")
        .setDesc("Select the OpenAI model to use for transcript processing")
        .addDropdown((dropdown) => {
          dropdown
            .addOption("gpt-4o-mini", "GPT-4o Mini (fast, cost-effective)")
            .addOption("gpt-4o", "GPT-4o (high quality)")
            .addOption("gpt-4-turbo", "GPT-4 Turbo")
            .addOption("gpt-4", "GPT-4")
            .addOption("gpt-3.5-turbo", "GPT-3.5 Turbo")
            .setValue(this.plugin.settings.openaiModel || DEFAULT_SETTINGS.openaiModel)
            .onChange(async (value) => {
              this.plugin.settings.openaiModel = value;
              await this.plugin.saveSettings();
            });
        });
    }

    // Show Gemini API key field if Gemini is selected
    if (this.plugin.settings.llmProvider === "gemini") {
      new Setting(containerEl)
        .setName("Gemini API key")
        .setDesc(
          "Your Google Gemini API key for processing transcripts (get one at https://aistudio.google.com/app/apikey)",
        )
        .addText((text) => {
          text.inputEl.type = "password";
          text
            .setPlaceholder("AIza...")
            .setValue(this.plugin.settings.geminiKey)
            .onChange(async (value) => {
              this.plugin.settings.geminiKey = value;
              await this.plugin.saveSettings();
            });
        });

      new Setting(containerEl)
        .setName("Gemini Model")
        .setDesc("Select the Gemini model to use for transcript processing")
        .addDropdown((dropdown) => {
          dropdown
            .addOption("gemini-1.5-flash", "Gemini 1.5 Flash (fast, cost-effective)")
            .addOption("gemini-1.5-pro", "Gemini 1.5 Pro (high quality)")
            .addOption("gemini-1.5-flash-latest", "Gemini 1.5 Flash Latest")
            .addOption("gemini-1.5-pro-latest", "Gemini 1.5 Pro Latest")
            .addOption("gemini-pro", "Gemini Pro")
            .setValue(this.plugin.settings.geminiModel || DEFAULT_SETTINGS.geminiModel)
            .onChange(async (value) => {
              this.plugin.settings.geminiModel = value;
              await this.plugin.saveSettings();
            });
        });
    }

    // Show Claude API key field if Claude is selected
    if (this.plugin.settings.llmProvider === "claude") {
      new Setting(containerEl)
        .setName("Claude API key")
        .setDesc(
          "Your Anthropic Claude API key for processing transcripts (get one at https://console.anthropic.com/)",
        )
        .addText((text) => {
          text.inputEl.type = "password";
          text
            .setPlaceholder("sk-ant-...")
            .setValue(this.plugin.settings.claudeKey)
            .onChange(async (value) => {
              this.plugin.settings.claudeKey = value;
              await this.plugin.saveSettings();
            });
        });

      new Setting(containerEl)
        .setName("Claude Model")
        .setDesc("Select the Claude model to use for transcript processing")
        .addDropdown((dropdown) => {
          dropdown
            .addOption("claude-3-5-sonnet-20241022", "Claude 3.5 Sonnet (recommended)")
            .addOption("claude-3-5-haiku-20241022", "Claude 3.5 Haiku (fast, cost-effective)")
            .addOption("claude-3-opus-20240229", "Claude 3 Opus (highest quality)")
            .addOption("claude-3-sonnet-20240229", "Claude 3 Sonnet")
            .addOption("claude-3-haiku-20240307", "Claude 3 Haiku")
            .setValue(this.plugin.settings.claudeModel || DEFAULT_SETTINGS.claudeModel)
            .onChange(async (value) => {
              this.plugin.settings.claudeModel = value;
              await this.plugin.saveSettings();
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
    textarea.value = this.plugin.settings.prompt;
    textarea.addEventListener("input", (e) => {
      const target = e.target as HTMLTextAreaElement;
      this.plugin.settings.prompt = target.value;
      this.plugin.saveSettings();
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
          .setValue(this.plugin.settings.openaiTimeout.toString())
          .onChange(async (value) => {
            const timeout = parseInt(value, 10);
            if (!isNaN(timeout) && timeout > 0) {
              this.plugin.settings.openaiTimeout = timeout;
              await this.plugin.saveSettings();
            }
          });
      });

  }
}
