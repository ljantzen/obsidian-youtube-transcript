# Output Formats

The plugin allows you to generate **one or more file formats** in a single request.

**In the modal:**
- Check the boxes for the formats you want to generate (Markdown, PDF, SRT)
- Select one or more formats — all will be created in one request
- The transcript is fetched once and used for all selected formats

**Example:** Select PDF, Markdown, and SRT to create:
- `My Video.md` - Searchable markdown transcript
- `My Video/Attachments/My Video.pdf` - PDF with optional cover note (if cover notes enabled)
- `My Video/Attachments/My Video.srt` - SRT subtitle file with optional cover note (if cover notes enabled)

## Format Details

- **Markdown (.md)**: Full transcript with timestamps as clickable links. Opens automatically after creation.
- **PDF**: Professional document format. Creates nested folder with optional markdown cover note. PDFs open in your system's default PDF viewer. PDF generation requires Electron API access (desktop app only).
- **SRT**: Subtitle format for video players. LLM processing is automatically skipped for SRT files to preserve timing cues. By default, cue timing follows the transcript's actual segment durations; optionally, you can switch to reading-speed-based timing (see [Settings Reference](settings-reference.md)).

**Note**: PDF format does not support clickable links, so timestamps in PDF files will appear as plain text.

## Available Formats

- Configure which formats are available in Settings → YouTube Transcript Settings → Available file formats
- Only enabled formats appear in the modal dropdown
- At least one format must always be enabled
