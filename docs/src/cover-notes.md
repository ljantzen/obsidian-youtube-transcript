# Cover Notes

When creating PDF or SRT files, you can automatically generate markdown cover notes that link to them:

1. Enable "Create cover note" in Settings → YouTube Transcript Settings
2. Configure the cover note location (supports template variables: `{ChannelName}`, `{VideoName}`)
3. Optionally specify a custom template file for cover notes
4. When a PDF or SRT file is created, a markdown cover note will be automatically generated and opened

**No open file required**: If "Cover note location" is configured, you can create PDF/SRT transcripts even when no document is open (the cover note location acts as the target directory). This also works with the clipboard command.

## Nesting PDF and SRT Files Under Cover Notes

When "Create cover note" is enabled, PDF and SRT files are automatically nested in subfolders underneath the cover note location:

1. Enable "Create cover note" in Settings → YouTube Transcript Settings
2. Set the "Attachment folder" name (e.g., "Attachments", "Subtitles", etc.)
3. Files will be automatically nested under a folder with your specified name
4. Files will be created in: `{coverNoteLocation}/{attachmentFolder}/{filename}`
5. Cover notes will be created in: `{coverNoteLocation}/{videoTitle}.md` and will link to all created files

**Example:**
- Cover note location: `Attachments`
- Attachment folder: `Attachments`
- Creating both PDF and SRT:
  - Cover note: `Attachments/My Video.md`
  - PDF: `Attachments/Attachments/My Video.pdf`
  - SRT: `Attachments/Attachments/My Video.srt`

## Cover Note Template Variables

- `{ChannelName}` - Sanitized channel name
- `{VideoName}` - Sanitized video title
- `{VideoUrl}` - YouTube video URL
- `{Summary}` - Video summary (if available)
- `{PdfLink}` - Path to the PDF file (for Obsidian links)
- `{SrtLink}` - Path to the SRT subtitle file (populated when SRT format is enabled in settings)
- `{VideoId}` - YouTube video ID
- `{LengthSeconds}` - Video duration in seconds
- `{ViewCount}` - Number of views
- `{PublishDate}` - Upload/publish date
- `{Description}` - Video description
- `{ChannelId}` - YouTube channel ID
- `{IsLive}` - Whether the video is a live stream (true/false)
- `{IsPrivate}` - Whether the video is private (true/false)
- `{IsUnlisted}` - Whether the video is unlisted (true/false)
- `{VideoDetails.*}` - Access any videoDetails field using dot notation (e.g., `{VideoDetails.thumbnail.thumbnails[0].url}`)

## Cover Note Location

- Uses FolderSuggest for easy path selection
- Supports template variables `{ChannelName}` and `{VideoName}` for dynamic folder organization
- If empty, cover notes are created in the same directory as the PDF
- Folders are automatically created if they don't exist

## Custom Templates

- Create a markdown template file with any of the template variables above
- Set the template path in Settings → YouTube Transcript Settings → Cover Note Settings → Cover note template
- The template will be processed with all available variables
- If the template file is not found, the default template will be used

## Migration Note (Previous Behavior)

If you previously used the plugin with `useAttachmentFolderForPdf` and `pdfAttachmentFolderName` settings, these options have been removed for simplification. The new behavior:
- PDFs are now nested under a folder with the video title when cover notes are enabled (no configuration needed)
- Previous custom folder names set in `pdfAttachmentFolderName` are no longer used
- To organize files by channel or other criteria, use the `{ChannelName}` or `{VideoName}` template variables in the **Cover note location** setting instead
- The `useAttachmentFolderForPdf` setting has also been removed; simply set your preferred directory in the saved directories list
