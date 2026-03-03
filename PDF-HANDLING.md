# PDF Handling in obsidian-ytt

This document specifies how the obsidian-youtube-transcript plugin handles PDF file creation, directory selection, and cover note generation.

## Overview

The plugin can save transcripts as PDF files instead of Markdown. When PDF mode is enabled:
- Transcripts are saved as `.pdf` files instead of `.md` files
- Optionally, a Markdown "cover note" can be created alongside the PDF
- PDFs can be nested in subfolders for better organization
- All PDF generation uses the same directory selection logic as Markdown files

## Directory Selection

The plugin uses a simple, consistent directory selection process for all files (both PDF and Markdown):

1. **If a directory is selected in the modal**: Use that directory
2. **If no directory is selected, but a file is open**: Use the current file's directory  
3. **If no directory is selected and no file is open**: Show an error

This means:
- PDFs and Markdown files follow the same directory selection rules
- The "saved directories" feature works the same for both formats
- The "default directory" setting applies equally to PDFs and Markdown

## PDF Cover Notes

When `createPdfCoverNote` is enabled, the plugin creates a Markdown note alongside the PDF. This "cover note" contains:
- A link to the PDF file
- Video metadata (title, channel, URL, etc.)
- Optional summary (if LLM processing is enabled)
- Any content from a custom template (if `pdfCoverNoteTemplate` is set)

### Cover Note Location

The cover note location is determined by `pdfCoverNoteLocation`:

- **If empty** (default): Cover note is created in the same directory as the PDF
- **If set**: Cover note is created at the specified path (supports template variables like `{ChannelName}`)

### PDF Nesting

When `createPdfCoverNote` is enabled, PDFs are automatically nested in a subfolder under the cover note location using the video title as the folder name. For example:

- **Settings**: `createPdfCoverNote=true`
- **Selected directory**: `Videos`
- **Result**:
  - Cover note: `Videos/My Video.md`
  - PDF: `Videos/My Video/My Video.pdf`

If `pdfCoverNoteLocation` is also set, the cover note is created at that location:

- **Settings**: `pdfCoverNoteLocation="Notes", createPdfCoverNote=true`
- **Selected directory**: (ignored when pdfCoverNoteLocation is set)
- **Result**:
  - Cover note: `Notes/My Video.md`
  - PDF: `Notes/My Video/My Video.pdf`

## Configuration Examples

### Example 1: Simple PDF with cover note

**Settings:**
```json
{
  "fileFormat": "pdf",
  "createPdfCoverNote": true,
  "pdfCoverNoteLocation": ""
}
```

**Selected directory:** `Transcripts`

**Result:**
- Cover note: `Transcripts/My Video.md`
- PDF: `Transcripts/My Video/My Video.pdf`

### Example 2: PDF and cover note in dedicated location

**Settings:**
```json
{
  "fileFormat": "pdf",
  "createPdfCoverNote": true,
  "pdfCoverNoteLocation": "Notes/Videos"
}
```

**Selected directory:** (any - will be ignored)

**Result:**
- Cover note: `Notes/Videos/My Video.md`
- PDF: `Notes/Videos/My Video/My Video.pdf`

### Example 3: Cover note and PDF together in the same subfolder

**Settings:**
```json
{
  "fileFormat": "pdf",
  "createPdfCoverNote": true,
  "pdfCoverNoteLocation": "Media/{ChannelName}"
}
```

**Selected directory:** (any - will be ignored)

**Result:**
- Cover note: `Media/Acme/My Video.md`
- PDF: `Media/Acme/My Video/My Video.pdf`

## Simplified Behavior Matrix

| Cover Notes | pdfCoverNoteLocation | Selected Dir | Cover Note Location | PDF Location |
|-------------|---------------------|--------------|---------------------|--------------|
| No          | N/A                 | `Transcripts` | N/A | `Transcripts/My Video.pdf` |
| Yes         | (empty)             | `Transcripts` | `Transcripts/My Video.md` | `Transcripts/My Video/My Video.pdf` |
| Yes         | `Notes`             | (ignored) | `Notes/My Video.md` | `Notes/My Video/My Video.pdf` |
| Yes         | `Notes/{ChannelName}` | (ignored) | `Notes/Acme/My Video.md` | `Notes/Acme/My Video/My Video.pdf` |

## Template Variables

The following template variables are supported in file/folder names:

- `{VideoName}`: The sanitized video title
- `{ChannelName}`: The sanitized channel name (empty if not available)

Variables are replaced before path normalization, so you can use them in `pdfCoverNoteLocation`.

## Settings Reference

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `fileFormat` | `"markdown" \| "pdf"` | `"markdown"` | File format for saved transcripts |
| `createPdfCoverNote` | `boolean` | `false` | Whether to create a cover note for PDFs (also enables PDF nesting) |
| `pdfCoverNoteLocation` | `string` | `""` | Path for cover notes (empty = same directory as PDF) |
| `pdfCoverNoteTemplate` | `string` | `""` | Path to template file for cover notes (empty = use default template) |
| `defaultCoverNoteName` | `string` | `"{VideoName}"` | Template for cover note file names |

## Migration Notes

If you previously used `useAttachmentFolderForPdf` (now removed), you'll need to:
1. Set your preferred directory in the plugin's "saved directories" list
2. Set it as the default directory if desired
3. Or select it manually each time in the modal

The plugin no longer reads Obsidian's core attachment folder setting. All directory selection is now controlled by the plugin's own settings.
