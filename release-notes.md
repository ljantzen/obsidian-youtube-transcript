# Release Notes

## Unreleased

### Bug Fixes
- **LLM-processed transcripts of long videos were cut short**: Long transcripts were sent to the LLM in a single request, so the result was cut off at the model's output limit (Claude was limited to 4096 tokens) or shortened by the model without any warning. In a test with a video of about 15,000 spoken words, only about 20% of the content came back.
  - Transcripts longer than about 12,000 characters are now processed in parts and joined, so the whole video is included.
  - Responses that stop at the model's output limit are detected (OpenAI, Gemini, Claude, and custom providers that report `finish_reason`) and the affected part is split and sent again.
  - Each part is sent with the headings used so far and the end of the previous part, so headings continue across parts. Repeated titles and re-opened sections are cleaned up when the parts are joined.
  - For long videos, the summary is generated in a separate request.
  - After a timeout or rate-limit retry, parts that already finished are not sent again.
  - Gemini responses split into several parts are now joined instead of keeping only the first.
  - Claude's output limit per request is raised to 16,000 tokens for current models (8,192 for Claude 3.5, 4,096 for Claude 3).

- **LLM-processed transcripts read like summaries**: The default prompt asked for "complete sentences" and "proper grammar and sentence structure", which models took as permission to rewrite. The new default keeps the speaker's own words and only adds punctuation and paragraphs, fixes transcription errors, and removes fillers and promotional content. On a test video, the share of the original wording kept rose from 81% to 87%. If your prompt is the unmodified old default, it is upgraded automatically. A customized prompt is left unchanged; clear the prompt field to switch to the new default.
- Single-request prompts now also tell the model to keep the entire transcript, as the prompts for parts of long transcripts already did.

- **Custom providers ignored the default prompt when the prompt field was empty**: Built-in providers fell back to the default prompt, but custom providers sent an empty prompt until the plugin was reloaded. They now use the default too.

### Notes
- Long videos now take several LLM requests (about one per 15 minutes of video, plus one for the summary). The LLM timeout setting applies to each request.

