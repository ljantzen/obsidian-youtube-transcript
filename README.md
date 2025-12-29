# YouTube Transcript Plugin for Obsidian

A plugin for Obsidian that allows you to fetch and embed YouTube video transcripts directly in your notes.

## Features

- 🎥 **Fetch transcripts from YouTube videos** - Automatically extract captions from any YouTube video
- 📝 **Insert or create new files** - Insert transcripts into current note or create a new file based on video title
- 🤖 **OpenAI processing (optional)** - Clean up transcripts by removing self-promotion and improving formatting
- 🔗 **Multiple URL formats** - Supports full URLs, short URLs, embed URLs, and direct video IDs
- ⚡ **Real-time feedback** - Status updates during fetching and processing
- 🔍 **Searchable content** - Transcripts are plain text, fully searchable in Obsidian

## Installation

### From Obsidian

1. Open Settings → Community plugins
2. Disable Safe mode
3. Click Browse and search for "YouTube Transcript"
4. Click Install
5. Enable the plugin

### Manual Installation

1. Download the latest release
2. Extract the files to `<vault>/.obsidian/plugins/obsidian-youtube-transcript/`
3. Reload Obsidian

## Usage

### Basic Usage

1. Open a markdown note (or any file to determine the directory for new files)
2. Use the ribbon icon (YouTube icon) or command palette to fetch a YouTube transcript
3. Enter the YouTube video URL or ID
4. Choose to insert into current note or create a new file
5. The transcript will be fetched and inserted/created

### Creating New Files

- Check the "Create new file (based on video title)" checkbox in the modal
- The file will be created in the same directory as the current file
- The filename will be based on the video title (sanitized for filesystem)

### OpenAI Processing (Optional)

1. Go to Settings → YouTube Transcript Settings
2. Enter your OpenAI API key
3. Optionally customize the processing prompt
4. Transcripts will be automatically cleaned and formatted when fetched

### Supported URL Formats

- Full URL: `https://www.youtube.com/watch?v=VIDEO_ID`
- Short URL: `https://youtu.be/VIDEO_ID`
- Embed URL: `https://www.youtube.com/embed/VIDEO_ID`
- Direct ID: `VIDEO_ID`

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
   - Find your Obsidian vault directory (usually `~/Documents/Obsidian/YourVault/` or similar)
   - Create a symlink or copy the plugin files:
   ```bash
   # Option 1: Create symlink (recommended for development)
   ln -s /home/leif/dev/p/privat/obsidian-ytt ~/path/to/your/vault/.obsidian/plugins/obsidian-youtube-transcript
   
   # Option 2: Copy files manually
   mkdir -p ~/path/to/your/vault/.obsidian/plugins/obsidian-youtube-transcript
   cp main.js manifest.json styles.css versions.json ~/path/to/your/vault/.obsidian/plugins/obsidian-youtube-transcript/
   ```

4. Enable the plugin in Obsidian:
   - Open Obsidian
   - Go to Settings → Community plugins
   - Disable Safe mode if needed
   - Find "YouTube Transcript" in the installed plugins list
   - Enable it

### Testing

1. **Test Basic Functionality**:
   - Open a markdown note in Obsidian
   - Click the YouTube icon in the left ribbon, OR
   - Use Command Palette (Ctrl/Cmd+P) and search for "Fetch YouTube Transcript"
   - Enter a YouTube URL (e.g., `https://www.youtube.com/watch?v=dQw4w9WgXcQ`)
   - Verify the transcript is fetched and inserted

2. **Test Creating New Files**:
   - Open any markdown file
   - Fetch a transcript with "Create new file" checkbox checked
   - Verify a new file is created with the video title as filename
   - Verify the file opens automatically

3. **Test OpenAI Processing**:
   - Go to Settings → YouTube Transcript Settings
   - Enter your OpenAI API key
   - Optionally customize the prompt
   - Fetch a transcript again
   - Verify the transcript is processed (self-promotion removed, better formatting)
   - Verify status messages appear during processing

4. **Test Different URL Formats**:
   - Full URL: `https://www.youtube.com/watch?v=VIDEO_ID`
   - Short URL: `https://youtu.be/VIDEO_ID`
   - Embed URL: `https://www.youtube.com/embed/VIDEO_ID`
   - Direct ID: `VIDEO_ID`

5. **Test Error Handling**:
   - Try an invalid URL
   - Try a video without captions
   - Try with invalid OpenAI key

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
- Error handling
- Integration tests for complete workflows

See [test/README.md](test/README.md) for more details.

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

## Privacy & Security

- **No data collection**: This plugin does not collect or transmit any user data
- **API keys**: OpenAI API keys are stored locally in your Obsidian settings and never transmitted except to OpenAI's API
- **External requests**: The plugin makes requests to:
  - YouTube (to fetch video information and transcripts)
  - OpenAI (only if you provide an API key, for optional transcript processing)

## Troubleshooting

### Transcript not fetching
- Ensure the video has captions available
- Check your internet connection
- Try a different video to verify the plugin is working

### OpenAI processing not working
- Verify your API key is correct in Settings
- Check that you have credits available in your OpenAI account
- Review the console (F12) for error messages

### File creation issues
- Ensure you have write permissions in the target directory
- Check that the video title doesn't contain invalid filename characters (these are automatically sanitized)

## License

MIT License - see [LICENSE](LICENSE) file for details
