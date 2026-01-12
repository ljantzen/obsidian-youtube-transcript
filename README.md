# YouTube Transcript Plugin for Obsidian

A plugin for Obsidian that allows you to fetch and embed YouTube video transcripts directly in your notes with optional AI-powered processing and formatting.

## Features

- **Fetch transcripts from YouTube videos** - Automatically extract captions from any YouTube video
- **Clickable timestamps** - Timestamps are included as clickable links that jump to the exact moment in the video
- **Multiple LLM providers** - Optional processing with OpenAI, Google Gemini, or Anthropic Claude to clean up transcripts
- **Summary generation** - Automatically generate concise summaries of video content
- **Channel name tagging** - Automatically tag notes with the YouTube channel name
- **Insert or create new files** - Insert transcripts into current note or create a new file based on video title
- **Configurable timestamp frequency** - Control how often timestamps appear (every sentence or every N seconds)
- **Multiple URL formats** - Supports full URLs, short URLs, embed URLs, and direct video IDs
- **Default directory** - Configure a default directory for new transcript files
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

1. Open a markdown note (or any file to determine the directory for new files)
2. Use the ribbon icon (YouTube icon) or command palette to fetch a YouTube transcript
3. Enter the YouTube video URL or ID
4. Choose to insert into current note or create a new file
5. The transcript will be fetched and inserted/created

### Creating New Files

- Check the "Create new file (based on video title)" checkbox in the modal
- The file will be created in the configured default directory (if enabled) or the same directory as the current file
- The filename will be based on the video title (sanitized for filesystem)
- The new file will automatically open after creation

### Timestamps

Timestamps are included by default and appear as clickable links (e.g., `[5:30](url)`). Clicking a timestamp opens the video at that exact moment.

**Timestamp Settings:**
- **Include timestamps**: Toggle to enable/disable timestamps in transcripts (default: enabled)
- **Timestamp frequency**: 
  - `0` = every sentence (default)
  - `>0` = every N seconds (e.g., `30` = every 30 seconds)
- **Include timestamps in LLM output**: When enabled, timestamps are preserved in AI-processed transcripts

### LLM Processing (Optional)

The plugin supports three LLM providers for cleaning and processing transcripts:

1. **OpenAI** - GPT-4o, GPT-4 Turbo, GPT-3.5 Turbo, and more
2. **Google Gemini** - Gemini 2.0 Flash, Gemini 3 Pro, and more
3. **Anthropic Claude** - Claude Sonnet 4, Claude Opus 4, Claude Haiku 4

**Setup:**
1. Go to Settings → YouTube Transcript Settings
2. Select your preferred LLM provider
3. Enter your API key for the selected provider
4. Choose a model (models are automatically fetched from the provider's API)
5. Optionally customize the processing prompt

**Processing Options:**
- **Custom prompt**: Modify the default prompt to change how transcripts are processed
- **Generate summary**: When enabled, the LLM will generate a 2-3 sentence summary of the video
- **Include timestamps in LLM output**: Preserve timestamps when processing with LLM

**Default Processing:**
The default prompt removes self-promotion, calls to action, and promotional content while maintaining the original meaning and improving grammar and sentence structure.

### Summary Generation

When enabled, the plugin can generate concise summaries of video content:

1. Enable "Generate summary" in settings or the modal
2. Ensure an LLM provider is configured with a valid API key
3. The summary will appear at the top of the transcript with a "## Summary" header

### Channel Name Tagging

Automatically tag notes with the YouTube channel name:

1. Enable "Tag with channel name" in settings or the modal
2. Notes will be tagged with `#channel-name` at the top
3. Channel names are automatically sanitized to create valid Obsidian tags

### Default Directory

Configure a default directory for new transcript files:

1. Go to Settings → YouTube Transcript Settings
2. Enable "Use default directory"
3. Enter the directory path (e.g., `Transcripts` or `Notes/YouTube`)
4. New files will be created in this directory instead of the current file's directory

You can override this setting per-transcript using the modal options.

### Supported URL Formats

- Full URL: `https://www.youtube.com/watch?v=VIDEO_ID`
- Short URL: `https://youtu.be/VIDEO_ID`
- Embed URL: `https://www.youtube.com/embed/VIDEO_ID`
- Direct ID: `VIDEO_ID`

### Modal Options

When fetching a transcript, you can configure:

- **Create new file**: Create a new file instead of inserting into current note
- **Include video URL**: Add the video URL as a markdown link
- **Generate summary**: Generate a summary (requires LLM provider)
- **LLM provider**: Override the default LLM provider for this transcript
- **Tag with channel name**: Add channel name as a tag
- **Override directory**: Use a different directory for this file

## Settings

All settings are available in **Settings → YouTube Transcript Settings**:

### LLM Provider Settings
- **LLM provider**: Select provider (None, OpenAI, Gemini, or Claude)
- **API keys**: Enter your API keys for the selected provider
- **Model selection**: Choose from available models (automatically fetched)
- **Processing prompt**: Customize how transcripts are processed
- **LLM timeout**: Set timeout for API requests (default: 1 minute)

### File Creation Settings
- **Use default directory**: Enable to use a configured default directory
- **Default directory**: Path where new transcript files are created

### Content Options
- **Include video URL**: Include video URL in transcripts by default
- **Generate summary**: Generate summaries by default
- **Tag with channel name**: Tag notes with channel names by default
- **Include timestamps**: Include timestamps in transcripts
- **Timestamp frequency**: How often to show timestamps (0 = every sentence, >0 = every N seconds)
- **Include timestamps in LLM output**: Preserve timestamps when processing with LLM

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
- Timestamp formatting
- LLM provider integration
- Error handling
- Integration tests for complete workflows

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
