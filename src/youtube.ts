import { Notice, requestUrl, App } from "obsidian";
import type {
  CaptionTrack,
  TranscriptResult,
  LLMProvider,
  YouTubeTranscriptPluginSettings,
  StatusCallback,
  LLMResponse,
  RetryModalConstructor,
  VideoDetails,
} from "./types";
import { extractVideoId, decodeHtmlEntities, formatTimestamp } from "./utils";

/**
 * Gets available caption languages for a YouTube video
 */
export async function getAvailableLanguages(
  videoId: string,
  apiKey: string,
): Promise<CaptionTrack[]> {
  const innertubeResponse = await requestUrl({
    url: `https://www.youtube.com/youtubei/v1/player?key=${apiKey}`,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      Accept: "application/json",
    },
    body: JSON.stringify({
      context: {
        client: {
          clientName: "WEB",
          clientVersion: "2.20250128.00.00",
          hl: "en",
          gl: "US",
        },
      },
      videoId: videoId,
    }),
  });

  if (innertubeResponse.status < 200 || innertubeResponse.status >= 300) {
    throw new Error(
      `Failed to fetch video info: ${innertubeResponse.status}`,
    );
  }

  const videoData = innertubeResponse.json;
  const captionTracks =
    videoData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

  return captionTracks || [];
}
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
  preferredLanguageCode?: string | null,
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
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  if (watchPageResponse.status < 200 || watchPageResponse.status >= 300) {
    throw new Error(
      `Failed to fetch video page: ${watchPageResponse.status}`,
    );
  }

  const pageHtml = watchPageResponse.text;

  // Step 2: Try to extract captions directly from the page HTML first (fallback method)
  // YouTube embeds player response data in the page which includes caption tracks
  let captionTracksFromPage: CaptionTrack[] | null = null;
  try {
    // Look for ytInitialPlayerResponse which contains caption data
    // Try multiple patterns as YouTube may use different formats
    const patterns = [
      /var ytInitialPlayerResponse\s*=\s*({.+?});/s,
      /window\["ytInitialPlayerResponse"\]\s*=\s*({.+?});/s,
      /window\.ytInitialPlayerResponse\s*=\s*({.+?});/s,
      /"ytInitialPlayerResponse"\s*:\s*({.+?})(?:,"|})/s,
    ];
    
    for (const pattern of patterns) {
      const playerResponseMatch = pageHtml.match(pattern);
      if (playerResponseMatch && playerResponseMatch[1]) {
        try {
          // Try to find the end of the JSON object more accurately
          let jsonStr = playerResponseMatch[1];
          // If the match didn't capture the full object, try to find it
          if (!jsonStr.trim().startsWith('{')) {
            const startIdx = pageHtml.indexOf('ytInitialPlayerResponse');
            if (startIdx !== -1) {
              // Find the opening brace
              const braceStart = pageHtml.indexOf('{', startIdx);
              if (braceStart !== -1) {
                // Try to find the matching closing brace
                let braceCount = 0;
                let braceEnd = braceStart;
                for (let i = braceStart; i < pageHtml.length && i < braceStart + 500000; i++) {
                  if (pageHtml[i] === '{') braceCount++;
                  if (pageHtml[i] === '}') {
                    braceCount--;
                    if (braceCount === 0) {
                      braceEnd = i + 1;
                      break;
                    }
                  }
                }
                if (braceEnd > braceStart) {
                  jsonStr = pageHtml.substring(braceStart, braceEnd);
                }
              }
            }
          }
          
          const playerResponse = JSON.parse(jsonStr);
          const pageCaptionTracks =
            playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
          if (pageCaptionTracks && pageCaptionTracks.length > 0) {
            console.log("Found captions in page HTML:", pageCaptionTracks.length, "tracks");
            captionTracksFromPage = pageCaptionTracks.map((track: any) => {
              console.log("  Page caption track:", {
                languageCode: track.languageCode,
                baseUrl: track.baseUrl?.substring(0, 100) + (track.baseUrl?.length > 100 ? "..." : ""),
                baseUrlLength: track.baseUrl?.length,
                kind: track.kind,
                name: track.name,
              });
              return {
                languageCode: track.languageCode,
                baseUrl: track.baseUrl,
              };
            });
            break; // Found captions, stop trying other patterns
          }
        } catch (parseError) {
          // JSON parse failed, try next pattern
          console.debug("Failed to parse player response with pattern:", parseError);
          continue;
        }
      }
    }
  } catch (error) {
    // Continue with API method if page extraction fails
    console.debug("Failed to extract captions from page HTML:", error);
  }

  // Step 3: Extract the InnerTube API key from the HTML
  const apiKeyMatch = pageHtml.match(
    /"INNERTUBE_API_KEY":\s*"([a-zA-Z0-9_-]+)"/,
  );
  let apiKey: string | null = null;
  if (apiKeyMatch && apiKeyMatch[1]) {
    apiKey = apiKeyMatch[1];
  } else {
    // If we have captions from the page, use those instead
    if (captionTracksFromPage && captionTracksFromPage.length > 0) {
      // We'll use captionTracksFromPage later, apiKey can be null
    } else {
      throw new Error("Could not extract InnerTube API key from YouTube page");
    }
  }

  // Step 4: Use the InnerTube API with the extracted key (if we don't have captions from page)
  let videoData: any = null;
  let videoTitle = "YouTube Transcript";
  let channelName: string | null = null;
  let videoDetails: VideoDetails | null = null;
  let captionTracks: CaptionTrack[] | null = null;

  if ((!captionTracksFromPage || captionTracksFromPage.length === 0) && apiKey) {
    if (statusCallback) statusCallback("Fetching video information...");
    const innertubeResponse = await requestUrl({
      url: `https://www.youtube.com/youtubei/v1/player?key=${apiKey}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: "WEB",
            clientVersion: "2.20250128.00.00",
            hl: "en",
            gl: "US",
          },
        },
        videoId: videoId,
      }),
    });

    if (innertubeResponse.status < 200 || innertubeResponse.status >= 300) {
      // If API fails but we have captions from page, use those
      if (captionTracksFromPage && captionTracksFromPage.length > 0) {
        // Extract video info from page HTML as fallback
        const titleMatch = pageHtml.match(/<meta\s+property="og:title"\s+content="([^"]+)"/);
        if (titleMatch) {
          videoTitle = decodeHtmlEntities(titleMatch[1]);
        }
        const channelMatch = pageHtml.match(/<meta\s+property="og:video:channel_name"\s+content="([^"]+)"/);
        if (channelMatch) {
          channelName = decodeHtmlEntities(channelMatch[1]);
        }
        captionTracks = captionTracksFromPage;
      } else {
        throw new Error(
          `Failed to fetch video info: ${innertubeResponse.status} ${innertubeResponse.text?.substring(0, 200) || "Unknown error"}`,
        );
      }
    } else {
      videoData = innertubeResponse.json;

      // Extract video title
      videoTitle = videoData?.videoDetails?.title || "YouTube Transcript";

      // Extract channel name
      channelName = videoData?.videoDetails?.author || null;

      // Extract all videoDetails
      videoDetails = videoData?.videoDetails
        ? (videoData.videoDetails as VideoDetails)
        : null;

      // Extract caption tracks
      captionTracks =
        videoData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      
      // If API didn't return captions but we have them from page, use page captions
      if ((!captionTracks || captionTracks.length === 0) && captionTracksFromPage && captionTracksFromPage.length > 0) {
        captionTracks = captionTracksFromPage;
      }
    }
  } else if (captionTracksFromPage && captionTracksFromPage.length > 0) {
    // Use captions extracted from page HTML (API key not found or not called)
    captionTracks = captionTracksFromPage;
    // Try to extract video info from page HTML
    const titleMatch = pageHtml.match(/<meta\s+property="og:title"\s+content="([^"]+)"/);
    if (titleMatch) {
      videoTitle = decodeHtmlEntities(titleMatch[1]);
    }
    const channelMatch = pageHtml.match(/<meta\s+property="og:video:channel_name"\s+content="([^"]+)"/);
    if (channelMatch) {
      channelName = decodeHtmlEntities(channelMatch[1]);
    }
  }

  if (!captionTracks || captionTracks.length === 0) {
    // Log detailed information for debugging
    const captionsRenderer = videoData?.captions?.playerCaptionsTracklistRenderer;
    console.error("No captions available for video:", videoId);
    console.error("Video data structure:", {
      hasCaptions: !!videoData?.captions,
      captionsKeys: videoData?.captions ? Object.keys(videoData.captions) : [],
      hasPlayerCaptionsTracklistRenderer: !!captionsRenderer,
      tracklistRendererKeys: captionsRenderer
        ? Object.keys(captionsRenderer)
        : [],
      hasAudioTracks: !!(captionsRenderer?.audioTracks),
      audioTracksLength: captionsRenderer?.audioTracks?.length || 0,
      hasTranslationLanguages: !!(captionsRenderer?.translationLanguages),
      translationLanguagesLength: captionsRenderer?.translationLanguages?.length || 0,
      foundCaptionsInPage: !!captionTracksFromPage,
      captionTracksFromPageLength: captionTracksFromPage?.length || 0,
    });
    throw new Error("No captions available for this video");
  }

  // Log available caption tracks
  console.log("Found caption tracks:", captionTracks.length);
  captionTracks.forEach((track, index) => {
    console.log(`  Track ${index + 1}:`, {
      languageCode: track.languageCode,
      baseUrl: track.baseUrl?.substring(0, 100) + (track.baseUrl?.length > 100 ? "..." : ""),
      baseUrlLength: track.baseUrl?.length,
    });
  });

  // Select caption track based on preferred language(s)
  let captionTrack: CaptionTrack | undefined;
  
  if (preferredLanguageCode && preferredLanguageCode.trim() !== "") {
    // Parse comma-separated list of preferred languages
    const preferredLanguages = preferredLanguageCode
      .split(",")
      .map((lang) => lang.trim().toLowerCase())
      .filter((lang) => lang.length > 0);
    
    // Try each preferred language in order until one is found
    for (const langCode of preferredLanguages) {
      captionTrack = captionTracks.find(
        (track: CaptionTrack) => track.languageCode === langCode,
      );
      if (captionTrack) {
        if (statusCallback) {
          statusCallback(`Using transcript language: ${captionTrack.languageCode.toUpperCase()}`);
        }
        break; // Found a match, stop searching
      }
    }
    
    // If none of the preferred languages were found, show warning but continue
    if (!captionTrack && statusCallback) {
      statusCallback(
        `Preferred languages "${preferredLanguageCode}" not available. Using fallback.`,
      );
    }
  }
  
  // Fallback: prefer English, then first available
  if (!captionTrack) {
    captionTrack = captionTracks.find(
      (track: CaptionTrack) => track.languageCode === "en",
    );
    if (!captionTrack) {
      captionTrack = captionTracks[0];
    }
    if (captionTrack && statusCallback && (!preferredLanguageCode || preferredLanguageCode.trim() === "")) {
      statusCallback(`Using transcript language: ${captionTrack.languageCode.toUpperCase()}`);
    }
  }

  // Ensure we have a caption track (should never happen, but TypeScript needs this)
  if (!captionTrack) {
    console.error("No caption track selected from available tracks:", captionTracks);
    throw new Error("No caption track available");
  }

  // Log selected caption track details
  console.log("Selected caption track:", {
    languageCode: captionTrack.languageCode,
    baseUrl: captionTrack.baseUrl,
    baseUrlLength: captionTrack.baseUrl?.length,
    preferredLanguageCode: preferredLanguageCode || "auto",
  });

  // Step 4: Fetch the transcript XML using the baseUrl
  if (statusCallback) statusCallback("Fetching transcript data...");
  let transcriptUrl = captionTrack.baseUrl;
  console.log("Fetching transcript from URL:", transcriptUrl);
  
  // Add necessary headers for YouTube transcript requests
  // YouTube may require Referer and proper User-Agent to serve transcripts
  const transcriptHeaders: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": `https://www.youtube.com/watch?v=${videoId}`,
    "Accept": "text/xml,application/xml,application/xhtml+xml,text/html;q=0.9,*/*;q=0.8",
  };
  
  let transcriptResponse;
  try {
    transcriptResponse = await requestUrl({
      url: transcriptUrl,
      headers: transcriptHeaders,
    });
  } catch (fetchError) {
    console.error("Error fetching transcript URL:", fetchError);
    console.error("Transcript URL was:", transcriptUrl);
    throw new Error(
      `Failed to fetch transcript: ${fetchError instanceof Error ? fetchError.message : "Unknown error"}`,
    );
  }

  console.log("Transcript response:", {
    status: transcriptResponse.status,
    headers: transcriptResponse.headers,
    contentType: transcriptResponse.headers?.["content-type"],
    contentLength: transcriptResponse.text?.length || 0,
    first200Chars: transcriptResponse.text?.substring(0, 200) || "(empty)",
  });

  if (transcriptResponse.status < 200 || transcriptResponse.status >= 300) {
    console.error("Transcript fetch failed with status:", transcriptResponse.status);
    console.error("Response text:", transcriptResponse.text?.substring(0, 500));
    throw new Error(
      `Failed to fetch transcript: ${transcriptResponse.status} ${transcriptResponse.text?.substring(0, 200) || "Unknown error"}`,
    );
  }

  const transcriptXml = transcriptResponse.text;
  console.log("Transcript XML received:", {
    isNull: transcriptXml === null,
    isUndefined: transcriptXml === undefined,
    isEmpty: !transcriptXml,
    isEmptyAfterTrim: !transcriptXml?.trim(),
    length: transcriptXml?.length || 0,
    first500Chars: transcriptXml?.substring(0, 500) || "(empty)",
  });

  if (!transcriptXml || !transcriptXml.trim()) {
    // Try fallback: construct fresh transcript URLs without expiration parameters
    console.warn("Transcript URL returned empty response, trying fallback URL construction...");
    // Check if this is an auto-generated caption (kind=asr)
    const isAutoGenerated = transcriptUrl.includes("kind=asr") || transcriptUrl.includes("caps=asr");
    const fallbackUrls = [
      // Try with caps=asr for auto-generated captions
      ...(isAutoGenerated ? [`https://www.youtube.com/api/timedtext?v=${videoId}&lang=${captionTrack.languageCode}&caps=asr&fmt=xml3`] : []),
      // Standard formats
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${captionTrack.languageCode}&fmt=xml3`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${captionTrack.languageCode}&fmt=srv3`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${captionTrack.languageCode}`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${captionTrack.languageCode}&fmt=ttml`,
      // Try without format specification
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${captionTrack.languageCode}&fmt=xml`,
    ];
    
    for (const fallbackUrl of fallbackUrls) {
      console.error("Trying fallback URL:", fallbackUrl);
      
      try {
        const fallbackResponse = await requestUrl({
          url: fallbackUrl,
          headers: transcriptHeaders,
        });
        
        console.error("Fallback response for", fallbackUrl, ":", {
          status: fallbackResponse.status,
          contentLength: fallbackResponse.text?.length || 0,
          contentType: fallbackResponse.headers?.["content-type"],
          first200Chars: fallbackResponse.text?.substring(0, 200) || "(empty)",
        });
        
        if (fallbackResponse.status >= 200 && fallbackResponse.status < 300 && fallbackResponse.text && fallbackResponse.text.trim()) {
          console.error("Fallback URL succeeded:", fallbackUrl);
          // Use the fallback response
          const parsedResult = await parseTranscript(
            app,
            fallbackResponse.text,
            generateSummary,
            llmProvider,
            settings,
            watchPageUrl,
            videoId,
            statusCallback,
            RetryModal,
            captionTrack.languageCode,
          );

          return {
            transcript: parsedResult.transcript,
            title: videoTitle,
            summary: parsedResult.summary,
            channelName: channelName,
            videoDetails: videoDetails,
          };
        } else {
          console.warn("Fallback URL returned empty or error:", fallbackUrl, "Status:", fallbackResponse.status, "Length:", fallbackResponse.text?.length || 0);
        }
      } catch (fallbackError) {
        console.error("Fallback URL failed:", fallbackUrl, "Error:", fallbackError);
      }
    }
    
    // If all fallbacks failed, this likely means YouTube is blocking requests
    // This can happen if YouTube requires authentication/cookies that Obsidian can't provide
    // or if there are rate limits/bot detection in place
    const errorDetails = {
      videoId: videoId,
      transcriptUrl: transcriptUrl,
      fallbackUrlsAttempted: fallbackUrls,
      responseStatus: transcriptResponse.status,
      responseHeaders: transcriptResponse.headers,
      responseTextLength: transcriptResponse.text?.length || 0,
      responseTextPreview: transcriptResponse.text?.substring(0, 500) || "(empty)",
      selectedCaptionTrack: captionTrack,
      allCaptionTracks: captionTracks,
      note: "YouTube is returning empty responses (200 status, 0 content-length). This may indicate that authentication/cookies are required, or YouTube is blocking automated requests.",
    };
    console.error("All transcript URL attempts returned empty response");
    console.error("Details:", JSON.stringify(errorDetails, null, 2));
    console.error("Selected caption track:", JSON.stringify(captionTrack, null, 2));
    console.error("All caption tracks:", JSON.stringify(captionTracks, null, 2));
    console.error("Response text (full):", transcriptResponse.text);
    console.error("Response headers:", JSON.stringify(transcriptResponse.headers, null, 2));
    throw new Error(
      `Transcript URL returned empty response. YouTube may be blocking automated requests or requiring authentication. Video: ${videoId}. Try accessing the video in a browser first, or check if the video has captions enabled.`,
    );
  }

  const parsedResult = await parseTranscript(
    app,
    transcriptXml,
    generateSummary,
    llmProvider,
    settings,
    watchPageUrl,
    videoId,
    statusCallback,
    RetryModal,
    captionTrack.languageCode,
  );

  return {
    transcript: parsedResult.transcript,
    title: videoTitle,
    summary: parsedResult.summary,
    channelName: channelName,
    videoDetails: videoDetails,
  };
}

async function parseTranscript(
  app: App,
  transcriptXml: string,
  generateSummary: boolean,
  llmProvider: LLMProvider,
  settings: YouTubeTranscriptPluginSettings,
  videoUrl: string,
  videoId: string,
  statusCallback?: StatusCallback,
  RetryModal?: RetryModalConstructor,
  transcriptLanguageCode?: string,
): Promise<LLMResponse> {
  // Parse XML and extract text with timestamps
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

  // Extract text with timestamps
  interface TranscriptSegment {
    text: string;
    startTime: number;
  }

  const transcriptSegments: TranscriptSegment[] = [];
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
      // Extract start time from the element's start attribute
      const startAttr = element.getAttribute("start");
      const startTime = startAttr ? parseFloat(startAttr) : -1;
      transcriptSegments.push({
        text: text.trim(),
        startTime: startTime,
      });
    }
  }

  // If still no content, try querySelectorAll with a broader search
  if (transcriptSegments.length === 0) {
    const allTextNodes = xmlDoc.querySelectorAll("*");
    for (let i = 0; i < allTextNodes.length; i++) {
      const node = allTextNodes[i];
      let text = node.textContent || "";
      if (text) {
        text = decodeHtmlEntities(text);
      }
      if (text && text.trim() && node.children.length === 0) {
        const startAttr = node.getAttribute("start");
        const startTime = startAttr ? parseFloat(startAttr) : -1;
        transcriptSegments.push({
          text: text.trim(),
          startTime: startTime,
        });
      }
    }
  }

  if (transcriptSegments.length === 0) {
    console.error(
      "Transcript XML structure:",
      transcriptXml.substring(0, 500),
    );
    throw new Error(
      "No transcript content found. The video may not have captions, or the format is unsupported.",
    );
  }

  // Build transcript with timestamps if enabled
  let rawTranscript: string;
  if (settings.singleLineTranscript) {
    // Single line mode: join everything with spaces
    if (settings.includeTimestamps) {
      const parts: string[] = [];
      let lastTimestampTime = -1;
      const timestampFrequency = settings.timestampFrequency || 0;

      for (let i = 0; i < transcriptSegments.length; i++) {
        const segment = transcriptSegments[i];
        const shouldAddTimestamp =
          segment.startTime >= 0 &&
          (timestampFrequency === 0 || // Every sentence
            lastTimestampTime < 0 || // First timestamp
            segment.startTime - lastTimestampTime >= timestampFrequency); // Frequency interval

        if (shouldAddTimestamp) {
          const timestamp = formatTimestamp(
            segment.startTime,
            videoUrl,
            videoId,
            settings.localVideoDirectory,
          );
          parts.push(timestamp, segment.text);
          lastTimestampTime = segment.startTime;
        } else {
          parts.push(segment.text);
        }
      }

      rawTranscript = parts.join(" ");
    } else {
      // No timestamps - just join text parts with spaces
      const textParts = transcriptSegments.map((s) => s.text);
      rawTranscript = textParts.join(" ");
    }
  } else {
    // Multi-line mode (original behavior)
    if (settings.includeTimestamps) {
      const lines: string[] = [];
      let currentLineParts: string[] = [];
      let lastTimestampTime = -1;
      const timestampFrequency = settings.timestampFrequency || 0;

      for (let i = 0; i < transcriptSegments.length; i++) {
        const segment = transcriptSegments[i];
        const shouldAddTimestamp =
          segment.startTime >= 0 &&
          (timestampFrequency === 0 || // Every sentence
            lastTimestampTime < 0 || // First timestamp
            segment.startTime - lastTimestampTime >= timestampFrequency); // Frequency interval

        if (shouldAddTimestamp) {
          // If there's accumulated text, finish the current line first
          if (currentLineParts.length > 0) {
            lines.push(currentLineParts.join(" "));
            currentLineParts = [];
          }
          // Start a new line with timestamp at the beginning, followed by the text
          const timestamp = formatTimestamp(
            segment.startTime,
            videoUrl,
            videoId,
            settings.localVideoDirectory,
          );
          currentLineParts.push(timestamp, segment.text);
          lastTimestampTime = segment.startTime;
        } else {
          // Just add text to current line (continuing from previous segments)
          currentLineParts.push(segment.text);
        }

        // For timestampFrequency === 0, finish line after sentence-ending punctuation
        if (timestampFrequency === 0) {
          const text = segment.text.trim();
          if (
            text.endsWith(".") ||
            text.endsWith("!") ||
            text.endsWith("?")
          ) {
            if (currentLineParts.length > 0) {
              lines.push(currentLineParts.join(" "));
              currentLineParts = [];
            }
          }
        }
      }

      // Add any remaining content
      if (currentLineParts.length > 0) {
        lines.push(currentLineParts.join(" "));
      }

      // Join lines with newlines
      rawTranscript = lines.join("\n");
    } else {
      // No timestamps - just join text parts
      const textParts = transcriptSegments.map((s) => s.text);
      rawTranscript = textParts.join(" ");
      // Add newlines after sentence-ending punctuation followed by a space and capital letter
      rawTranscript = rawTranscript.replace(/([.!?])\s+([A-Z])/g, "$1\n\n$2");
    }
  }

  // Process through LLM if provider is configured
  const providerToUse = llmProvider || settings.llmProvider;
  if (providerToUse && providerToUse !== "none") {
    const hasKey = hasProviderKey(providerToUse, settings);
    if (hasKey) {
      // If timestamps are included but we don't want them in LLM output, remove them
      let transcriptForLLM = rawTranscript;
      if (settings.includeTimestamps && !settings.includeTimestampsInLLM) {
        // Remove timestamp links: [MM:SS](url) or [H:MM:SS](url)
        transcriptForLLM = transcriptForLLM.replace(
          /\[(\d{1,2}:\d{2}(?::\d{2})?)\]\([^)]+\)\s*/g,
          "",
        );
        // Clean up any double spaces that might result
        transcriptForLLM = transcriptForLLM.replace(/\s+/g, " ").trim();
      }

      const processed = await processWithLLM(
        app,
        transcriptForLLM,
        generateSummary,
        providerToUse,
        settings,
        statusCallback,
        RetryModal,
        transcriptLanguageCode,
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
      10000,
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
  transcriptLanguageCode?: string,
): Promise<LLMResponse> {
  if (!provider || provider === "none" || !hasProviderKey(provider, settings)) {
    const providerName = getProviderName(provider || "none");
    console.debug(
      `processWithLLM: No ${providerName} key, returning transcript without summary`,
    );
    new Notice(
      `${providerName} processing requested but API key is not configured. Using raw transcript instead.`,
      10000,
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
        transcriptLanguageCode,
      );
    case "gemini":
      return await processWithGemini(
        app,
        transcript,
        generateSummary,
        settings,
        statusCallback,
        RetryModal,
        transcriptLanguageCode,
      );
    case "claude":
      return await processWithClaude(
        app,
        transcript,
        generateSummary,
        settings,
        statusCallback,
        RetryModal,
        transcriptLanguageCode,
      );
    default:
      new Notice(`Unsupported LLM provider: ${String(provider)}`, 10000);
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
