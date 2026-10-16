# YouTube transcript fetcher

A plugin for Obsidian that fetches and embeds YouTube video transcripts directly in your notes, with optional AI-powered cleanup and summarization.

📖 **[Read the full user manual](https://ljantzen.github.io/obsidian-youtube-transcript/)** for every feature, setting, and troubleshooting tip.

## Features

- Fetch transcripts from any YouTube video, with clickable timestamps that jump to the exact moment in the video
- Optional AI cleanup via OpenAI, Google Gemini, Anthropic Claude, or any OpenAI-compatible provider (OpenRouter, Ollama, local models), including automatic summaries
- Save as Markdown, PDF, and/or SRT — generate multiple formats from a single request
- Insert into the current note or create a new file named after the video
- Cover notes, saved directories, duplicate-note detection, channel tagging, and video metadata in frontmatter
- Fetch straight from your clipboard with a single hotkey

See the [full feature list and usage guide](https://ljantzen.github.io/obsidian-youtube-transcript/) for details on each of these.

## Installation

### From Obsidian

1. Open Settings → Community plugins
2. Disable Safe mode
3. Click Browse and search for "YouTube Transcript"
4. Click Install, then enable the plugin

### Manual Installation

1. Download the latest release from the [Releases page](https://github.com/ljantzen/obsidian-ytt/releases)
2. Extract `main.js`, `manifest.json`, `styles.css`, and `versions.json` to `<vault>/.obsidian/plugins/youtube-transcript-fetcher/`
3. Reload Obsidian and enable the plugin

## Quick Start

1. Open a note (or set a default directory in settings)
2. Run the "Fetch YouTube transcript" command from the ribbon icon or command palette
3. Paste a YouTube URL (or copy one first — it's auto-filled from your clipboard)
4. Choose a format and let the plugin do the rest

For everything else — LLM setup, PDF/SRT cover notes, long-video chunking, settings reference, and troubleshooting — see the [user manual](https://ljantzen.github.io/obsidian-youtube-transcript/).

## Privacy

This plugin does not collect or transmit any user data. It only talks to YouTube (to fetch transcripts) and to the LLM provider you configure, if any. API keys are stored locally in your Obsidian settings. See [Privacy and Permissions](https://ljantzen.github.io/obsidian-youtube-transcript/privacy-and-permissions.html) for details on what each requested permission is used for.

Obsidian's plugin API has no formal permission system — any plugin can call any API it imports. The vault APIs this plugin uses are:

- **`vault.getFiles()` / `getMarkdownFiles()`** — scans frontmatter across your vault to detect whether a transcript for a video already exists, so "Prevent duplicate notes" can warn you before creating one. Only used when that setting is enabled.
- **`vault.read()` / `cachedRead()`** — reads cover-note template files you've configured and reads existing notes during the duplicate check above. Nothing else is read.
- **`vault.create()` / `modify()`** — writes the transcript and cover-note files you ask for (Markdown, PDF, SRT). Nothing is written without you explicitly fetching a transcript.

These are essential to the plugin's core job of creating and organizing transcript notes in your vault; none of them are used for anything beyond what's described above.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, testing, and the PR checklist.

## License

MIT License - see [LICENSE](LICENSE) file for details

## Author

Leif Jantzen - [GitHub](https://github.com/ljantzen)
