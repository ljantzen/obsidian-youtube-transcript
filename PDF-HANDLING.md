# How PDF transcripts should be handled 

This document specifies how generating transcripts from youtube should be handled when the output format is PDF. 


## Configuration variables 

  createNewFile: boolean; 
  useAttachmentFolderForPdf: boolean; 
  defaultDirectory: string | null; 
  createPdfCoverNote: boolean;
  pdfCoverNoteLocation: string; 
  pdfCoverNoteTemplate: string; 
  pdfAttachmentFolderName: string; 

## Differences from markdown 

The plugin was intially developed with markdown in mind, but user feedback indicated that storing transcripts in PDF files was worthwhile. 

When markdown is selected, the transcript is inserted into the current document unless the setting `createNewFile` is switched on. 
If the latter is the case, a file containing the markdown text is created. Its location is determined by:

- In the modal there is a field where the user can select one of the predefined download directories 
- One of those is the `current directory`. 
- The filename is a setting, supported by {VideoName} and {ChannelName} template variables 


Initially PDF storage used the same mechanism, but it quickly proved too simplistic.

- The `createNewFile` setting is irrelevant, as a PDF can not be inserted directly into a markdown document. 
- A PDF is always stored in a file on disk 
- It is either stored in the 'current directory', or in one of the predefined download directories 

## Attachments storage 

Obsidian has a core setting in the 'Files and links' section called 'Default location for new attachments. Some users wanted
the plugin to respect this setting for PDF files. The `useAttachmentFolderForPdf` setting was implemented to respect that setting. 

One of the possible values of 'Default location for new attachments' is 'below current directory'. The core setting 'Subfolder name'
then specifies the name of the subfolder the attachment is stored in. 

If `useAttachmentFolderForPdf` is false, the pdf is stored in the directory specified in the modal, eg either the current folder or one of the 
predefined download directories. 

If `useAttachmentFolderForPdf` is true, the PDF is stored in the directory specified by that setting. The setting has 4 possible values: 

- Vault folder, which I think is the same as vault root folder 
- Same folder as current file 
- In subfolder under current file 
- In subfolder under the directory of the current document ('current folder')
- In the folder specified below 

If 'subfolder under current folder' is selected, the option 'Subfolder name' becomes available.  
This specifies the name of the attachment subfolder. 

If 'in the folder specified below' is selected, no 'Subfolder name' is available. All attachments will be stored in the specified folder. 

## No open file

