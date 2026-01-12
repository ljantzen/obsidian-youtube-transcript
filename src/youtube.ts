import { Notice, requestUrl, App } from "obsidian";
import type {
  CaptionTrack,
  TranscriptResult,
  LLMProvider,
  YouTubeTranscriptPluginSettings,
  StatusCallback,
  LLMResponse,
  RetryModalConstructor,
} from "./types";
import { extractVideoId, decodeHtmlEntities } from "./utils";
import { processWithOpenAI } from "./llm/openai";
import { processWithGemini } from "./llm/gemini";
import { processWithClaude } from "./llm/claude";

export async function getYouTubeTranscript(
  app: App,
  url: string,
  generateSummary: boolean,
  llmProvider: LLMProvider,
  settings: YouTubeTranscriptPluginSettings,
  statusCallback?: StatusCallback,
  RetryModal?: RetryModalConstructor,
): Promise<TranscriptResult> {
  const videoId = extractVideoId(url);
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

  // Extract channel name
  const channelName = videoData?.videoDetails?.author || null;

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

  const parsedResult = await parseTranscript(
    app,
    transcriptXml,
    generateSummary,
    llmProvider,
    settings,
    statusCallback,
    RetryModal,
  );

  return {
    transcript: parsedResult.transcript,
    title: videoTitle,
    summary: parsedResult.summary,
    channelName: channelName,
  };
}

async function parseTranscript(
  app: App,
  transcriptXml: string,
  generateSummary: boolean,
  llmProvider: LLMProvider,
  settings: YouTubeTranscriptPluginSettings,
  statusCallback?: StatusCallback,
  RetryModal?: RetryModalConstructor,
): Promise<LLMResponse> {
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
    textElements = xmlDoc.getElementsByTagName("transcript");
    if (textElements.length === 0) {
      textElements = xmlDoc.getElementsByTagName("p");
    }
  }

  const transcriptParts: string[] = [];
  for (let i = 0; i < textElements.length; i++) {
    const element = textElements[i];
    let text = element.textContent || "";

    if (!text && element.firstChild) {
      text = element.firstChild.textContent || "";
    }

    if (text) {
      text = decodeHtmlEntities(text);
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
      if (text) {
        text = decodeHtmlEntities(text);
      }
      if (text && text.trim() && node.children.length === 0) {
        transcriptParts.push(text.trim());
      }
    }
  }

  if (transcriptParts.length === 0) {
    console.error(
      "Transcript XML structure:",
      transcriptXml.substring(0, 500),
    );
    throw new Error(
      "No transcript content found. The video may not have captions, or the format is unsupported.",
    );
  }

  // Join transcript parts with spaces, then add newlines after sentence-ending punctuation
  // to create natural paragraph breaks while keeping sentences together
  let rawTranscript = transcriptParts.join(" ");
  // Add newlines after sentence-ending punctuation followed by a space and capital letter
  rawTranscript = rawTranscript.replace(/([.!?])\s+([A-Z])/g, "$1\n\n$2");

  // Process through LLM if provider is configured
  const providerToUse = llmProvider || settings.llmProvider;
  if (providerToUse && providerToUse !== "none") {
    const hasKey = hasProviderKey(providerToUse, settings);
    if (hasKey) {
      const processed = await processWithLLM(
        app,
        rawTranscript,
        generateSummary,
        providerToUse,
        settings,
        statusCallback,
        RetryModal,
      );
      return processed;
    }
  }

  // If summary was requested but no LLM provider/key, return raw transcript
  if (generateSummary) {
    const providerName = getProviderName(providerToUse || "none");
    console.warn(
      `Summary generation requested but ${providerName} API key is not configured`,
    );
    new Notice(
      `Summary generation requested but ${providerName} API key is not configured. Using raw transcript instead.`,
    );
  }
  return { transcript: rawTranscript, summary: null };
}

async function processWithLLM(
  app: App,
  transcript: string,
  generateSummary: boolean,
  provider: LLMProvider,
  settings: YouTubeTranscriptPluginSettings,
  statusCallback?: StatusCallback,
  RetryModal?: RetryModalConstructor,
): Promise<LLMResponse> {
  if (!provider || provider === "none" || !hasProviderKey(provider, settings)) {
    const providerName = getProviderName(provider || "none");
    console.debug(
      `processWithLLM: No ${providerName} key, returning transcript without summary`,
    );
    new Notice(
      `${providerName} processing requested but API key is not configured. Using raw transcript instead.`,
    );
    return { transcript, summary: null };
  }

  switch (provider) {
    case "openai":
      return await processWithOpenAI(
        app,
        transcript,
        generateSummary,
        settings,
        statusCallback,
        RetryModal,
      );
    case "gemini":
      return await processWithGemini(
        app,
        transcript,
        generateSummary,
        settings,
        statusCallback,
        RetryModal,
      );
    case "claude":
      return await processWithClaude(
        app,
        transcript,
        generateSummary,
        settings,
        statusCallback,
        RetryModal,
      );
    default:
      new Notice(`Unsupported LLM provider: ${String(provider)}`);
      return { transcript, summary: null };
  }
}

function hasProviderKey(
  provider: LLMProvider,
  settings: YouTubeTranscriptPluginSettings,
): boolean {
  switch (provider) {
    case "openai":
      return !!(settings.openaiKey && settings.openaiKey.trim() !== "");
    case "gemini":
      return !!(settings.geminiKey && settings.geminiKey.trim() !== "");
    case "claude":
      return !!(settings.claudeKey && settings.claudeKey.trim() !== "");
    default:
      return false;
  }
}

function getProviderName(provider: LLMProvider): string {
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
