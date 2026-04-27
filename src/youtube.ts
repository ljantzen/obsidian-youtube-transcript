import { Notice, requestUrl, App } from "obsidian";
import type {
  CaptionTrack,
  TranscriptResult,
  TranscriptSegment,
  LLMProvider,
  YouTubeTranscriptPluginSettings,
  StatusCallback,
  LLMResponse,
  RetryModalConstructor,
  VideoDetails,
} from "./types";
import { extractVideoId, decodeHtmlEntities, formatTimestamp } from "./utils";
import { getProviderName, hasProviderKey } from "./providerUtils";

const INNERTUBE_PLAYER_URL = "https://www.youtube.com/youtubei/v1/player";

interface InnerTubeClientConfig {
  context: object;
  userAgent: string;
  extraHeaders?: Record<string, string>;
}

function makeClientConfigs(
  lang: string,
  country: string,
  visitorData?: string | null,
): InnerTubeClientConfig[] {
  const vd = visitorData || "";
  return [
    // ANDROID_VR (Oculus Quest) — primary. Does not require po_token when
    // visitorData from the watch page is supplied. This is what yt-dlp uses.
    {
      context: {
        client: {
          clientName: "ANDROID_VR",
          clientVersion: "1.71.26",
          deviceMake: "Oculus",
          deviceModel: "Quest 3",
          androidSdkVersion: 32,
          osName: "Android",
          osVersion: "12L",
          userAgent: "com.google.android.apps.youtube.vr.oculus/1.71.26 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip",
          hl: lang,
          gl: country,
          ...(vd ? { visitorData: vd } : {}),
        },
      },
      userAgent: "com.google.android.apps.youtube.vr.oculus/1.71.26 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip",
      extraHeaders: {
        "X-YouTube-Client-Name": "28",
        "X-YouTube-Client-Version": "1.71.26",
        "Origin": "https://www.youtube.com",
        ...(vd ? { "X-Goog-Visitor-Id": vd } : {}),
      },
    },
    // ANDROID — fallback #1
    {
      context: {
        client: {
          clientName: "ANDROID",
          clientVersion: "19.44.38",
          androidSdkVersion: 34,
          hl: lang,
          gl: country,
        },
      },
      userAgent: "com.google.android.youtube/19.44.38 (Linux; U; Android 14) gzip",
    },
    // IOS — fallback #2
    {
      context: {
        client: {
          clientName: "IOS",
          clientVersion: "19.45.4",
          deviceModel: "iPhone16,2",
          hl: lang,
          gl: country,
        },
      },
      userAgent: "com.google.ios.youtube/19.45.4 (iPhone16,2; U; CPU iOS 18_1_0 like Mac OS X)",
    },
    // WEB_EMBEDDED_PLAYER — fallback #3
    {
      context: {
        client: {
          clientName: "WEB_EMBEDDED_PLAYER",
          clientVersion: "2.20231121.08.00",
          hl: lang,
          gl: country,
        },
        thirdParty: {
          embedUrl: "https://www.youtube.com/",
        },
      },
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    },
    // TVHTML5_SIMPLY_EMBEDDED_PLAYER — fallback #4
    {
      context: {
        client: {
          clientName: "TVHTML5_SIMPLY_EMBEDDED_PLAYER",
          clientVersion: "2.0",
          hl: lang,
          gl: country,
        },
        thirdParty: {
          embedUrl: "https://www.youtube.com/",
        },
      },
      userAgent: "Mozilla/5.0 (SMART-TV; LINUX; Tizen 6.0) AppleWebKit/538.1 (KHTML, like Gecko) Version/6.0 TV Safari/538.1",
    },
  ];
}

/**
 * Extracts a JSON object from HTML by key (e.g. "ytInitialPlayerResponse").
 * Handles deeply nested objects without regex size limits.
 */
