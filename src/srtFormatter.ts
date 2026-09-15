import type { TranscriptSegment } from "./types";

// Minimum time a cue stays on screen when duration is derived from reading speed,
// so single-word segments don't flash by unreadably fast.
const MIN_READING_DURATION_SECONDS = 1;

export interface SrtOptions {
  // When set to a positive number, cue duration is computed from word count at this
  // reading speed (words per minute) instead of the segment's actual timing.
  readingSpeedWpm?: number;
}

function formatSrtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return (
    h.toString().padStart(2, "0") +
    ":" +
    m.toString().padStart(2, "0") +
    ":" +
    s.toString().padStart(2, "0") +
    "," +
    ms.toString().padStart(3, "0")
  );
}

export function generateSrt(segments: TranscriptSegment[], options?: SrtOptions): string {
  const wpm = options?.readingSpeedWpm && options.readingSpeedWpm > 0 ? options.readingSpeedWpm : undefined;
  const validSegments = segments.filter((seg) => seg.startTime >= 0);
  return validSegments
    .map((seg, i) => {
      const start = seg.startTime;
      const next = validSegments[i + 1];
      let end: number;
      if (wpm) {
        const wordCount = seg.text.trim().split(/\s+/).filter(Boolean).length;
        const readingDuration = (wordCount / wpm) * 60;
        end = start + Math.max(readingDuration, MIN_READING_DURATION_SECONDS);
        if (next && end > next.startTime) {
          end = next.startTime;
        }
      } else if (seg.duration !== undefined && seg.duration > 0) {
        end = start + seg.duration;
        if (next && end > next.startTime) {
          end = next.startTime;
        }
      } else {
        end = next ? next.startTime : start + 5;
      }
      return `${i + 1}\n${formatSrtTime(start)} --> ${formatSrtTime(end)}\n${seg.text}`;
    })
    .join("\n\n");
}
