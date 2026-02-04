# AI Agent Guidelines for obsidian-ytt

This document provides context and guidelines for AI coding assistants working on the obsidian-ytt (YouTube Transcript) Obsidian plugin.

## Project Overview

**What this plugin does:**
- Fetches YouTube video transcripts and embeds them in Obsidian notes
- Supports optional LLM processing (OpenAI, Gemini, Claude) for transcript cleanup and summarization
- Offers both Markdown and PDF output formats
- Provides flexible directory organization with cover notes for PDFs

**Technology stack:**
- TypeScript
- Obsidian Plugin API
- Vitest for testing
- ESBuild for bundling
- ESLint for linting

## Architecture

### Core Components

```
src/
├── main.ts              # Plugin entry point, orchestrates everything
├── youtube.ts           # YouTube API interaction, transcript fetching
├── llm/                 # LLM provider integrations
│   ├── openai.ts
│   ├── gemini.ts
│   ├── claude.ts
│   ├── modelFetcher.ts  # Fetches available models from APIs
│   └── parser.ts        # Parses LLM responses
├── modals.ts            # User-facing dialogs
├── settings.ts          # Default settings and constants
├── settingsTab.ts       # Settings UI
├── pdfGenerator.ts      # PDF generation from transcripts
├── types.ts             # TypeScript interfaces
└── utils.ts             # Shared utilities
```

### Key Data Flow

1. **User triggers command** → `main.ts:fetchTranscript()`
2. **URL modal opens** → `modals.ts:YouTubeUrlModal`
3. **Video ID extracted** → `utils.ts:extractVideoId()`
4. **Transcript fetched** → `youtube.ts:getYouTubeTranscript()`
5. **Optional LLM processing** → `llm/{provider}.ts:processWithProvider()`
6. **File created** → `main.ts:createTranscriptFile()`
   - PDF: `pdfGenerator.ts:generatePdfFromMarkdown()`
   - Markdown: Direct file creation

## Development Workflows

### Making Changes

1. **Always run tests after changes:**
   ```bash
   npm test
   ```

2. **Run linter to catch issues:**
   ```bash
   npm run lint          # Check
   npm run lint:fix      # Auto-fix
   ```

3. **Build to verify TypeScript:**
   ```bash
   npm run build
   ```

4. **For active development:**
   ```bash
   npm run dev  # Watch mode with auto-rebuild
   ```

### Testing Philosophy

- **Comprehensive coverage:** Over 400 tests covering most functionality
- **Test files mirror source structure:** `test/featureName.test.ts`
- **Uses Vitest with happy-dom** for DOM APIs
- **Obsidian APIs are mocked** where needed
- **Pure functions are tested thoroughly** (e.g., `utils.ts`)

### Common Test Patterns

```typescript
// Basic function test
it('should sanitize filename correctly', () => {
  expect(sanitizeFilename('Video: Title!')).toBe('Video Title');
});

// Testing with settings
it('should respect setting', () => {
  const settings = { ...DEFAULT_SETTINGS, someSetting: true };
  // Test logic
});

// Async operations
it('should fetch transcript', async () => {
  const result = await getYouTubeTranscript('videoId');
  expect(result).toBeDefined();
});
```

## Key Conventions

### Settings Management

- **All settings defined in:** `types.ts:YouTubeTranscriptPluginSettings`
- **Defaults in:** `settings.ts:DEFAULT_SETTINGS`
- **Backward compatibility pattern:**
  ```typescript
  // In main.ts onload()
  if (this.settings.newSetting === undefined) {
    this.settings.newSetting = DEFAULT_SETTINGS.newSetting;
    await this.saveSettings();
  }
  ```

### Error Handling

- **User-facing errors:** Use `Notice` class
  ```typescript
  new Notice('Error message shown to user');
  ```
- **LLM operations:** Use `RetryConfirmationModal` for failures
- **Validation errors:** Throw with descriptive messages

### File Organization