function extractJsonFromHtml(html: string, key: string): any | null {
  const keyIdx = html.indexOf(key);
  if (keyIdx === -1) return null;

  const startIdx = html.indexOf("{", keyIdx);
  if (startIdx === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = startIdx; i < html.length; i++) {
    const ch = html[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\" && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(html.substring(startIdx, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

interface WatchPageData {
  visitorData: string | null;
  playerData: any | null;
}

/**
 * Fetches the YouTube watch page and extracts both visitorData (needed by
 * ANDROID_VR to bypass bot detection) and ytInitialPlayerResponse (used as a
 * last-resort fallback if all InnerTube API clients fail).
 * Never throws — returns nulls if the fetch fails.
 */
async function fetchWatchPageData(videoId: string): Promise<WatchPageData> {
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  let response;
  try {
    response = await requestUrl({
      url: watchUrl,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
  } catch {
    return { visitorData: null, playerData: null };
  }

  if (response.status < 200 || response.status >= 300) {
    return { visitorData: null, playerData: null };
  }

  const html = response.text;
  const vdMatch = html.match(/"VISITOR_DATA":\s*"([^"]+)"/);
  const visitorData = vdMatch ? vdMatch[1] : null;
  const playerData = extractJsonFromHtml(html, "ytInitialPlayerResponse");
  return { visitorData, playerData };
}

/**
 * Fetches player data from YouTube's InnerTube API.
 *
 * Strategy:
 * 1. Fetch the watch page first to obtain visitorData (required by ANDROID_VR)
 *    and a backup copy of ytInitialPlayerResponse.
 * 2. Try API clients in order. ANDROID_VR + visitorData is the primary path
 *    (what yt-dlp uses; works without a po_token).
 * 3. If all API clients fail, use the backup playerData from the watch page.
 *
 * Only throws immediately for LOGIN_REQUIRED (auth-gated content).
 */
async function fetchPlayerDataWithAndroidClient(
  videoId: string,
  lang?: string,
  country?: string,
): Promise<any> {
  // Fetch watch page first — we need visitorData for ANDROID_VR to work
  const { visitorData, playerData: htmlPlayerData } = await fetchWatchPageData(videoId);

  const clients = makeClientConfigs(lang || "en", country || "US", visitorData);
  const errors: string[] = [];

  for (const client of clients) {
    const clientName = (client.context as any).client.clientName as string;
    let response;
    try {
      response = await requestUrl({
        url: INNERTUBE_PLAYER_URL,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": client.userAgent,
          ...client.extraHeaders,
        },
        body: JSON.stringify({
          context: client.context,
          videoId: videoId,
        }),
      });
    } catch (err) {
      errors.push(`${clientName}: request error`);
      continue;
    }

    if (response.status < 200 || response.status >= 300) {
      errors.push(`${clientName}: HTTP ${response.status}`);
      continue;
    }

    const data = response.json;
    const ps = data?.playabilityStatus;
    if (ps) {
      if (ps.status === "LOGIN_REQUIRED") {
        // Video requires authentication — no point trying other clients
        throw new Error("This video requires login to view");
      }
      if (ps.status === "ERROR" || ps.status === "UNPLAYABLE") {
        // May be a client-level rejection — try the next client
        errors.push(`${clientName}: ${ps.status} — ${ps.reason || "unknown reason"}`);
        continue;
      }
    }

    return data;
  }

  // All InnerTube API clients failed — use the watch page HTML player data as
  // a last resort. This gives us caption URLs but they may still be blocked
  // (see transcript fetch fallbacks below).
  if (htmlPlayerData) {
    const ps = htmlPlayerData?.playabilityStatus;
    if (ps?.status === "LOGIN_REQUIRED") {
      throw new Error("This video requires login to view");
    }
    if (ps?.status === "ERROR") {
      throw new Error(ps.reason || "Video unavailable");
    }
    console.warn(
      `All InnerTube clients failed (${errors.join("; ")}). Using watch page HTML player data.`,
    );
    return htmlPlayerData;
  }

  throw new Error(
    `Failed to fetch video info. All clients failed: ${errors.join("; ")}`,
  );
}

/**
 * Gets available caption languages for a YouTube video
 */
export async function getAvailableLanguages(
  videoId: string,
  _apiKey: string, // kept for backwards compatibility, not used
): Promise<CaptionTrack[]> {
  const videoData = await fetchPlayerDataWithAndroidClient(videoId);
  const captionTracks =
    videoData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

  return captionTracks || [];
}
import { processWithOpenAI } from "./llm/openai";
import { processWithGemini } from "./llm/gemini";
import { processWithClaude } from "./llm/claude";
import { processWithCustomProvider } from "./llm/custom";

export async function getYouTubeTranscript(
  app: App,
  url: string,
  generateSummary: boolean,
  llmProvider: LLMProvider | null,
  settings: YouTubeTranscriptPluginSettings,
  statusCallback?: StatusCallback,
  RetryModal?: RetryModalConstructor,
  preferredLanguageCode?: string | null,
): Promise<TranscriptResult> {
  const videoId = extractVideoId(url);
  if (!videoId) {
    throw new Error("Invalid YouTube URL or video ID");
  }

  const watchPageUrl = `https://www.youtube.com/watch?v=${videoId}`;

  // Use ANDROID client to fetch video data - more reliable for caption access
  if (statusCallback) statusCallback("Fetching video information...");

  let videoData: any;
  try {
    videoData = await fetchPlayerDataWithAndroidClient(videoId);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to fetch video data: ${errorMessage}`);
  }

  // Extract video metadata
  const videoTitle = videoData?.videoDetails?.title || "YouTube Transcript";
  const channelName = videoData?.videoDetails?.author || null;
  const videoDetails: VideoDetails | null = videoData?.videoDetails
    ? (videoData.videoDetails as VideoDetails)
    : null;

  // Extract caption tracks
  const captionTracks: CaptionTrack[] =
    videoData?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];

  if (!captionTracks || captionTracks.length === 0) {
    // Log detailed information for debugging
    const captionsRenderer =
      videoData?.captions?.playerCaptionsTracklistRenderer;
    console.error("No captions available for video:", videoId);
    console.error("Video data structure:", {
      hasCaptions: !!videoData?.captions,
      captionsKeys: videoData?.captions ? Object.keys(videoData.captions) : [],
      hasPlayerCaptionsTracklistRenderer: !!captionsRenderer,
      tracklistRendererKeys: captionsRenderer
        ? Object.keys(captionsRenderer)
        : [],
      hasAudioTracks: !!captionsRenderer?.audioTracks,
      audioTracksLength: captionsRenderer?.audioTracks?.length || 0,
      hasTranslationLanguages: !!captionsRenderer?.translationLanguages,
      translationLanguagesLength:
        captionsRenderer?.translationLanguages?.length || 0,
    });
    throw new Error("No captions available for this video");
  }

  // Log available caption tracks
  console.log("Found caption tracks:", captionTracks.length);
  captionTracks.forEach((track, index) => {
    console.log(`  Track ${index + 1}:`, {
      languageCode: track.languageCode,
      baseUrl:
        track.baseUrl?.substring(0, 100) +
        (track.baseUrl?.length > 100 ? "..." : ""),
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
          statusCallback(
            `Using transcript language: ${captionTrack.languageCode.toUpperCase()}`,
          );
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
    if (
      captionTrack &&
      statusCallback &&
      (!preferredLanguageCode || preferredLanguageCode.trim() === "")
    ) {
      statusCallback(
        `Using transcript language: ${captionTrack.languageCode.toUpperCase()}`,
      );
    }
  }

  // Ensure we have a caption track (should never happen, but TypeScript needs this)
  if (!captionTrack) {
    console.error(
      "No caption track selected from available tracks:",
      captionTracks,
    );
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
    Referer: `https://www.youtube.com/watch?v=${videoId}`,
    Accept:
      "text/xml,application/xml,application/xhtml+xml,text/html;q=0.9,*/*;q=0.8",
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
    console.error(
      "Transcript fetch failed with status:",
      transcriptResponse.status,
    );
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
    console.warn(
      "Transcript URL returned empty response, trying fallback URL construction...",
    );
    // Check if this is an auto-generated caption (kind=asr)
    const isAutoGenerated =
      transcriptUrl.includes("kind=asr") || transcriptUrl.includes("caps=asr");
    const fallbackUrls = [
      // Try with caps=asr for auto-generated captions
      ...(isAutoGenerated
        ? [
            `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${captionTrack.languageCode}&caps=asr&fmt=xml3`,
          ]
        : []),
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

        if (
          fallbackResponse.status >= 200 &&
          fallbackResponse.status < 300 &&
          fallbackResponse.text &&
          fallbackResponse.text.trim()
        ) {
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
            segments: parsedResult.segments,
          };
        } else {
          console.warn(
            "Fallback URL returned empty or error:",
            fallbackUrl,
            "Status:",
            fallbackResponse.status,
            "Length:",
            fallbackResponse.text?.length || 0,
          );
        }
      } catch (fallbackError) {
        console.error(
          "Fallback URL failed:",
          fallbackUrl,
          "Error:",
          fallbackError,
        );
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
      responseTextPreview:
        transcriptResponse.text?.substring(0, 500) || "(empty)",
      selectedCaptionTrack: captionTrack,
      allCaptionTracks: captionTracks,
      note: "YouTube is returning empty responses (200 status, 0 content-length). This may indicate that authentication/cookies are required, or YouTube is blocking automated requests.",
    };
    console.error("All transcript URL attempts returned empty response");
    console.error("Details:", JSON.stringify(errorDetails, null, 2));
    console.error(
      "Selected caption track:",
      JSON.stringify(captionTrack, null, 2),
    );
    console.error(
      "All caption tracks:",
      JSON.stringify(captionTracks, null, 2),
    );
    console.error("Response text (full):", transcriptResponse.text);
    console.error(
      "Response headers:",
      JSON.stringify(transcriptResponse.headers, null, 2),
    );
    throw new Error(
      `YouTube returned an empty transcript for video ${videoId}. YouTube now requires authentication for transcript access and is blocking unauthenticated requests. This affects all videos — it is a YouTube-side change, not specific to this video or channel.`,
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
    segments: parsedResult.segments,
  };
}

async function parseTranscript(
  app: App,
  transcriptXml: string,
  generateSummary: boolean,
  llmProvider: LLMProvider | null,
  settings: YouTubeTranscriptPluginSettings,
  videoUrl: string,
  videoId: string,
  statusCallback?: StatusCallback,
  RetryModal?: RetryModalConstructor,
  transcriptLanguageCode?: string,
): Promise<LLMResponse & { segments: TranscriptSegment[] }> {
  // Parse XML and extract text with timestamps
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(transcriptXml, "text/xml");

  // Check for XML parsing errors
  const parserError = xmlDoc.querySelector("parsererror");
  if (parserError) {
    console.error("XML parsing error:", parserError.textContent);
    console.error("Transcript XML content:", transcriptXml.substring(0, 1000));
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
      // Extract start time: try "start" (YouTube timedtext), then "t", then "begin" (TTML)
      const startAttr =
        element.getAttribute("start") ??
        element.getAttribute("t") ??
        element.getAttribute("begin");
      const startTime = startAttr ? parseFloat(startAttr) : -1;
      // Extract duration: try "dur" (YouTube timedtext), then "d", then "end" (TTML)
      const durAttr =
        element.getAttribute("dur") ??
        element.getAttribute("d");
      const duration = durAttr ? parseFloat(durAttr) : undefined;
      transcriptSegments.push({
        text: text.trim(),
        startTime: startTime,
        duration: duration,
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
        const startAttr =
          node.getAttribute("start") ??
          node.getAttribute("t") ??
          node.getAttribute("begin");
        const startTime = startAttr ? parseFloat(startAttr) : -1;
        const durAttr2 =
          node.getAttribute("dur") ??
          node.getAttribute("d");
        const duration2 = durAttr2 ? parseFloat(durAttr2) : undefined;
        transcriptSegments.push({
          text: text.trim(),
          startTime: startTime,
          duration: duration2,
        });
      }
    }
  }

  if (transcriptSegments.length === 0) {
    console.error("Transcript XML structure:", transcriptXml.substring(0, 500));
    throw new Error(
      "No transcript content found. The video may not have captions, or the format is unsupported.",
    );
  }

  // Normalize time unit: YouTube timedtext can return seconds, milliseconds, or hundredths of seconds.
  // If consecutive gaps are huge when interpreted as seconds (e.g. 2400 "seconds" = 40 min between
  // sentences), the values are likely in ms or centiseconds. Convert to seconds.
  if (transcriptSegments.length >= 2) {
    const gaps: number[] = [];
    for (let i = 1; i < transcriptSegments.length; i++) {
      const a = transcriptSegments[i - 1].startTime;
      const b = transcriptSegments[i].startTime;
      if (a >= 0 && b >= 0) gaps.push(b - a);
    }
    if (gaps.length > 0) {
      const sorted = [...gaps].sort((x, y) => x - y);
      const medianGap = sorted[Math.floor(sorted.length / 2)]!;
      // Sentence-to-sentence gaps are typically 1–60 seconds. If median gap > 5 min, unit is likely wrong.
      if (medianGap > 300) {
        const gapsAsMs = gaps.map((g) => g / 1000);
        const medianGapMs =
          gapsAsMs.sort((x, y) => x - y)[Math.floor(gapsAsMs.length / 2)] ?? 0;
        if (medianGapMs >= 0.1 && medianGapMs <= 60) {
          // Assume milliseconds: convert to seconds
          for (const seg of transcriptSegments) {
            if (seg.startTime >= 0) seg.startTime /= 1000;
          }
        } else {
          const gapsAsHundredths = gaps.map((g) => g / 100);
          const medianGap100 =
            gapsAsHundredths.sort((x, y) => x - y)[
              Math.floor(gapsAsHundredths.length / 2)
            ] ?? 0;
          if (medianGap100 >= 0.5 && medianGap100 <= 120) {
            // Assume hundredths of seconds: convert to seconds
            for (const seg of transcriptSegments) {
              if (seg.startTime >= 0) seg.startTime /= 100;
            }
          }
        }
      }
    }
  }

  // Build transcript with timestamps if enabled (strict boolean so setting is honoured)
  const includeTimestamps = settings.includeTimestamps === true;
  let rawTranscript: string;
  if (settings.singleLineTranscript) {
    // Single line mode: join everything with spaces
    if (includeTimestamps) {
      const parts: string[] = [];
      let lastTimestampTime = -1;
      const timestampFrequency = settings.timestampFrequency || 0;

      for (let i = 0; i < transcriptSegments.length; i++) {
        const segment = transcriptSegments[i];
        // Use 0 when segment has no start time so "Include timestamps" is still honoured
        const effectiveStartTime =
          segment.startTime >= 0 ? segment.startTime : 0;
        const shouldAddTimestamp =
          timestampFrequency === 0 || // Every sentence
          lastTimestampTime < 0 || // First timestamp
          effectiveStartTime - lastTimestampTime >= timestampFrequency; // Frequency interval

        if (shouldAddTimestamp) {
          const timestamp = formatTimestamp(
            effectiveStartTime,
            videoUrl,
            videoId,
            settings.localVideoDirectory,
          );
          parts.push(timestamp, segment.text);
          lastTimestampTime = effectiveStartTime;
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
    // Collapse any internal newlines/tabs from segment text so output is truly one line
    rawTranscript = rawTranscript.replace(/\s+/g, " ").trim();
  } else {
    // Multi-line mode (original behavior)
    if (includeTimestamps) {
      const lines: string[] = [];
      let currentLineParts: string[] = [];
      let lastTimestampTime = -1;
      const timestampFrequency = settings.timestampFrequency || 0;

      for (let i = 0; i < transcriptSegments.length; i++) {
        const segment = transcriptSegments[i];
        // Use 0 when segment has no start time so "Include timestamps" is still honoured
        const effectiveStartTime =
          segment.startTime >= 0 ? segment.startTime : 0;
        const shouldAddTimestamp =
          timestampFrequency === 0 || // Every sentence
          lastTimestampTime < 0 || // First timestamp
          effectiveStartTime - lastTimestampTime >= timestampFrequency; // Frequency interval

        if (shouldAddTimestamp) {
          // If there's accumulated text, finish the current line first
          if (currentLineParts.length > 0) {
            lines.push(currentLineParts.join(" "));
            currentLineParts = [];
          }
          // Start a new line with timestamp at the beginning, followed by the text
          const timestamp = formatTimestamp(
            effectiveStartTime,
            videoUrl,
            videoId,
            settings.localVideoDirectory,
          );
          currentLineParts.push(timestamp, segment.text);
          lastTimestampTime = effectiveStartTime;
        } else {
          // Just add text to current line (continuing from previous segments)
          currentLineParts.push(segment.text);
        }

        // For timestampFrequency === 0, finish line after sentence-ending punctuation
        if (timestampFrequency === 0) {
          const text = segment.text.trim();
          if (text.endsWith(".") || text.endsWith("!") || text.endsWith("?")) {
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

  // Process through LLM if provider is specified (not null)
  if (llmProvider) {
    const hasKey = hasProviderKey(llmProvider, settings);
    if (hasKey) {
      // If timestamps are included but we don't want them in LLM output, remove them
      let transcriptForLLM = rawTranscript;
      if (includeTimestamps && !settings.includeTimestampsInLLM) {
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
        llmProvider,
        settings,
        statusCallback,
        RetryModal,
        transcriptLanguageCode,
      );
      return { ...processed, segments: transcriptSegments };
    }
  }

  // If summary was requested but no LLM provider/key, return raw transcript
  if (generateSummary) {
    const providerName = llmProvider ? getProviderName(llmProvider) : "LLM";
    console.warn(
      `Summary generation requested but ${providerName} API key is not configured`,
    );
    new Notice(
      `Summary generation requested but ${providerName} API key is not configured. Using raw transcript instead.`,
      10000,
    );
  }
  return { transcript: rawTranscript, summary: null, segments: transcriptSegments };
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
  if (!hasProviderKey(provider, settings)) {
    const providerName = getProviderName(provider);
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
    default: {
      // Check if it's a custom provider
      const customProvider = settings.customProviders?.find(
        (p) => p.id === provider,
      );
      if (customProvider) {
        return await processWithCustomProvider(
          app,
          transcript,
          generateSummary,
          settings,
          customProvider,
          statusCallback,
          RetryModal,
          transcriptLanguageCode,
        );
      }
      new Notice(`Unsupported LLM provider: ${String(provider)}`, 10000);
      return { transcript, summary: null };
    }
  }
}
