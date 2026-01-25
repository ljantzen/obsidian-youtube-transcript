# YouTube Transcript Plugin for Obsidian

A plugin for Obsidian that allows you to fetch and embed YouTube video transcripts directly in your notes with optional AI-powered processing and formatting.

## Features

- **Fetch transcripts from YouTube videos** - Automatically extract captions from any YouTube video
- **Clickable timestamps** - Timestamps are included as clickable links that jump to the exact moment in the video
- **Multiple LLM providers** - Optional processing with OpenAI, Google Gemini, or Anthropic Claude to clean up transcripts
- **Summary generation** - Automatically generate concise summaries of video content
- **Channel name tagging** - Automatically tag notes with the YouTube channel name
- **Insert or create new files** - Insert transcripts into current note or create a new file based on video title
- **Multiple file formats** - Save transcripts as Markdown (.md) or PDF files
- **PDF attachment folder integration** - Store PDFs in Obsidian's attachment folder setting (respects "below the current folder" option)
- **PDF cover notes** - Automatically create markdown cover notes for PDF transcripts with customizable templates
- **PDF nesting under cover notes** - Option to nest PDF files in subfolders underneath cover notes with configurable folder names
- **Video metadata** - Automatically extract and include video metadata (upload date, view count, duration, etc.) in transcripts and cover notes
- **Default directory** - Set a default directory for new files, enabling clipboard command without an open document
- **Configurable timestamp frequency** - Control how often timestamps appear (every sentence or every N seconds)
- **Single line transcript** - Option to keep transcript on a single line without line breaks (useful for compact formatting)
- **Language selection** - Choose your preferred transcript language with automatic fallback to English or first available language
- **Force LLM output language** - Option to ensure LLM-processed transcripts maintain the same language as the original transcript
- **Local video support** - Link timestamps to local video files instead of YouTube URLs
- **Multiple URL formats** - Supports full URLs, short URLs, embed URLs, and direct video IDs
- **Saved directories** - Quick access to frequently used directories for transcript files
- **Real-time feedback** - Status updates during fetching and processing
- **Searchable content** - Transcripts are plain text, fully searchable in Obsidian

## Installation

### From Obsidian

1. Open Settings → Community plugins
2. Disable Safe mode
3. Click Browse and search for "YouTube Transcript"
4. Click Install
5. Enable the plugin

### Manual Installation