- **Keep functions focused:** Single responsibility
- **Extract utilities:** Pure functions go in `utils.ts`
- **Provider pattern:** Each LLM provider exports `processWithProvider()`
- **No circular dependencies:** Main imports from modules, not vice versa

## Common Tasks

### Adding a New LLM Provider

1. Create `src/llm/newprovider.ts` with `processWithProvider()` function
2. Add provider to `types.ts:LLMProvider` union type
3. Update `main.ts:hasProviderKey()` for API key validation
4. Add model fetcher to `llm/modelFetcher.ts`
5. Update `settingsTab.ts` with settings UI
6. Add tests in `test/llmProviderIntegration.test.ts`

### Adding a New Setting

1. Add to `types.ts:YouTubeTranscriptPluginSettings`
2. Add default to `settings.ts:DEFAULT_SETTINGS`
3. Add backward compatibility check in `main.ts:onload()`
4. Add UI in `settingsTab.ts`
5. Update affected logic
6. Add tests

### Modifying Directory Selection

**Critical file:** `src/main.ts:createTranscriptFile()`

Current logic (simplified):
```typescript
if (selectedDirectory !== null) {
  directory = selectedDirectory;
} else if (activeFile) {
  directory = activeFile.path.substring(0, activeFile.path.lastIndexOf("/"));
} else {
  throw new Error("Cannot determine directory...");
}
```

**Important:** PDF nesting happens AFTER basic directory selection. See lines 595-620.

### Working with PDFs

- **Generation:** `pdfGenerator.ts:generatePdfFromMarkdown()`
- **Cover notes:** Created when `createPdfCoverNote = true`
- **Nesting logic:** In `main.ts:createTranscriptFile()` around line 595
- **Documentation:** See `PDF-HANDLING.md` for complete specification

## Codebase Navigation Tips

### Finding Functionality

| Task | File | Function/Area |
|------|------|---------------|
| Transcript fetching | `youtube.ts` | `getYouTubeTranscript()` |
| LLM processing | `llm/{provider}.ts` | `processWithProvider()` |
| Directory selection | `main.ts` | `createTranscriptFile()` lines 580-594 |
| PDF generation | `pdfGenerator.ts` | `generatePdfFromMarkdown()` |
| URL parsing | `utils.ts` | `extractVideoId()` |
| Filename sanitization | `utils.ts` | `sanitizeFilename()` |
| Settings UI | `settingsTab.ts` | `display()` |
| Modal dialogs | `modals.ts` | Various modal classes |

### Understanding Settings

```typescript
// Core settings
fileFormat: "markdown" | "pdf"       // Output format
createNewFile: boolean               // New file vs insert into current
defaultDirectory: string | null      // Default location for files

// PDF-specific settings
createPdfCoverNote: boolean          // Create MD note alongside PDF
pdfCoverNoteLocation: string         // Where to put cover notes
pdfAttachmentFolderName: string      // Subfolder for nested PDFs

// LLM settings
useLLMProcessing: boolean            // Enable LLM cleanup
llmProvider: "openai" | "gemini" | "claude"
generateSummary: boolean             // Create summary section
```

### Important Quirks

1. **Template variables** are replaced in multiple places:
   - File names: `defaultNoteName`, `defaultCoverNoteName`
   - Paths: `pdfCoverNoteLocation`, `pdfAttachmentFolderName`
   - Variables: `{VideoName}`, `{ChannelName}`, `{PdfDirectory}`

2. **Directory creation timing:**
   - Must happen AFTER all path calculations
   - Including PDF nesting logic
   - See lines 623-640 in `main.ts`

3. **Sanitization is critical:**
   - All filenames go through `sanitizeFilename()`
   - Removes/replaces invalid filesystem characters
   - Tested extensively in `test/sanitizeFilename.test.ts`

4. **Language selection:**
   - `preferredLanguage` can be comma-separated (e.g., "no,en,de")
   - Falls back through list until match found
   - Empty string = auto-select

## Testing Best Practices

