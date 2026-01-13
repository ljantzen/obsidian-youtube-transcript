import { describe, it, expect } from 'vitest';

describe('Attachment Folder for PDFs', () => {
  it('should have false as default for useAttachmentFolderForPdf', () => {
    const settings = {
      useAttachmentFolderForPdf: false,
    };
    expect(settings.useAttachmentFolderForPdf).toBe(false);
  });

  it('should enable attachment folder for PDFs', () => {
    const settings = {
      useAttachmentFolderForPdf: true,
    };
    expect(settings.useAttachmentFolderForPdf).toBe(true);
  });

  describe('getAttachmentFolderPath logic', () => {
    const getAttachmentFolderPath = (
      vaultConfig: { attachmentFolderPath?: string } | undefined
    ): string | null => {
      const attachmentFolderPath = vaultConfig?.attachmentFolderPath;

      if (!attachmentFolderPath || attachmentFolderPath.trim() === '') {
        return null;
      }

      if (attachmentFolderPath === '.') {
        return '.';
      }

      return attachmentFolderPath;
    };

    it('should return null when attachment folder is not set', () => {
      const vaultConfig = undefined;
      const result = getAttachmentFolderPath(vaultConfig);
      expect(result).toBeNull();
    });

    it('should return null when attachment folder is empty string', () => {
      const vaultConfig = { attachmentFolderPath: '' };
      const result = getAttachmentFolderPath(vaultConfig);
      expect(result).toBeNull();
    });

    it('should return "." for "below the current folder" setting', () => {
      const vaultConfig = { attachmentFolderPath: '.' };
      const result = getAttachmentFolderPath(vaultConfig);
      expect(result).toBe('.');
    });

    it('should return the folder path when set', () => {
      const vaultConfig = { attachmentFolderPath: 'Attachments' };
      const result = getAttachmentFolderPath(vaultConfig);
      expect(result).toBe('Attachments');
    });

    it('should return nested folder path', () => {
      const vaultConfig = { attachmentFolderPath: 'Media/Attachments' };
      const result = getAttachmentFolderPath(vaultConfig);
      expect(result).toBe('Media/Attachments');
    });
  });

  describe('PDF directory selection with attachment folder', () => {
    const selectDirectoryForPdf = (
      fileFormat: 'markdown' | 'pdf',
      useAttachmentFolderForPdf: boolean,
      attachmentFolder: string | null,
      selectedDirectory: string | null,
      activeFileDir: string | null
    ): string => {
      if (fileFormat === 'pdf' && useAttachmentFolderForPdf && attachmentFolder) {
        if (attachmentFolder === '.') {
          // "below the current folder" - use current file's directory
          if (!activeFileDir) {
            throw new Error(
              "Cannot use 'below the current folder' attachment setting: no active file"
            );
          }
          return activeFileDir;
        }
        return attachmentFolder;
      }

      // Normal directory selection
      if (selectedDirectory === null) {
        if (!activeFileDir) {
          throw new Error(
            'Cannot determine directory: no active file and no directory specified'
          );
        }
        return activeFileDir;
      }
      return selectedDirectory;
    };

    it('should use attachment folder for PDF when enabled', () => {
      const result = selectDirectoryForPdf(
        'pdf',
        true,
        'Attachments',
        'Transcripts',
        'Notes'
      );
      expect(result).toBe('Attachments');
    });

    it('should use current file directory for PDF when attachment folder is "."', () => {
      const result = selectDirectoryForPdf(
        'pdf',
        true,
        '.',
        'Transcripts',
        'Notes'
      );
      expect(result).toBe('Notes');
    });

    it('should throw error when attachment folder is "." but no active file', () => {
      expect(() => {
        selectDirectoryForPdf('pdf', true, '.', null, null);
      }).toThrow("Cannot use 'below the current folder' attachment setting: no active file");
    });

    it('should fall back to selected directory when attachment folder not set', () => {
      const result = selectDirectoryForPdf(
        'pdf',
        true,
        null,
        'Transcripts',
        'Notes'
      );
      expect(result).toBe('Transcripts');
    });

    it('should use normal directory selection for markdown files', () => {
      const result = selectDirectoryForPdf(
        'markdown',
        true,
        'Attachments',
        'Transcripts',
        'Notes'
      );
      expect(result).toBe('Transcripts');
    });

    it('should use normal directory selection when attachment folder is disabled', () => {
      const result = selectDirectoryForPdf(
        'pdf',
        false,
        'Attachments',
        'Transcripts',
        'Notes'
      );
      expect(result).toBe('Transcripts');
    });

    it('should use current file directory when selected directory is null', () => {
      const result = selectDirectoryForPdf(
        'pdf',
        false,
        null,
        null,
        'Notes'
      );
      expect(result).toBe('Notes');
    });
  });
});
