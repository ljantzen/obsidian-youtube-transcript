# Privacy and Permissions

- **No data collection**: This plugin does not collect or transmit any user data
- **API keys**: API keys are stored locally in your Obsidian settings and never transmitted except to the respective provider's API
- **External requests**: The plugin makes requests to:
  - YouTube (to fetch video information and transcripts)
  - OpenAI/Gemini/Claude APIs (only if you provide API keys, for optional transcript processing)
  - Custom provider endpoints (only if you configure custom providers)

## Permissions

| Permission | Why it's needed |
|---|---|
| **Vault Enumeration** (`vault.getFiles`, `getMarkdownFiles`) | Used by the duplicate-note check to scan frontmatter across all markdown files and find an existing transcript for the same video before fetching a new one. Only active when "Prevent duplicate notes" is enabled. |
| **Clipboard Access** | Reads the clipboard to prefill the YouTube URL field when you open the modal, and powers the "Fetch from clipboard" command. The clipboard is only read on demand — never in the background. Can be disabled via **Allow clipboard access** in settings. |
| **Vault Read** (`vault.read`, `vault.cachedRead`) | Reads cover-note template files you have configured, and reads existing notes when checking for duplicates. No files are read outside of these two flows. |
| **Vault Write** (`vault.modify`, `vault.create`) | Creates and writes transcript files (Markdown, PDF, SRT) and cover notes to your vault. Nothing is written without an explicit user action. |
