# Release Notes

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
