import type { TranscriptSegment } from "./types";

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

export function generateSrt(segments: TranscriptSegment[]): string {
  const validSegments = segments.filter((seg) => seg.startTime >= 0);
  return validSegments
    .map((seg, i) => {
      const start = seg.startTime;
      let end: number;
      if (seg.duration !== undefined && seg.duration > 0) {
        end = start + seg.duration;
      } else {
        const next = validSegments[i + 1];
        end = next ? next.startTime : start + 5;
      }
      return `${i + 1}\n${formatSrtTime(start)} --> ${formatSrtTime(end)}\n${seg.text}`;
    })
    .join("\n\n");
}