A special case is when the transcript import is triggered when no file is currently open, and settings indicate that the storage location 
should be determined by the directory of the currently open file (i.e., attachment folder is set to "below current folder" = "."). 
In that case, if a subfolder name is configured, the file will be stored in VAULT_ROOT/{Subfolder name}. If no subfolder is configured, 
the implementation defaults to using an "attachments" folder (matching Obsidian's default behavior) to provide a seamless user experience. 

If no file is open, and 'Default location for new attachment' is 'Vault folder', and 'Use attachment folder for pdf' is off, an error notice should be given. 

If no file is open, and 'Default location for new attachment' is 'Vault folder', and 'Use attachment folder for pdf' is on, the pdf should be stored in the vault root. 

## Attachment subfolders 

To keep file storage neat and orderly, it should be possible to store the pdf files in subfolders below the attachment folder. To that end, 
the plugin setting `pdfAttachmentFolderName` was created. It supports variables {ChannelName} and {VideoName}. 
If empty, the PDF filename (without extension) is used as the folder name. If specified, the value gives the name of the subfolder under the cover note location where the PDF will be stored. The folder is created automatically if it does not exist. 

## Cover notes 

PDF documents cannot easily contain metadata, so we added the possibility of automatically creating a cover note. This is a markdown document containing metadata retrieved from youtube, in addition to a link to the generated PDF transcript document. A templating mechanism is used when generating the cover note. The setting `pdfCoverNoteLocation` specifies a directory where PDF cover notes will be stored. 

When both `useAttachmentFolderForPdf` and `createPdfCoverNote` are enabled, PDFs are nested in subfolders. The `pdfAttachmentFolderName` setting controls the subfolder name. 

### Default Cover Note Location (when `pdfCoverNoteLocation` is empty)

**Important:** By default, cover notes are placed at the **parent level** (outside the PDF subfolder), not inside it. This design makes cover notes easier to find and link to, while keeping PDFs organized in subfolders.

**Structure when `pdfCoverNoteLocation=""` (empty):**
- Cover note: `{baseDirectory}/{coverNoteFilename}.md` (at parent level)
- PDF: `{baseDirectory}/{pdfAttachmentFolderName}/{pdfFilename}.pdf` (nested inside subfolder)

**Example with attachment folder "Media" and `pdfAttachmentFolderName="{ChannelName}-PDF"`:**
- Cover note: `Media/My Video.md` (at parent level)
- PDF: `Media/Acme-PDF/My Video.pdf` (nested in channel subfolder)

### Custom Cover Note Location

If you want the cover note **inside** the PDF subfolder (alongside the PDF), set `pdfCoverNoteLocation` explicitly:

**Example:** To place both cover note and PDF in `Media/Acme-PDF/`:
```json
"pdfCoverNoteLocation": "Media/{ChannelName}-PDF"
```

This produces:
- Cover note: `Media/Acme-PDF/My Video.md`
- PDF: `Media/Acme-PDF/My Video.pdf`

**General structure when `pdfCoverNoteLocation` is specified:**

**Important:** When `useAttachmentFolderForPdf=true`, the `pdfCoverNoteLocation` is **nested under** the attachment folder, not an absolute path.

- Cover note: `{attachmentFolder}/{pdfCoverNoteLocation}/{coverNoteFilename}.md`
- PDF: `{attachmentFolder}/{pdfCoverNoteLocation}/{pdfAttachmentFolderName}/{pdfFilename}.pdf`

**Example:** With attachment folder "A/B/C/XYZ" and `pdfCoverNoteLocation="Covers"`:
- Cover note: `A/B/C/XYZ/Covers/My Video.md`
- PDF: `A/B/C/XYZ/Covers/Acme-PDF/My Video.pdf` (assuming `pdfAttachmentFolderName="{ChannelName}-PDF"`)

**To place both cover note and PDF in the same folder:**
Set `pdfCoverNoteLocation="{ChannelName}-PDF"` and `pdfAttachmentFolderName=""`:
- Cover note: `A/B/C/XYZ/Acme-PDF/My Video.md`
- PDF: `A/B/C/XYZ/Acme-PDF/My Video.pdf`

**Alternative:** To disable PDF subfolder nesting entirely:
```json
"pdfAttachmentFolderName": ""
```

This produces (with empty `pdfCoverNoteLocation`):
- Cover note: `A/B/C/XYZ/My Video.md`
- PDF: `A/B/C/XYZ/My Video/My Video.pdf` (uses PDF filename as folder name) 

## Cover note naming

The `defaultCoverNoteName` setting controls the filename for cover notes. It supports the following template variables:
- `{VideoName}` - The video title
- `{ChannelName}` - The YouTube channel name
- `{PdfDirectory}` - The name of the directory containing the PDF file

## Cover note templates

The `pdfCoverNoteTemplate` setting allows specifying a custom markdown template file for cover notes. If left empty, a default template is used.

### Supported template variables

The following variables can be used in cover note templates:

| Variable | Description |
|----------|-------------|
| `{ChannelName}` | YouTube channel name |
| `{VideoName}` | Video title |
| `{VideoUrl}` | Full YouTube URL |
| `{Summary}` | LLM-generated summary (if enabled) |
| `{PdfLink}` | Obsidian link to the PDF file |
| `{VideoId}` | YouTube video ID |
| `{LengthSeconds}` | Video duration in seconds |
| `{ViewCount}` | Number of views |
| `{PublishDate}` | Video publish date |
| `{Description}` | Video description |
| `{ChannelId}` | YouTube channel ID |
| `{IsLive}` | Whether the video is/was a live stream |
| `{IsPrivate}` | Whether the video is private |
| `{IsUnlisted}` | Whether the video is unlisted |
| `{VideoDetails.*}` | Access any field from videoDetails (e.g., `{VideoDetails.keywords}`) |

### Default cover note format

When no template is specified, the default cover note includes:
1. A channel tag (if `tagWithChannelName` is enabled)
2. An embedded YouTube video preview
3. A link to the PDF transcript
4. The summary (if LLM summarization is enabled)


## Common Configuration Examples

### Example 1: Cover note and PDF in separate locations (default behavior)

**Settings:**
```json
{
  "useAttachmentFolderForPdf": true,
  "createPdfCoverNote": true,
  "pdfCoverNoteLocation": "",
  "pdfAttachmentFolderName": "{ChannelName}-PDF"
}
```

**Obsidian attachment setting:** `A/B/C/XYZ` (absolute path)

**Result:**
- Cover note: `A/B/C/XYZ/My Video.md` (at parent level)
- PDF: `A/B/C/XYZ/Acme-PDF/My Video.pdf` (nested in channel subfolder)

### Example 2: Cover note and PDF in the same folder

**Settings:**
```json
{
  "useAttachmentFolderForPdf": true,
  "createPdfCoverNote": true,
  "pdfCoverNoteLocation": "{ChannelName}-PDF",
  "pdfAttachmentFolderName": ""
}
```

**Obsidian attachment setting:** `A/B/C/XYZ` (absolute path)

**Result:**
- Cover note: `A/B/C/XYZ/Acme-PDF/My Video.md`
- PDF: `A/B/C/XYZ/Acme-PDF/My Video.pdf`

Note: `pdfCoverNoteLocation` is nested under the attachment folder. Setting `pdfAttachmentFolderName=""` disables the extra subfolder nesting for the PDF.

### Example 3: Cover notes in dedicated subfolder, PDFs nested by channel

**Settings:**
```json
{
  "useAttachmentFolderForPdf": true,
  "createPdfCoverNote": true,
  "pdfCoverNoteLocation": "Covers",
  "pdfAttachmentFolderName": "{ChannelName}"
}
```

**Obsidian attachment setting:** `Media`

**Result:**
- Cover note: `Media/Covers/My Video.md`
- PDF: `Media/Covers/Acme/My Video.pdf`

Note: The `pdfCoverNoteLocation="Covers"` is nested under the attachment folder `Media`, creating `Media/Covers/`.


## Pdf filename and location matrix 

The following table specifies all config variable permutations and desired pdf and cover note locations. Example context: video title "My Video", channel "Acme", active file `Notes/MyNote.md` (current directory `Notes`), selected directory in modal when used is `Transcripts`. Vault root is represented as empty path.

### Plugin settings only (no cover note nesting)

| useAttachmentFolderForPdf | Default location for new attachments (Obsidian)   | Open file               | Selected directory (modal) | createPdfCoverNote | pdfCoverNoteLocation  | pdfAttachmentFolderName  | Calculated PDF location          | Calculated cover note location   |
|---------------------------|---------------------------------------------------|-------------------------|----------------------------|--------------------|-----------------------|--------------------------|----------------------------------|----------------------------------|
| false                     | N/A                                               | Yes (`Notes/MyNote.md`) | null (current)             | false              | (any)                 | (any)                    | `Notes/My Video.pdf`             | none                             |
| false                     | N/A                                               | Yes                     | `Transcripts`              | false              | (any)                 | (any)                    | `Transcripts/My Video.pdf`       | none                             |
| false                     | N/A                                               | No                      | null                       | false              | (any)                 | (any)                    | Error (no directory)             | none                             |
| false                     | N/A                                               | Yes                     | null (current)             | true               | ""                    | (any)                    | `Notes/My Video.pdf`             | `Notes/My Video.md`              |
| false                     | N/A                                               | Yes                     | null (current)             | true               | `Notes/Covers`        | (any)                    | `Notes/My Video.pdf`             | `Notes/Covers/My Video.md`       |
| false                     | N/A                                               | Yes                     | `Transcripts`              | true               | ""                    | (any)                    | `Transcripts/My Video.pdf`       | `Transcripts/My Video.md`        |
| false                     | N/A                                               | Yes                     | `Transcripts`              | true               | `Covers`              | (any)                    | `Transcripts/My Video.pdf`       | `Covers/My Video.md`             |
| false                     | N/A                                               | No                      | `Transcripts`              | true               | ""                    | (any)                    | `Transcripts/My Video.pdf`       | `Transcripts/My Video.md`        |
| false                     | N/A                                               | No                      | `Transcripts`              | true               | `Transcripts/Covers`  | (any)                    | `Transcripts/My Video.pdf`       | `Transcripts/Covers/My Video.md` |
| true                      | Vault folder                                      | No                      | (any)                      | false              | (any)                 | (any)                    | `My Video.pdf`                   | none                             |
| true                      | Vault folder                                      | Yes                     | (any)                      | false              | (any)                 | (any)                    | `My Video.pdf`                   | none                             |
| true                      | Vault folder                                      | No                      | (any)                      | true               | ""                    | (any)                    | `My Video.pdf`                   | `My Video.md`                    |
| true                      | Vault folder                                      | Yes                     | (any)                      | true               | ""                    | (any)                    | `My Video.pdf`                   | `My Video.md`                    |
| true                      | Vault folder                                      | Yes                     | (any)                      | true               | `Covers`              | (any)                    | `My Video.pdf`                   | `Covers/My Video.md`             |
| true                      | Same folder as current file                       | Yes                     | null                       | false              | (any)                 | (any)                    | `Notes/My Video.pdf`             | none                             |
| true                      | Same folder as current file                       | Yes                     | null                       | true               | ""                    | (any)                    | `Notes/My Video.pdf`             | `Notes/My Video.md`              |
| true                      | Same folder as current file                       | Yes                     | null                       | true               | `Covers`              | (any)                    | `Notes/My Video.pdf`             | `Covers/My Video.md`             |
| true                      | Subfolder under current file (e.g. `Attachments`) | Yes                     | null                       | false              | (any)                 | (any)                    | `Notes/Attachments/My Video.pdf` | none                             |
| true                      | Subfolder under current file (e.g. `Attachments`) | Yes                     | null                       | true               | ""                    | (any)                    | `Notes/Attachments/My Video.pdf` | `Notes/Attachments/My Video.md`  |
| true                      | Subfolder under current file (e.g. `Attachments`) | Yes                     | null                       | true               | `Notes/Covers`        | (any)                    | `Notes/Attachments/My Video.pdf` | `Notes/Covers/My Video.md`       |
| true                      | In folder specified below (e.g. `Media`)          | (any)                   | (any)                      | false              | (any)                 | (any)                    | `Media/My Video.pdf`             | none                             |
| true                      | In folder specified below (e.g. `Media`)          | Yes                     | (any)                      | true               | ""                    | (any)                    | `Media/My Video.pdf`             | `Media/My Video.md`              |
| true                      | In folder specified below (e.g. `Media`)          | Yes                     | (any)                      | true               | `Covers`              | (any)                    | `Media/My Video.pdf`             | `Covers/My Video.md`             |

### With cover note + attachment folder (PDF nested under cover note)

When both `useAttachmentFolderForPdf` and `createPdfCoverNote` are true, the PDF is stored in a subfolder under the cover note directory. 

**Important:** When `pdfCoverNoteLocation=""` (empty), the cover note is placed at the **parent level**, NOT inside the PDF subfolder. See examples below.

**Structure:**
- Cover note: `{coverNoteDirectory}/{filename}.md` (at parent level when pdfCoverNoteLocation is empty)
- PDF: `{coverNoteDirectory}/{pdfAttachmentFolderName}/{filename}.pdf` (nested in subfolder)

**If `pdfAttachmentFolderName` is empty,** the PDF filename (without extension) is used as the subfolder name.

**To place the cover note INSIDE the PDF subfolder,** set `pdfCoverNoteLocation` to include the `pdfAttachmentFolderName` template variable. Example:
```json
"pdfCoverNoteLocation": "Media/{ChannelName}-PDF",
"pdfAttachmentFolderName": "{ChannelName}-PDF"
```
This would place both the cover note and PDF in `Media/Acme-PDF/` (assuming channel name is "Acme").

| useAttachmentFolderForPdf | Default location for new attachments                | Open file | createPdfCoverNote | pdfCoverNoteLocation | pdfAttachmentFolderName | Calculated PDF location                     | Calculated cover note location   |
|---------------------------|-----------------------------------------------------|-----------|--------------------|----------------------|--------------------------|--------------------------------------------|----------------------------------|
| true                      | Vault folder                                        | Yes       | true               | ""                   | ""                       | `My Video/My Video.pdf`                    | `My Video.md`                    |
| true                      | Vault folder                                        | No        | true               | ""                   | ""                       | `My Video/My Video.pdf`                    | `My Video.md`                    |
| true                      | Vault folder                                        | Yes       | true               | ""                   | `{VideoName}`            | `My Video/My Video.pdf`                    | `My Video.md`                    |
| true                      | Vault folder                                        | Yes       | true               | `Notes/Covers`       | ""                       | `Notes/Covers/My Video/My Video.pdf`       | `Notes/Covers/My Video.md`       |
| true                      | Vault folder                                        | Yes       | true               | `Notes/Covers`       | `{ChannelName}`          | `Notes/Covers/Acme/My Video.pdf`           | `Notes/Covers/My Video.md`       |
| true                      | Vault folder                                        | No        | true               | `Covers`             | `{ChannelName}`          | `Covers/Acme/My Video.pdf`                 | `Covers/My Video.md`             |
| true                      | Same folder as current file                         | Yes       | true               | ""                   | ""                       | `Notes/My Video/My Video.pdf`              | `Notes/My Video.md`              |
| true                      | Same folder as current file                         | Yes       | true               | `Covers`             | `{VideoName}`            | `Covers/My Video/My Video.pdf`             | `Covers/My Video.md`             |
| true                      | Subfolder under current (`Attachments`)             | Yes       | true               | ""                   | ""                       | `Notes/Attachments/My Video/My Video.pdf`  | `Notes/Attachments/My Video.md`  |
| true                      | Subfolder under current (`Attachments`)             | Yes       | true               | ""                   | `{ChannelName}`          | `Notes/Attachments/Acme/My Video.pdf`      | `Notes/Attachments/My Video.md`  |
| true                      | Subfolder under current (`Attachments`)             | Yes       | true               | `Transcripts/Covers` | `{VideoName}`            | `Transcripts/Covers/My Video/My Video.pdf` | `Transcripts/Covers/My Video.md` |
| true                      | Below current folder (`.`), subfolder `Attachments` | Yes       | true               | ""                   | ""                       | `Notes/Attachments/My Video/My Video.pdf`  | `Notes/Attachments/My Video.md`  |
| true                      | Below current folder (`.`), subfolder `Attachments` | No        | true               | ""                   | ""                       | `Attachments/My Video/My Video.pdf`        | `Attachments/My Video.md`        |
| true                      | Below current folder (`.`), subfolder `Attachments` | No        | true               | `Covers`             | `{ChannelName}`          | `Covers/Acme/My Video.pdf`                 | `Covers/My Video.md`             |
| true                      | In folder specified below (`Media`)                 | Yes       | true               | ""                   | ""                       | `Media/My Video/My Video.pdf `             | `Media/My Video.md`              |
| true                      | In folder specified below (`Media`)                 | Yes       | true               | `Covers`             | `{ChannelName}`          | `Covers/Acme/My Video.pdf`                 | `Covers/My Video.md`             |

### No open file special cases

When no file is open, the plugin either uses the selected directory from the modal or Obsidian’s attachment setting. If attachment folder is “below current folder” (`.`), vault root + subfolder is used (or `attachments` if no subfolder is set).

| useAttachmentFolderForPdf | Default location for new attachments                | Open file | Selected directory | createPdfCoverNote | pdfCoverNoteLocation | Calculated PDF location                                       | Calculated cover note location |
|---------------------------|-----------------------------------------------------|-----------|--------------------|--------------------|-----------------------|--------------------------------------------------------------|--------------------------------|
| false                     | N/A                                                 | No        | null               | false              | (any)                 | Error: "Please open a file first or set a default directory" | none                           |
| false                     | N/A                                                 | No        | `Transcripts`      | false              | (any)                 | `Transcripts/My Video.pdf`                                   | none                           |
| false                     | N/A                                                 | No        | `Transcripts`      | true               | ""                    | `Transcripts/My Video.pdf`                                   | `Transcripts/My Video.md`      |
| false                     | N/A                                                 | No        | `Transcripts`      | true               | `Covers`              | `Transcripts/My Video.pdf`                                   | `Covers/My Video.md`           |
| true                      | Vault folder                                        | No        | (any)              | false              | (any)                 | `My Video.pdf`                                               | none                           |
| true                      | Vault folder                                        | No        | (any)              | true               | ""                    | `My Video.pdf`                                               | `My Video.md`                  |
| true                      | Vault folder                                        | No        | (any)              | true               | `Covers`              | `My Video.pdf`                                               | `Covers/My Video.md`           |
| true                      | Below current folder (`.`), subfolder `Attachments` | No        | null               | false              | (any)                 | `Attachments/My Video.pdf`                                   | none                           |
| true                      | Below current folder (`.`), subfolder `Attachments` | No        | null               | true               | ""                    | `Attachments/My Video.pdf`                                   | `Attachments/My Video.md`      |
| true                      | Below current folder (`.`), subfolder `Attachments` | No        | null               | true               | `Covers`              | `Attachments/My Video.pdf`                                   | `Covers/My Video.md`           |
| true                      | Below current folder (`.`), no subfolder configured | No        | null               | false              | (any)                 | `attachments/My Video.pdf` (default)                         | none                           |
| true                      | Below current folder (`.`), no subfolder configured | No        | null               | true               | ""                    | `attachments/My Video.pdf` (default)                         | `attachments/My Video.md`      |
| true                      | Below current folder (`.`), no subfolder configured | No        | null               | true               | `Covers`              | `attachments/My Video.pdf` (default)                         | `Covers/My Video.md`           |