### Prompt Migration Guide
The default processing prompt has changed. What happens depends on your saved prompt:
1. **Unmodified earlier default**: It is replaced with the new default automatically when the plugin loads (leading and trailing whitespace are ignored). No action needed.
2. **Empty prompt**: The new default is used.
3. **Customized prompt** (any change, even one added line): It is left unchanged. To switch, copy the instructions you want to keep, clear the prompt field, and paste the new default (shown as the field's placeholder) with your instructions added. Or edit your prompt: remove "Create an accurate and complete transcription with complete sentences" and "Ensure proper grammar and sentence structure", and add an instruction to keep the speaker's own words without paraphrasing or condensing.

If your prompt starts with "Please process the following YouTube video transcript", it is the earlier default or based on it. The new default starts with "Please clean up the following YouTube video transcript". See [Prompt Migration](README.md#prompt-migration) in the README for details.

---

## 2.0.26 (2026-09-15)

### New Features
- **Reading-speed-based SRT cue timing (#136)**: New optional setting that computes each SRT cue's duration from its word count at a configurable reading speed (words per minute, default 180), instead of the transcript segment's actual timing. Off by default.

---

## 2.0.25 (2026-08-26)

### Bug Fixes
- **Overlapping SRT cues (#134)**: YouTube caption durations often extend past the start of the next segment, which made cues stack on screen in standard SRT players. Each cue now ends no later than the next one starts.

---

## 2.0.24 (2026-08-05)

### Bug Fixes
- **Plugin icon**: The ribbon icon now uses the `closed-caption` icon.

---

## 2.0.23 (2026-08-03)

### Improvements
- **Minimum Obsidian version raised to 1.13.0**: The settings tab uses the declarative settings API, which requires Obsidian 1.13.0 or later. The manifest now declares this.
- **Custom provider settings refresh**: Adding or editing a custom LLM provider now refreshes the settings tab correctly.
- **Consistent capitalization**: Ribbon label, notices, and modal titles now use sentence case, and a notice that referred to a "Create new file" setting now uses the setting's actual name.
- Obsidian plugin lint rules now run in CI.

---

## 2.0.22 (2026-08-03)

### Improvements
- **Settings tab rebuilt on Obsidian's declarative settings API** (`getSettingDefinitions`), with settings values normalized on load.

### Bug Fixes
- **Empty settings groups**: Frontmatter field and file format settings could render as empty groups. They now display one row per item.
- **Claude model setting**: The Claude model now uses the same dropdown with a refresh button as OpenAI and Gemini, instead of a plain text field.
- **Concurrent fetches of the same video (#107)**: Starting a second fetch of a video while the first is still running now shows a notice to wait, instead of producing a false duplicate error and skipping the SRT file.

---

## 2.0.21 (2026-08-02)

### Bug Fixes
- **Double submit in the transcript modal**: Submitting the modal twice in quick succession no longer starts two fetches.

---

## 2.0.20 (2026-08-02)

### New Features
- **Configurable frontmatter fields (#127)**: Choose which properties (title, URL, video ID, channel, duration, views, published date, description, and more) are written to each note's frontmatter, and rename the property key used for each one.

---

## 2.0.19 (2026-08-01)

### Bug Fixes
- **Claude responses with several content blocks**: The plugin now reads the first text block of a Claude response instead of assuming the first block is text.

---

## 2.0.18 (2026-08-01)

### Bug Fixes
- **Claude 5 models rejected requests**: Claude requests no longer send `temperature`, which Claude 5 models don't support.

---

## 2.0.17 (2026-08-01)

### New Features
- **Claude model list fetched from the API**: Available Claude models are now fetched from Anthropic's models endpoint, like OpenAI and Gemini, instead of being a fixed list.

---

## 2.0.16 (2026-05-28)

### Bug Fixes
- **SRT skipped when generating PDF and SRT together (#107)**: The modal only pre-checked the first configured format, and the duplicate check ran again for each format, so the SRT pass found the PDF cover note and aborted. All configured formats are now pre-checked, and the duplicate check runs once before any files are created.

### Security
- **Code blocks in external content are escaped**: Transcripts and video descriptions containing code fences (for example ```` ```dataviewjs ````) are now escaped before being written to a note, so plugins such as Dataview or Templater can't execute code from a video's captions or description.

---

## 2.0.15 (2026-05-14)

### New Features
- **Allow clipboard access setting**: The plugin's clipboard use (prefilling the URL field and the "Fetch from clipboard" command) can now be turned off.

### Documentation
- Added a permissions section to the README explaining why the plugin needs vault and clipboard access.
- Added a contributing guide.

---

## 2.0.8 – 2.0.14 (2026-05-13 – 2026-05-14)

### Improvements
- Fixes for issues reported by the Obsidian community plugin submission checker and code inspections: type safety, sentence-case UI text, styles moved from inline to `styles.css`, and build and lint configuration updates.
- Release workflow updated to Node.js 24 compatible GitHub Actions.

---

## 2.0.7 (2026-04-27)

### Bug Fixes
- **`{PdfLink}` empty when generating PDF and SRT together (#92)**: The SRT pass overwrote the cover note created by the PDF pass, leaving `{PdfLink}` empty. When PDF is also generated, the PDF pass now creates the single cover note with both links.
- **Single-line transcripts contained line breaks**: Caption segments with embedded line breaks broke single-line mode. Whitespace is now normalized to single spaces.

---

## 2.0.5 – 2.0.6 (2026-04-24)

### Bug Fixes
- **`{PdfLink}` empty in SRT cover notes**: The `{PdfLink}` template variable was empty in cover notes created for SRT files.

---

## 2.0.4 (2026-04-24)

### Bug Fixes
- **`{PdfLink}` placeholder producing `{SrtLink}` value (#90)**: When creating SRT files, the `{PdfLink}` placeholder in cover notes was incorrectly being replaced with the SRT link value instead of the PDF link.

---

## 2.0.3 (2026-04-23)

### Bug Fixes
- **Cover note file name setting erased on every load (#89)**: The cover note file name template setting was being reset to its default value every time the plugin loaded. Settings are now properly persisted.

---

## 2.0.2 (2026-04-23)

### Bug Fixes
- **`{SrtLink}` template variable not populated when creating SRT files**: The `{SrtLink}` placeholder in cover note templates was not being replaced when SRT files were created, leaving the placeholder literal in the output.

---

## 2.0.1 (2026-04-23)

### Bug Fixes
- **Restore cover note naming feature and prevent duplicate cover notes (#86)**: Fixed a regression where the cover note naming feature was not working correctly and could create duplicate cover notes. Cover note generation now respects file naming settings and deduplication logic.

---

## 2.0.0 (2026-04-23)

### Major Changes

**Breaking Changes:**
- **Generalized cover notes**: Cover notes are no longer PDF-specific and now work for both PDF and SRT files. All PDF-specific settings have been renamed to generic equivalents:
  - `createPdfCoverNote` → `createCoverNote`
  - `pdfCoverNoteLocation` → `coverNoteLocation`
  - `pdfAttachmentFolder` → `attachmentFolder`
  - `pdfCoverNoteTemplate` → `coverNoteTemplate`
  - Removed: `srtLocation`, `defaultCoverNoteName`, `useAttachmentFolderForPdf`, `pdfAttachmentFolderName`

### New Features
- **Unified cover notes for PDF and SRT**: A single cover note per video can now link to both PDF and SRT files when both formats are created
- **Consistent file nesting**: Both PDF and SRT files use the same nesting structure under `{coverNoteLocation}/{attachmentFolder}/`

### Improvements
- **Backward compatibility**: Old PDF-specific settings are automatically migrated to new generic settings on first load
- **Simplified configuration**: Single set of cover note settings works for all attachment types (PDF, SRT, future formats)
- **Cleaner directory structure**: Consistent organization of attachments regardless of file format
- **Documentation updates**: Updated README and all settings descriptions to reflect generic cover note functionality

### Migration Guide
If you previously used PDF cover notes:
1. The plugin automatically migrates your settings on first load
2. Your old `pdfCoverNoteLocation` becomes `coverNoteLocation`
3. Your old `pdfAttachmentFolder` becomes `attachmentFolder`
4. If you had `srtLocation` set separately, it's no longer used (cover notes now handle both)
5. All functionality remains the same, but now works for PDF and SRT together

---

## 1.0.43 (2026-04-22)

### Bug Fixes
- **SRT in root directory (#84)**: SRT files were silently placed in the vault root when a filename template variable (e.g. `{ChannelName}`) expanded to an empty string. The resolved path is now validated after expansion; if it is empty the plugin falls back to the selected directory or the active file's directory.

---

## 1.0.42 (2026-04-22)

### Bug Fixes
- **`{PdfDirectory}` shows only last folder name (#83)**: The `{PdfDirectory}` template variable in PDF cover notes now correctly expands to the full directory path (e.g. `Transcripts/Videos`) instead of just the last path segment (`Videos`).
- **SRT directory and `{SrtLink}` (#81, #82)**: Three related bugs fixed:
  - `srtLocation` setting now expands `{VideoName}` and `{ChannelName}` template variables (previously ignored).
  - `{SrtLink}` in PDF cover notes now points to the correct SRT directory instead of the PDF attachment folder.
  - `{SrtLink}` now uses the SRT filename template (`defaultSrtFileName`) rather than the note name template.

---

## 1.0.41 (2026-04-22)

### New Features
- **SRT file naming template (#79)**: Added a `Default SRT File Name` setting that supports `{VideoName}` and `{ChannelName}` template variables, giving full control over SRT output filenames.

---

## 1.0.40 (2026-04-22)

### New Features
- **`{PdfDirectory}` template variable (#78)**: New template variable for use in PDF cover note paths and content, expanding to the directory where the PDF is stored.

### Bug Fixes
- **SRT directory resolution order (#80)**: Format-specific directory settings (e.g. `srtLocation`) are now checked before the general selected-directory fallback, ensuring SRT files land in the correct folder.

---

## 1.0.39 (2026-04-22)

### New Features
- **`{SrtLink}` template variable**: New template variable for PDF cover notes that inserts a wiki-link to the corresponding SRT file.

### Improvements
- Consolidated template variable and path utility logic into dedicated modules for easier maintenance.

---

## 1.0.38 (2026-04-22)

### Bug Fixes
- **Clipboard command only processed first format**: When multiple output formats were selected, the "copy to clipboard" command only processed the first one. All selected formats are now handled correctly.

---

## 1.0.37 (2026-04-22)

### Improvements
- **SRT attachment folder setting**: The SRT attachment folder setting now works consistently with the PDF attachment folder setting, using the same UI pattern and resolution logic.

---

## 1.0.36 (2026-04-21)

### New Features
- **Configurable PDF attachment folder name (#67)**: The folder name used for PDF attachments can now be configured in settings.

### Bug Fixes
- **Duplicate note modal shows full path (#68)**: The duplicate document modal now displays the full vault path instead of just the filename, and the link is clickable.
- **SRT download location**: SRT files are now saved to the configured location rather than a hard-coded fallback.

---

## 1.0.35 (2026-03-07)

### New Features
- **Multi-format generation (#64)**: Multiple output formats (Markdown, PDF, SRT) can now be generated in a single request.
- **Duplicate video error modal (#65)**: Attempting to fetch a transcript for a video that already has a note now shows a helpful modal instead of silently overwriting.

### Bug Fixes
- **YouTube bot-detection bypass**: Switched to the `ANDROID_VR` client with `visitorData` to work around YouTube's updated bot-detection, with a watch-page HTML fallback and a clear error modal when access is still blocked.

---

## 1.0.34 (2026-03-02)

### New Features
- **SRT subtitle format (#58)**: Transcripts can now be exported as `.srt` subtitle files.
- **Duplicate detection (#50)**: Option to skip fetching a transcript if a note for that video already exists.
- **Custom LLM provider fix (#54)**: Fixed a bug where selecting a custom LLM provider was ignored.

### Bug Fixes
- **Cover note location (#49)**: PDF cover notes are now created in the configured location even when no file is currently open in the editor.
