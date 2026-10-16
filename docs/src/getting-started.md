# Getting Started

## Basic Usage

1. Open a markdown note (or any file to determine the directory for new files, unless you have a default directory set)
2. Use the ribbon icon (YouTube icon) or command palette to fetch a YouTube transcript
3. Enter the YouTube video URL or ID (or copy a YouTube URL to your clipboard — it will be automatically prefilled)
4. Choose to insert into current note or create a new file
5. The transcript will be fetched and inserted/created

**Tip**: If you have a YouTube URL in your clipboard, it will be automatically prefilled in the URL field when you open the modal. The modal will also automatically fetch and display available transcript languages for the video. If you have a default directory configured, you can create new files even when no document is open.

## Clipboard Command (Keyboard Shortcut)

The plugin includes a command that automatically fetches transcripts from your clipboard using default settings:

1. Copy a YouTube URL to your clipboard
2. Use the command "Fetch YouTube transcript from clipboard" (can be assigned a keyboard shortcut in Settings → Hotkeys)
3. The transcript will be fetched and **all configured file formats will be generated** (e.g., Markdown, PDF, and SRT together)
4. If you have a default directory set, files will be created there (even if no document is open)
5. If no default directory is set and no document is open, you'll get an error message

**Multiple formats**: The clipboard command generates all file formats that are enabled in your settings. If you have Markdown, PDF, and SRT enabled, all three will be created from a single clipboard command.

**Requirements for clipboard command without an open document:**
- A default directory must be set in settings
- The "Create new file" default setting should be enabled (or the file will try to insert into a non-existent document)

**Error handling**: If the clipboard doesn't contain a valid YouTube URL, you'll see an error message that stays visible for 10 seconds.

## Supported URL Formats

- Full URL: `https://www.youtube.com/watch?v=VIDEO_ID`
- Short URL: `https://youtu.be/VIDEO_ID`
- Embed URL: `https://www.youtube.com/embed/VIDEO_ID`
- Direct ID: `VIDEO_ID`

## Creating New Files

- Check the "Create new file (based on video title)" checkbox in the modal (default can be configured in settings)
- The file will be created in:
  - The default directory (if one is set in settings), or
  - The directory you select from the dropdown in the modal, or
  - The same directory as the current file (if no default directory is set and no directory is selected)
- **With a default directory set**: You can create new files even when no document is open (useful for the clipboard command)
- The filename will be based on the video title (sanitized for filesystem)

## Modal Options

When fetching a transcript, you can configure:

- **Transcript language**: Select your preferred transcript language from available options. The dropdown automatically populates when you enter a YouTube URL. Choose "Auto" to use your preferred language setting, or select a specific language to override it for this video.
- **Create new file**: Create a new file instead of inserting into current note (default can be set in settings)
- **File formats**: Check the boxes for which formats you want to generate (Markdown, PDF, SRT). You can select multiple formats to create all of them in one request. (Only shown when creating new file. At least one format must be selected.)
- **Include video URL**: Add the video URL as a markdown link
- **Tag with channel name**: Add channel name as a tag
- **Use LLM processing**: Enable/disable LLM processing for this transcript (only shown if providers are configured) — Note: LLM processing is automatically skipped for SRT files
- **LLM provider**: Select which LLM provider to use, including any configured custom providers (only shown if providers are configured)
- **Generate summary**: Generate a summary (requires LLM processing enabled and a provider configured)
- **Directory selection**: Choose from saved directories or enter a custom directory path (only shown when creating new file)

**Note**: The modal automatically prefills the URL field if you have a YouTube URL in your clipboard, and automatically fetches available languages for the video. All modal options can be overridden per-transcript, regardless of your default settings.

**Multiple Formats Workflow**: When you select multiple formats (e.g., Markdown + PDF + SRT), the plugin:
1. Fetches the transcript once from YouTube
2. Processes it once with LLM (if enabled, skipped for SRT)
3. Generates files for all selected formats
4. Shows notifications for each file created
