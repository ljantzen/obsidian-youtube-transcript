# Timestamps

Timestamps are included by default and appear as clickable links. In multi-line mode, they appear at the beginning of each line (e.g., `[5:30](url) Text content...`). In single-line mode, timestamps are inline with the text (e.g., `[0:05](url) Hello [0:10](url) world`). Clicking a timestamp opens the video at that exact moment.

## Timestamp Settings

- **Include timestamps**: Toggle to enable/disable timestamps in transcripts (default: enabled)
- **Timestamp frequency**:
  - `0` = every sentence (default)
  - `>0` = every N seconds (e.g., `30` = every 30 seconds)
- **Include timestamps in LLM output**: When enabled, timestamps are preserved in AI-processed transcripts
- **Single line transcript**: When enabled, timestamps are displayed inline within a single continuous line of text
- **Local video directory**: If you have downloaded videos locally, set this to the directory path. Timestamps will then point to local files (`file:///path/video-id.mp4?t=SECONDS`) instead of YouTube URLs. Videos should be named `{video-id}.mp4` in the specified directory.

**Note**: PDF format does not support clickable links, so timestamps in PDF files will appear as plain text.
