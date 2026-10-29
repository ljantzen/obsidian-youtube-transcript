# Settings Reference

All settings are available in **Settings → YouTube Transcript Settings**.

## LLM Provider Settings

- **LLM provider**: Select provider (OpenAI, Gemini, Claude, or any custom provider you've configured)
- **Custom LLM Providers**: Add and manage custom providers (OpenRouter, Ollama, etc.) — see [Custom Providers](custom-providers.md)
- **API keys**: Enter your API keys for the selected provider
- **Model selection**: Choose from available models (automatically fetched for built-in providers)
- **Processing prompt**: Customize how transcripts are processed
- **LLM timeout**: Set timeout for each API request (default: 1 minute). Long transcripts are sent in several requests, and each one has this timeout.
- **Force LLM output language**: When enabled, the LLM will be instructed to output in the same language as the selected transcript language. This ensures processed transcripts maintain the original language and prevents unwanted translations. The language is automatically detected from the transcript you're processing.

## File Creation Settings

- **Create new file**: Default behavior for the "Create new file" checkbox in the modal (default: disabled - inserts into current file)
- **Default note name**: Template for note file names. Supports `{VideoName}` and `{ChannelName}` variables. Default: `{VideoName}`
- **Default directory**: Select one of your saved directories as the default (only shown when you have saved directories). When set, new files will be created in this directory by default, and you can use the clipboard command even when no document is open
- **Saved directories**: List of frequently used directories for quick selection in the modal. Add directories here, then optionally select one as the default
- **Available file formats**: Select which file formats should be available in the transcript creation modal. Check the boxes for formats you want to use (Markdown, PDF, SRT). Only enabled formats appear in the modal. At least one format must always be enabled.
- **Allow clipboard access**: When enabled, the plugin reads the clipboard to prefill the URL field when the modal opens, and powers the "Fetch from clipboard" command. Disable if you prefer the plugin never touches the clipboard (default: enabled)
- **Remove tracking parameters**: When enabled, tracking parameters such as `si`, `feature` and `utm_*` are removed from YouTube URLs pasted into the URL field, prefilled from the clipboard or editor selection, or read by the "Fetch from clipboard" command. The video, playlist (`list`, `index`) and timestamp (`t`, `start`) are kept (default: enabled)
- **Prevent duplicate notes**: When enabled, checks whether a transcript for the same video already exists in your vault before fetching. Only applies when "Create new file" is enabled
- **Duplicate check property**: The YAML frontmatter property name to check for duplicate detection (default: `url`). The plugin compares the video ID extracted from this property's value against the current video
- **Use reading speed for SRT timing**: When enabled, each SRT cue's duration is computed from its word count at the reading speed below, instead of the actual transcript segment timing (default: disabled)
- **SRT reading speed (WPM)**: Words per minute used to compute SRT cue duration when reading-speed timing is enabled (default: 180). Only shown when "Use reading speed for SRT timing" is enabled.
- **Prevent screen lock while processing**: On Android/iOS, keeps the screen awake while fetching and processing a transcript, so the OS locking the screen doesn't interrupt a long fetch or LLM run (default: enabled). Only shown on mobile — has no effect on desktop.

## Frontmatter Settings

- **Frontmatter fields**: For each field (title, URL, video ID, channel, channel ID, duration, views, published date, description, is live, is private, is unlisted), choose whether it is written to the note's frontmatter and which property key it uses. For example, write the channel as `author` instead of `channel`. Disabled fields are left out entirely. By default all fields are enabled with their standard key names.
- **Note**: The duplicate check reads the property named in **Duplicate check property** (default: `url`). If you rename or disable the URL field, update that setting to match, or duplicates won't be detected.

## Cover Note Settings

- **Create cover note**: When enabled, a markdown cover note will be automatically created for PDF and/or SRT files. Files will be automatically nested in subfolders for better organization.
- **Cover note location**: Location/path where cover notes should be created. Leave empty to use the same location as the PDF/SRT files. Uses the FolderSuggest and supports `{ChannelName}` and `{VideoName}` template variables
- **Attachment folder**: Subfolder name for PDF and SRT files when cover notes are enabled. Both PDF and SRT files will be nested under this folder. Leave empty to use the video title as the folder name.
- **Cover note template**: Path to a markdown template file for custom cover note formatting. Supports all template variables listed in [Cover Notes](cover-notes.md). Leave empty to use the default template.

## Content Options

- **Preferred languages**: Comma-separated list of preferred transcript language codes in order of preference (e.g., "en,es,fr" for English, then Spanish, then French). Languages will be tried in order until one is available. Leave empty for auto-select (prefers English). You can override this in the modal when multiple languages are available.
- **Include video URL**: Include video URL in transcripts by default
- **Generate summary**: Generate summaries by default
- **Tag with channel name**: Tag notes with channel names by default
- **Include timestamps**: Include timestamps in transcripts
- **Timestamp frequency**: How often to show timestamps (0 = every sentence, >0 = every N seconds)
- **Include timestamps in LLM output**: Preserve timestamps when processing with LLM
- **Single line transcript**: When enabled, the transcript will be kept on a single line without line breaks. Timestamps (if enabled) will be inline. Useful for compact formatting or when copying to other applications.
- **Local video directory**: Filesystem directory where local video files are stored. If set, timestamp links will point to local files (`file:///path/video-id.mp4?t=SECONDS`) instead of YouTube URLs. Leave empty to use YouTube URLs.
