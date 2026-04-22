# Copilot Instructions for obsidian-ytt

## Project Overview

This is an Obsidian plugin that fetches YouTube video transcripts and embeds them in notes. It supports optional LLM processing (OpenAI, Gemini, Claude) for transcript cleanup and summarization.

## Commands

```bash
# Development
npm run dev          # Watch mode with auto-rebuild
npm run build        # Production build (type-check + bundle)

# Testing
npm test                      # Run all tests
npm run test:watch            # Watch mode
npm run test:coverage         # Generate coverage report
npx vitest run <filename>     # Run single test file (e.g., npx vitest run extractVideoId)

# Linting
npm run lint         # Check for errors
npm run lint:fix     # Auto-fix errors
```

## Architecture

### Source Structure (`src/`)

- **`main.ts`** - Plugin entry point. Registers commands, ribbon icon, and settings tab. Contains the main `fetchTranscript()` workflow that orchestrates other modules.
- **`youtube.ts`** - Fetches transcripts from YouTube. Parses captions XML, extracts video metadata, handles language selection.
- **`llm/`** - LLM provider implementations:
  - `openai.ts`, `gemini.ts`, `claude.ts` - Provider-specific API calls
  - `modelFetcher.ts` - Fetches available models from provider APIs
  - `parser.ts` - Parses LLM responses (extracts transcript and summary)
- **`modals.ts`** - User-facing dialogs (URL input, retry confirmation)
- **`settings.ts`** - Default settings and constants
- **`settingsTab.ts`** / `settingsTabHelpers.ts` - Settings UI in Obsidian
- **`pdfGenerator.ts`** - Converts transcripts to PDF format
- **`types.ts`** - TypeScript interfaces (`YouTubeTranscriptPluginSettings`, `VideoDetails`, etc.)
- **`utils.ts`** - Shared utilities (URL parsing, filename sanitization, timestamp formatting)

### Test Structure (`test/`)

Tests use **Vitest** with **happy-dom** for DOM APIs. Each test file covers a specific feature or function. Obsidian APIs are mocked where needed.

## Key Conventions

### Settings Pattern

All plugin settings are defined in `types.ts` as `YouTubeTranscriptPluginSettings`. Defaults live in `settings.ts` as `DEFAULT_SETTINGS`. The plugin uses `Object.assign({}, DEFAULT_SETTINGS, loadedData)` for backward compatibility when adding new settings.

### LLM Provider Pattern

Each provider in `src/llm/` exports a `processWithProvider(transcript, options)` function. The main plugin selects the provider based on `settings.llmProvider` and delegates processing. All providers return `{ transcript: string, summary: string | null }`.

### Error Handling

User-facing errors use Obsidian's `Notice` class. LLM operations use a retry modal (`RetryConfirmationModal`) that lets users retry or cancel on failure.

### Utility Functions

Core utilities in `utils.ts` are pure functions and thoroughly tested:
- `extractVideoId(url)` - Parses YouTube URLs/IDs
- `sanitizeFilename(title)` - Makes video titles filesystem-safe
- `formatTimestamp(seconds, videoId, localDir?)` - Creates clickable timestamp links
