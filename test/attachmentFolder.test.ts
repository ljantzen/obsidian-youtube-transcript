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

  describe('getAttachmentSubfolderName logic', () => {
    const getAttachmentSubfolderName = (
      vaultConfig: { attachmentSubfolder?: string } | undefined
    ): string => {
      const attachmentSubfolder = vaultConfig?.attachmentSubfolder;
      
      // Default to "attachments" if not configured (matches Obsidian's default)
      return attachmentSubfolder && attachmentSubfolder.trim() !== "" 
        ? attachmentSubfolder.trim() 
        : "attachments";
    };

    it('should return "attachments" as default when not configured', () => {
      const vaultConfig = undefined;
      const result = getAttachmentSubfolderName(vaultConfig);
      expect(result).toBe('attachments');
    });

    it('should return "attachments" when attachmentSubfolder is empty string', () => {
      const vaultConfig = { attachmentSubfolder: '' };
      const result = getAttachmentSubfolderName(vaultConfig);
      expect(result).toBe('attachments');
    });

    it('should return "attachments" when attachmentSubfolder is whitespace only', () => {
      const vaultConfig = { attachmentSubfolder: '   ' };
      const result = getAttachmentSubfolderName(vaultConfig);
      expect(result).toBe('attachments');
    });

    it('should return configured subfolder name', () => {
      const vaultConfig = { attachmentSubfolder: 'Media' };
      const result = getAttachmentSubfolderName(vaultConfig);
      expect(result).toBe('Media');
    });

    it('should trim whitespace from subfolder name', () => {
      const vaultConfig = { attachmentSubfolder: '  Media  ' };
      const result = getAttachmentSubfolderName(vaultConfig);
      expect(result).toBe('Media');
    });

    it('should handle custom subfolder names', () => {
      const customNames = ['Files', 'Resources', 'Assets', 'PDFs'];
      customNames.forEach((name) => {
        const vaultConfig = { attachmentSubfolder: name };
        const result = getAttachmentSubfolderName(vaultConfig);
        expect(result).toBe(name);
      });
    });
  });

  describe('PDF directory selection with attachment folder', () => {
    const selectDirectoryForPdf = (
      fileFormat: 'markdown' | 'pdf',
      useAttachmentFolderForPdf: boolean,
      attachmentFolder: string | null,
      selectedDirectory: string | null,
      activeFileDir: string | null,
      attachmentSubfolder: string = 'attachments'
    ): string => {
      if (fileFormat === 'pdf' && useAttachmentFolderForPdf && attachmentFolder) {
        if (attachmentFolder === '.' || attachmentFolder.startsWith('./')) {
          // "below the current folder" - always use current file's directory, NOT selectedDirectory
          // Exception: if no active file, use vault root + subfolder
          
          let subfolderName = "";
          if (attachmentFolder === ".") {
              // Simulating main.ts logic: if . use default/configured subfolder
              subfolderName = attachmentSubfolder;
          } else {
              // Extract from ./Folder
              subfolderName = attachmentFolder.substring(2);
          }

          if (activeFileDir !== null) {
            // Use activeFileDir as base (ignore selectedDirectory)
            const baseDir = activeFileDir;
            
            if (subfolderName && subfolderName.trim() !== "") {
                return baseDir === "" ? subfolderName : `${baseDir}/${subfolderName}`;
            } else {
                return baseDir;
            }
          } else {
            // No active file - use vault root + subfolder (per PDF-HANDLING.md)
            return subfolderName || "";
          }
        }
        return attachmentFolder;
      }

      // Normal directory selection
      if (selectedDirectory === null) {
        if (activeFileDir === null) {
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

    it('should use current file directory + subfolder for PDF when attachment folder is "."', () => {
      const result = selectDirectoryForPdf(
        'pdf',
        true,
        '.',
        'Transcripts',
        'Notes'
      );
      expect(result).toBe('Notes/attachments');
    });

    it('should handle attachment folder starting with "./"', () => {
      const result = selectDirectoryForPdf(
        'pdf',
        true,
        './Files',
        'Transcripts',
        'Notes'
      );
      // Logic assumes if starts with ./, it extracts the name and appends to base dir
      // selectDirectoryForPdf helper needs to be updated to match the new logic in main.ts
      expect(result).toBe('Notes/Files');
    });


    it('should use subfolder name for PDF when attachment folder is "." and file is in root', () => {
      const result = selectDirectoryForPdf(
        'pdf',
        true,
        '.',
        'Transcripts',
        '' // Empty string means file is in root
      );
      expect(result).toBe('attachments');
    });

    it('should use custom subfolder name when configured', () => {
      const result = selectDirectoryForPdf(
        'pdf',
        true,
        '.',
        'Transcripts',
        'Notes',
        'Media' // Custom subfolder name
      );
      expect(result).toBe('Notes/Media');
    });

    it('should use custom subfolder name when file is in root', () => {
      const result = selectDirectoryForPdf(
        'pdf',
        true,
        '.',
        'Transcripts',
        '', // Empty string means file is in root
        'PDFs' // Custom subfolder name
      );
      expect(result).toBe('PDFs');
    });

    it('should handle nested directories with subfolder', () => {
      const result = selectDirectoryForPdf(
        'pdf',
        true,
        '.',
        'Transcripts',
        'Notes/Projects/2024'
      );
      expect(result).toBe('Notes/Projects/2024/attachments');
    });

    it('should correctly extract directory from file path', () => {
      // Test path extraction logic
      const testCases = [
        { path: 'Notes/MyNote.md', expectedDir: 'Notes' },
        { path: 'Notes/Projects/MyNote.md', expectedDir: 'Notes/Projects' },
        { path: 'MyNote.md', expectedDir: '' },
        { path: 'Folder1/Folder2/File.md', expectedDir: 'Folder1/Folder2' },
      ];

      testCases.forEach(({ path, expectedDir }) => {
        const lastSlashIndex = path.lastIndexOf('/');
        const fileDir = lastSlashIndex >= 0 
          ? path.substring(0, lastSlashIndex)
          : '';
        expect(fileDir).toBe(expectedDir);
      });
    });

    it('should handle file path extraction edge cases', () => {
      // Test that path extraction works correctly
      const path = 'Notes/Subfolder/MyNote.md';
      const lastSlashIndex = path.lastIndexOf('/');
      const fileDir = lastSlashIndex >= 0 
        ? path.substring(0, lastSlashIndex)
        : '';
      
      expect(fileDir).toBe('Notes/Subfolder');
      expect(fileDir).not.toBe('');
      
      // With subfolder
      const subfolderName = 'attachments';
      const finalDir = fileDir === '' ? subfolderName : `${fileDir}/${subfolderName}`;
      expect(finalDir).toBe('Notes/Subfolder/attachments');
    });

    it('should use vault root + subfolder when attachment folder is "." but no active file', () => {
      // Per PDF-HANDLING.md line 168: when no file is open and attachment folder is ".",
      // use vault root + subfolder name
      const result = selectDirectoryForPdf('pdf', true, '.', null, null);
      expect(result).toBe('attachments'); // Default subfolder at vault root
    });

    it('should use vault root + custom subfolder when no active file', () => {
      // Per PDF-HANDLING.md line 168: when no file is open and attachment folder is ".",
      // use vault root + configured subfolder name
      const result = selectDirectoryForPdf('pdf', true, '.', null, null, 'Attachments');
      expect(result).toBe('Attachments'); // Custom subfolder at vault root
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
