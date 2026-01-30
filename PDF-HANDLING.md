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

When both `useAttachmentFolderForPdf` and `createPdfCoverNote` are enabled, PDFs are nested in subfolders. The `pdfAttachmentFolderName` setting controls the subfolder name. The structure will be:
- Cover note: `{pdfCoverNoteLocation}/{pdfFilename}.md`
- PDF: `{pdfCoverNoteLocation}/{attachmentFolderName}/{pdfFilename}.pdf`

If `pdfCoverNoteLocation` is left empty, the cover note will be placed in the same directory as the attachment folder (or vault root if no attachment folder is configured), with the same filename as the PDF but with extension '.md'. 

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


## Pdf filename and location matrix 

The following table specifies all config variable permutations and desired pdf and cover note locations. Example context: video title "My Video", channel "Acme", active file `Notes/MyNote.md` (current directory `Notes`), selected directory in modal when used is `Transcripts`. Vault root is represented as empty path.

### Plugin settings only (no cover note nesting)

| useAttachmentFolderForPdf | Default location for new attachments (Obsidian) | Open file | Selected directory (modal) | createPdfCoverNote | pdfCoverNoteLocation | pdfAttachmentFolderName | Calculated PDF location | Calculated cover note location |
|---------------------------|--------------------------------------------------|-----------|----------------------------|--------------------|----------------------|--------------------------|--------------------------|--------------------------------|
| false                     | N/A                                               | Yes (`Notes/MyNote.md`) | null (current)             | false              | (any)                 | (any)                    | `Notes/My Video.pdf`     | none                           |
| false                     | N/A                                               | Yes       | `Transcripts`              | false              | (any)                 | (any)                    | `Transcripts/My Video.pdf` | none                        |
| false                     | N/A                                               | No        | null                       | false              | (any)                 | (any)                    | Error (no directory)    | none                           |
| false                     | N/A                                               | Yes       | null                       | true               | ""                    | (any)                    | `Notes/My Video.pdf`     | `Notes/My Video.md`            |
| false                     | N/A                                               | Yes       | null                       | true               | `Notes/Covers`        | (any)                    | `Notes/My Video.pdf`     | `Notes/Covers/My Video.md`     |
| true                      | Vault folder                                     | No        | (any)                      | false              | (any)                 | (any)                    | `My Video.pdf`           | none                           |
| true                      | Vault folder                                     | Yes       | (any)                      | false              | (any)                 | (any)                    | `My Video.pdf`           | none                           |
| true                      | Same folder as current file                      | Yes       | null                       | false              | (any)                 | (any)                    | `Notes/My Video.pdf`     | none                           |
| true                      | Subfolder under current file (e.g. `Attachments`) | Yes       | null                       | false              | (any)                 | (any)                    | `Notes/Attachments/My Video.pdf` | none                  |
| true                      | In folder specified below (e.g. `Media`)          | (any)     | (any)                      | false              | (any)                 | (any)                    | `Media/My Video.pdf`     | none                           |

### With cover note + attachment folder (PDF nested under cover note)

When both `useAttachmentFolderForPdf` and `createPdfCoverNote` are true, the PDF is stored in a subfolder under the cover note directory. Cover note: `{coverNoteDirectory}/{filename}.md`. PDF: `{coverNoteDirectory}/{pdfAttachmentFolderName}/{filename}.pdf`. If `pdfAttachmentFolderName` is empty, the PDF filename (without extension) is used as the subfolder name.

| useAttachmentFolderForPdf | Default location for new attachments | Open file | createPdfCoverNote | pdfCoverNoteLocation | pdfAttachmentFolderName | Calculated PDF location | Calculated cover note location |
|---------------------------|--------------------------------------|-----------|--------------------|----------------------|--------------------------|--------------------------|--------------------------------|
| true                      | Vault folder                         | (any)     | true               | ""                   | ""                       | `My Video/My Video.pdf`   | `My Video.md`                  |
| true                      | Vault folder                         | (any)     | true               | ""                   | `{VideoName}`            | `My Video/My Video.pdf`   | `My Video.md`                  |
| true                      | Vault folder                         | (any)     | true               | `Notes/Covers`        | ""                       | `Notes/Covers/My Video/My Video.pdf` | `Notes/Covers/My Video.md` |
| true                      | Vault folder                         | (any)     | true               | `Notes/Covers`        | `{ChannelName}`          | `Notes/Covers/Acme/My Video.pdf` | `Notes/Covers/My Video.md` |
| true                      | Subfolder under current (`Attachments`) | Yes    | true               | ""                   | ""                       | `Notes/Attachments/My Video/My Video.pdf` | `Notes/Attachments/My Video.md` |
| true                      | Subfolder under current              | Yes       | true               | `Transcripts/Covers`  | `{VideoName}`            | `Transcripts/Covers/My Video/My Video.pdf` | `Transcripts/Covers/My Video.md` |

### No open file special cases

When no file is open, the plugin either uses the selected directory from the modal or Obsidian’s attachment setting. If attachment folder is “below current folder” (`.`), vault root + subfolder is used (or `attachments` if no subfolder is set).

| useAttachmentFolderForPdf | Default location for new attachments | Open file | Selected directory | Result |
|---------------------------|--------------------------------------|-----------|--------------------|--------|
| false                     | N/A                                   | No        | null               | Error: “Please open a file first or set a default directory” |
| false                     | N/A                                   | No        | `Transcripts`      | `Transcripts/My Video.pdf` |
| true                      | Vault folder                          | No        | (any)              | `My Video.pdf` |
| true                      | Below current folder (`.`), subfolder `Attachments` | No | null | `Attachments/My Video.pdf` |
| true                      | Below current folder (`.`), no subfolder configured | No | null | `attachments/My Video.pdf` (default) |