1. Download the latest release from the [Releases page](https://github.com/ljantzen/obsidian-ytt/releases)
2. Extract the files to `<vault>/.obsidian/plugins/youtube-transcript-fetcher/`
3. Reload Obsidian

Required files:
- `main.js`
- `manifest.json`
- `styles.css`
- `versions.json`

## Usage

### Basic Usage

1. Open a markdown note (or any file to determine the directory for new files, unless you have a default directory set)
2. Use the ribbon icon (YouTube icon) or command palette to fetch a YouTube transcript
3. Enter the YouTube video URL or ID (or copy a YouTube URL to your clipboard - it will be automatically prefilled)
4. Choose to insert into current note or create a new file
5. The transcript will be fetched and inserted/created

**Tip**: If you have a YouTube URL in your clipboard, it will be automatically prefilled in the URL field when you open the modal. The modal will also automatically fetch and display available transcript languages for the video. If you have a default directory configured, you can create new files even when no document is open.

### Clipboard Command (Keyboard Shortcut)

The plugin includes a command that automatically fetches transcripts from your clipboard using default settings:

1. Copy a YouTube URL to your clipboard
2. Use the command "Fetch YouTube transcript from clipboard" (can be assigned a keyboard shortcut in Settings → Hotkeys)
3. The transcript will be fetched and processed using your default settings
4. If you have a default directory set, the file will be created there (even if no document is open)
5. If no default directory is set and no document is open, you'll get an error message

**Requirements for clipboard command without an open document:**
- A default directory must be set in settings
- The "Create new file" default setting should be enabled (or the file will try to insert into a non-existent document)

**Error handling**: If the clipboard doesn't contain a valid YouTube URL, you'll see an error message that stays visible for 10 seconds.

### Creating New Files

- Check the "Create new file (based on video title)" checkbox in the modal (default can be configured in settings)
- The file will be created in:
  - **For PDFs with attachment folder enabled**: The folder specified by Obsidian's "Attachment folder" setting (respects "below the current folder" option), or
  - The default directory (if one is set in settings), or
  - The directory you select from the dropdown in the modal, or
  - The same directory as the current file (if no default directory is set and no directory is selected)
- **With a default directory set**: You can create new files even when no document is open (useful for the clipboard command)
- The filename will be based on the video title (sanitized for filesystem)
- Choose between Markdown (.md) or PDF format
- Markdown files will automatically open after creation
- PDF files will be created and a notification will be shown (PDFs open in your system's default PDF viewer)

**PDF Attachment Folder**: When enabled, PDF files can be stored in Obsidian's attachment folder (Settings → Files & Links → Default location for new attachments). This respects the "below the current folder" option, which stores PDFs in the same directory as the current file. This setting only affects PDF files; Markdown files use normal directory selection.

### PDF Cover Notes

When creating PDF transcripts, you can automatically generate markdown cover notes that link to the PDF:

1. Enable "Create PDF cover note" in Settings → YouTube Transcript Settings → PDF
2. Configure the cover note location (supports template variables: `{ChannelName}`, `{VideoName}`)
3. Optionally specify a custom template file for cover notes
4. When a PDF is created, a markdown cover note will be automatically generated and opened

**Nesting PDFs Under Cover Notes:**

You can organize PDFs by nesting them in subfolders underneath the cover note location:

1. Enable "Nest PDF under cover note" in Settings → YouTube Transcript Settings → PDF
2. Optionally configure the "PDF attachment folder name" (supports template variables: `{ChannelName}`, `{VideoName}`)
3. If the folder name is left empty, the PDF filename (without extension) will be used as the folder name
4. When enabled, PDFs will be created in: `{coverNoteLocation}/{attachmentFolderName}/{pdfFilename}.pdf`
5. Cover notes will be created in: `{coverNoteLocation}/{pdfFilename}.md` and will link to the nested PDF

**Example:**
- Cover note location: `Notes/PDF Covers/{ChannelName}`
- Attachment folder name: `attachments` (or leave empty to use video title)
- Result:
  - Cover note: `Notes/PDF Covers/My Channel/My Video.md`
  - PDF: `Notes/PDF Covers/My Channel/attachments/My Video.pdf` (or `Notes/PDF Covers/My Channel/My Video/My Video.pdf` if folder name is empty)

**Cover Note Template Variables:**
- `{ChannelName}` - Sanitized channel name
- `{VideoName}` - Sanitized video title
- `{VideoUrl}` - YouTube video URL
- `{Summary}` - Video summary (if available)
- `{PdfLink}` - Path to the PDF file (for Obsidian links)
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

**Cover Note Location:**
- Uses FolderSuggest for easy path selection
- Supports template variables `{ChannelName}` and `{VideoName}` for dynamic folder organization
- If empty, cover notes are created in the same directory as the PDF
- Folders are automatically created if they don't exist

**Custom Templates:**
- Create a markdown template file with any of the template variables above
- Set the template path in Settings → YouTube Transcript Settings → PDF → PDF cover note template
- The template will be processed with all available variables
- If the template file is not found, the default template will be used

### Timestamps

Timestamps are included by default and appear as clickable links. In multi-line mode, they appear at the beginning of each line (e.g., `[5:30](url) Text content...`). In single-line mode, timestamps are inline with the text (e.g., `[0:05](url) Hello [0:10](url) world`). Clicking a timestamp opens the video at that exact moment.

**Timestamp Settings:**
- **Include timestamps**: Toggle to enable/disable timestamps in transcripts (default: enabled)
- **Timestamp frequency**: 
  - `0` = every sentence (default)
  - `>0` = every N seconds (e.g., `30` = every 30 seconds)
- **Include timestamps in LLM output**: When enabled, timestamps are preserved in AI-processed transcripts
- **Single line transcript**: When enabled, timestamps are displayed inline within a single continuous line of text
- **Local video directory**: If you have downloaded videos locally, set this to the directory path. Timestamps will then point to local files (`file:///path/video-id.mp4?t=SECONDS`) instead of YouTube URLs. Videos should be named `{video-id}.mp4` in the specified directory.

**Note**: PDF format does not support clickable links, so timestamps in PDF files will appear as plain text.

### LLM Processing (Optional)

The plugin supports three LLM providers for cleaning and processing transcripts:

1. **OpenAI** - GPT-4o Mini, GPT-4o, GPT-4 Turbo, GPT-3.5 Turbo, and more
2. **Google Gemini** - Gemini 3 Pro, Gemini 3 Flash, Gemini 2.0 Flash, and more
3. **Anthropic Claude** - Claude Sonnet 4, Claude Opus 4, Claude Haiku 4

**Setup:**
1. Go to Settings → YouTube Transcript Settings
2. Select your preferred LLM provider
3. Enter your API key for the selected provider
4. Choose a model (models are automatically fetched from the provider's API)
5. Optionally customize the processing prompt

**Processing Options:**
- **Use LLM processing**: Toggle in the modal to enable/disable LLM processing for individual transcripts (even if a provider is configured)
- **Custom prompt**: Modify the default prompt to change how transcripts are processed
- **Generate summary**: When enabled, the LLM will generate a 2-3 sentence summary of the video
- **Include timestamps in LLM output**: Preserve timestamps when processing with LLM
- **Force LLM output language**: When enabled, the LLM will be instructed to output in the same language as the selected transcript language, preventing unwanted translations

**Note**: If no LLM providers are configured (no API keys), LLM-related options will be hidden from the modal to keep the interface clean.

**Default Processing:**
The default prompt removes self-promotion, calls to action, and promotional content while maintaining the original meaning and improving grammar and sentence structure.

### Summary Generation

When enabled, the plugin can generate concise summaries of video content:

1. Enable "Generate summary" in settings or the modal
2. Ensure an LLM provider is configured with a valid API key
3. The summary will appear at the top of the transcript with a "## Summary" header

### Language Selection

Choose your preferred transcript language for YouTube videos:

1. **In the modal**: When you enter a YouTube URL, the plugin automatically fetches available transcript languages
2. Select your preferred language from the dropdown (or choose "Auto" to use your preferred language setting)
3. The plugin will try to use your selected language, falling back to English or the first available language if your preference isn't available
4. **In settings**: Set a default preferred language (or comma-separated list like "en,es,fr") that will be used automatically
5. The modal selection overrides your settings preference, allowing per-video language selection

**Language Selection Priority:**
- Modal selection (if specified)
- Settings preferred language (if set)
- English (if available)
- First available language

**Supported Languages**: The plugin supports 30+ languages including English, Spanish, French, German, Italian, Portuguese, Russian, Japanese, Korean, Chinese, Arabic, Hindi, and many more. Available languages are automatically detected from each video's caption tracks.

### Channel Name Tagging

Automatically tag notes with the YouTube channel name:

1. Enable "Tag with channel name" in settings or the modal
2. Notes will be tagged with `#channel-name` at the top
3. Channel names are automatically sanitized to create valid Obsidian tags

### Video Metadata

The plugin automatically extracts and includes video metadata:

**In Markdown Files:**
- Metadata is included as YAML frontmatter at the top of the file
- Includes: title, url, videoId, channel, channelId, duration, views, published date, description, and more
- Fully searchable and queryable in Obsidian

**In PDF Cover Notes:**
- All metadata is available as template variables (see PDF Cover Notes section above)
- Use template variables to customize how metadata is displayed in cover notes

### Default Directory and Saved Directories

Configure directories for new transcript files:

1. Go to Settings → YouTube Transcript Settings
2. Add directories to "Saved directories" (e.g., `Transcripts` or `Notes/YouTube`)
3. If you have multiple saved directories, you can designate one as the "Default directory"
4. When creating new files:
   - If a default directory is set, files will be created there (even if no document is open)
   - If no default directory is set, files will be created in the current file's directory
5. The default directory is automatically pre-selected in the modal dropdown
6. You can override the directory per-transcript using the modal options

**Note**: Setting a default directory allows you to use the clipboard command even when no document is open, as the plugin knows where to create the file.

### Supported URL Formats

- Full URL: `https://www.youtube.com/watch?v=VIDEO_ID`
- Short URL: `https://youtu.be/VIDEO_ID`
- Embed URL: `https://www.youtube.com/embed/VIDEO_ID`
- Direct ID: `VIDEO_ID`

### Modal Options

When fetching a transcript, you can configure:

- **Transcript language**: Select your preferred transcript language from available options. The dropdown automatically populates when you enter a YouTube URL. Choose "Auto" to use your preferred language setting, or select a specific language to override it for this video.
- **Create new file**: Create a new file instead of inserting into current note (default can be set in settings)
- **File format**: Choose between Markdown (.md) or PDF format (only shown when creating new file)
- **Include video URL**: Add the video URL as a markdown link
- **Tag with channel name**: Add channel name as a tag
- **Use LLM processing**: Enable/disable LLM processing for this transcript (only shown if providers are configured)
- **LLM provider**: Select which LLM provider to use (only shown if providers are configured)
- **Generate summary**: Generate a summary (requires LLM processing enabled and a provider configured)
- **Directory selection**: Choose from saved directories or enter a custom directory path (only shown when creating new file)

**Note**: The modal automatically prefills the URL field if you have a YouTube URL in your clipboard, and automatically fetches available languages for the video. All modal options can be overridden per-transcript, regardless of your default settings.

## Settings

All settings are available in **Settings → YouTube Transcript Settings**:

### LLM Provider Settings
- **LLM provider**: Select provider (None, OpenAI, Gemini, or Claude)
- **API keys**: Enter your API keys for the selected provider
- **Model selection**: Choose from available models (automatically fetched)
- **Processing prompt**: Customize how transcripts are processed
- **LLM timeout**: Set timeout for API requests (default: 1 minute)
- **Force LLM output language**: When enabled, the LLM will be instructed to output in the same language as the selected transcript language. This ensures processed transcripts maintain the original language and prevents unwanted translations. The language is automatically detected from the transcript you're processing.

### File Creation Settings
- **Create new file**: Default behavior for the "Create new file" checkbox in the modal (default: disabled - inserts into current file)
- **Default directory**: Select one of your saved directories as the default (only shown when you have saved directories). When set, new files will be created in this directory by default, and you can use the clipboard command even when no document is open
- **Saved directories**: List of frequently used directories for quick selection in the modal. Add directories here, then optionally select one as the default
- **File format**: Default file format for new transcript files (Markdown or PDF)

### PDF Settings
- **Use attachment folder for PDFs**: When enabled, PDF files will be stored in the folder specified by Obsidian's "Attachment folder" setting (Settings → Files & Links → Default location for new attachments). This respects the "below the current folder" option. Markdown files are not affected and use normal directory selection.
- **Create PDF cover note**: When enabled, a markdown cover note will be automatically created for each PDF transcript
- **PDF cover note location**: Location/path where PDF cover notes should be created. Leave empty to use the same location as the PDF file. Uses the FolderSuggest and supports `{ChannelName}` and `{VideoName}` template variables
- **PDF cover note template**: Path to a markdown template file for custom cover note formatting. Supports all template variables listed in the PDF Cover Notes section. Leave empty to use the default template.
- **Nest PDF under cover note**: When enabled, PDF files will be placed in a subfolder underneath the cover note location. The folder name can be customized with the "PDF attachment folder name" setting
- **PDF attachment folder name**: Name of the folder to nest PDFs under when "Nest PDF under cover note" is enabled. Leave empty to use the PDF filename (without extension) as the folder name. Supports template variables `{ChannelName}` and `{VideoName}`

### Content Options
- **Preferred languages**: Comma-separated list of preferred transcript language codes in order of preference (e.g., "en,es,fr" for English, then Spanish, then French). Languages will be tried in order until one is available. Leave empty for auto-select (prefers English). You can override this in the modal when multiple languages are available.
- **Include video URL**: Include video URL in transcripts by default
- **Generate summary**: Generate summaries by default
- **Tag with channel name**: Tag notes with channel names by default
- **Include timestamps**: Include timestamps in transcripts
- **Timestamp frequency**: How often to show timestamps (0 = every sentence, >0 = every N seconds)
- **Include timestamps in LLM output**: Preserve timestamps when processing with LLM
- **Single line transcript**: When enabled, the transcript will be kept on a single line without line breaks. Timestamps (if enabled) will be inline. Useful for compact formatting or when copying to other applications.
- **Local video directory**: Filesystem directory where local video files are stored. If set, timestamp links will point to local files (`file:///path/video-id.mp4?t=SECONDS`) instead of YouTube URLs. Leave empty to use YouTube URLs.

## Development

### Setup

1. Install dependencies:
```bash
npm install
```

2. Start development mode (watches for changes and rebuilds automatically):
```bash
npm run dev
```

3. Link the plugin to your Obsidian vault:
   - Find your Obsidian vault directory
   - Create a symlink or copy the plugin files:
   ```bash
   # Option 1: Create symlink (recommended for development)
   ln -s /path/to/obsidian-ytt ~/path/to/your/vault/.obsidian/plugins/youtube-transcript-fetcher
   
   # Option 2: Copy files manually (after building)
   npm run build
   mkdir -p ~/path/to/your/vault/.obsidian/plugins/youtube-transcript-fetcher
   cp main.js manifest.json styles.css versions.json ~/path/to/your/vault/.obsidian/plugins/youtube-transcript-fetcher/
   ```

4. Enable the plugin in Obsidian:
   - Open Obsidian
   - Go to Settings → Community plugins
   - Disable Safe mode if needed
   - Find "YouTube transcript fetcher" in the installed plugins list
   - Enable it

### Building for Production

```bash
npm run build
```

This will:
- Type-check the TypeScript code
- Bundle and minify the code
- Generate `main.js` and `main.js.map`

After building, copy the following files to your plugin directory:
- `main.js`
- `manifest.json`
- `styles.css`
- `versions.json`

### Testing

The plugin includes a comprehensive test suite using Vitest:

```bash
# Run all tests
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

Test coverage includes:
- Video ID extraction from various URL formats
- Filename sanitization
- XML transcript parsing
- HTML entity decoding
- Timestamp formatting (YouTube URLs and local file URLs)
- Path normalization for cross-platform compatibility
- LLM provider integration
- Settings validation
- Error handling
- Integration tests for complete workflows
- Default directory functionality
- Attachment folder for PDFs
- Create new file setting
- Clipboard command with default settings
- Single line transcript formatting
- PDF cover note functionality
- PDF nesting under cover notes with configurable folder names
- VideoDetails extraction and template variables
- Frontmatter generation
- Language selection and fallback logic
- Force LLM output language functionality

See [test/README.md](test/README.md) for more details.

### Linting

```bash
# Check for linting errors
npm run lint

# Fix linting errors automatically
npm run lint:fix
```

## Privacy & Security

- **No data collection**: This plugin does not collect or transmit any user data
- **API keys**: API keys are stored locally in your Obsidian settings and never transmitted except to the respective provider's API
- **External requests**: The plugin makes requests to:
  - YouTube (to fetch video information and transcripts)
  - OpenAI/Gemini/Claude APIs (only if you provide API keys, for optional transcript processing)

## Troubleshooting

### Transcript not fetching
- Ensure the video has captions available
- Check your internet connection
- Try a different video to verify the plugin is working
- Check the console (F12) for error messages

### LLM processing not working
- Verify your API key is correct in Settings
- Check that you have credits available in your provider account
- Verify the selected model is available
- Review the console (F12) for error messages
- Check the timeout setting if requests are timing out

### Timestamps not appearing
- Ensure "Include timestamps" is enabled in settings
- Verify the video has captions with timing information
- Check that timestamps aren't being removed by LLM processing (if "Include timestamps in LLM output" is disabled)

### File creation issues
- Ensure you have write permissions in the target directory
- Check that the video title doesn't contain invalid filename characters (these are automatically sanitized)
- Verify the default directory path is correct if using that option
- **PDF generation**: PDF format requires Electron API access (desktop app only). If PDF generation fails, try using Markdown format instead. PDF generation may also fail if the transcript is too large or if there are formatting issues.
- **PDF attachment folder**: If using the attachment folder setting for PDFs, ensure Obsidian's attachment folder is properly configured. If set to "below the current folder", you must have an active file open when creating PDFs.

### Model selection issues
- Click the refresh button next to the model dropdown to fetch latest models
- Ensure your API key has access to the selected model
- Some models may require specific API access levels

## Automation

### Dependabot

This repository uses [Dependabot](https://docs.github.com/en/code-security/dependabot) to automatically keep dependencies up to date:

- **Schedule**: Weekly checks every Monday at 9:00 AM
- **Updates**: Automatically creates PRs for dependency updates
- **Grouping**: Dev dependencies are grouped together to reduce PR noise
- **Safety**: Major version updates for critical dependencies (TypeScript, esbuild, obsidian) are ignored to prevent breaking changes

Dependabot will create pull requests that you can review and merge when ready.

## License

MIT License - see [LICENSE](LICENSE) file for details

## Author

Leif Jantzen - [GitHub](https://github.com/ljantzen)