### When Adding Features

1. **Write tests alongside code** - not after
2. **Test edge cases:**
   - Empty strings
   - Missing/null values
   - No active file
   - Invalid input
3. **Test settings interactions:**
   - Multiple settings enabled
   - Conflicting settings
   - Missing required settings

### Test Organization

```typescript
describe('Feature Name', () => {
  describe('sub-feature or edge case', () => {
    it('should handle specific scenario', () => {
      // Test
    });
  });
});
```

### Running Specific Tests

```bash
npx vitest run extractVideoId     # Run single test file
npm run test:watch                # Watch mode
npm run test:coverage             # Generate coverage report
```

## Common Pitfalls to Avoid

1. **Don't break backward compatibility** without migration code
2. **Don't forget to update tests** when changing behavior
3. **Don't modify `utils.ts` without updating tests** - utilities are heavily tested
4. **Don't create directories too early** - wait until final path is determined
5. **Don't assume active file exists** - always check for null
6. **Don't hard-code paths** - use path manipulation functions
7. **Don't ignore linter warnings** - they often catch real issues

## Documentation

### When to Update Docs

- **README.md:** User-facing features, installation, basic usage
- **PDF-HANDLING.md:** PDF-related behavior, settings, examples
- **TESTING.md:** Testing infrastructure, commands, coverage
- **AGENTS.md:** (this file) - Agent-specific guidance
- **GEMINI.md:** Gemini-specific context and conventions

### Documentation Style

- Be concise but complete
- Use code examples where helpful
- Include settings JSON examples
- Explain "why" not just "what"
- Update examples when behavior changes

## Debugging Tips

### Common Issues

**"Cannot determine directory" error:**
- Check if `selectedDirectory` is passed correctly
- Verify `activeFile` exists when expected
- Look at directory selection logic in `main.ts`

**PDF not created:**
- Check `pdfGenerator.ts` for errors
- Verify markdown input is valid
- Check directory exists and is writable

**LLM processing fails:**
- Verify API key is set and valid
- Check timeout settings (`openaiTimeout`)
- Look at provider-specific error handling

**Tests failing after changes:**
- Run `npm test` to see specific failures
- Check if you updated default settings
- Verify backward compatibility isn't broken

## Working with This Codebase

### Before Making Changes

1. Read relevant test files to understand expected behavior
2. Check `PDF-HANDLING.md` if touching PDF logic
3. Look at existing similar features for patterns
4. Understand the full data flow (see Architecture section)

### After Making Changes

1. Run full test suite: `npm test`
2. Run linter: `npm run lint`
3. Build: `npm run build`
4. Update documentation if user-facing behavior changed
5. Consider adding tests for new edge cases

### Code Review Checklist

- [ ] Tests added/updated
- [ ] Linter passes
- [ ] Build succeeds
- [ ] Backward compatibility maintained
- [ ] Documentation updated if needed
- [ ] No hard-coded values
- [ ] Error handling in place
- [ ] Settings validated

## File Size Reference

- **main.ts:** ~900 lines - plugin core logic
- **youtube.ts:** ~300 lines - transcript fetching
- **settingsTab.ts:** ~600 lines - settings UI
- **pdfGenerator.ts:** ~200 lines - PDF generation
- **utils.ts:** ~250 lines - shared utilities

Large files are well-organized with clear function boundaries. Don't hesitate to extract logic into new files if it improves clarity.

## Getting Help

- **Tests are documentation:** Look at test files to understand expected behavior
- **Custom instructions:** See custom_instruction sections (project overview, conventions)
- **Obsidian API:** https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin
- **TypeScript:** Strict mode enabled, pay attention to type errors

## Version Information

This document is for agents working with the obsidian-ytt plugin codebase. Last updated during the "Remove core attachment folder support" refactoring (February 2026).

**Current test count:** 422 tests across 28 test files  
**Build system:** ESBuild with TypeScript  
**Node version:** Compatible with Obsidian's bundled version
