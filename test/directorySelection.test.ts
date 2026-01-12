import { describe, it, expect } from 'vitest';

describe('Directory Selection', () => {
  describe('Directory selection logic', () => {
    it('should use current file directory when selectedDirectory is null', () => {
      const activeFilePath = 'Notes/CurrentFile.md';
      const selectedDirectory: string | null = null;
      
      const directory = selectedDirectory === null
        ? activeFilePath.substring(0, activeFilePath.lastIndexOf('/'))
        : selectedDirectory;
      
      expect(directory).toBe('Notes');
    });

    it('should use selected directory when provided', () => {
      const activeFilePath = 'Notes/CurrentFile.md';
      const selectedDirectory: string | null = 'Transcripts';
      
      const directory = selectedDirectory === null
        ? activeFilePath.substring(0, activeFilePath.lastIndexOf('/'))
        : selectedDirectory;
      
      expect(directory).toBe('Transcripts');
    });

    it('should handle root directory files', () => {
      const activeFilePath = 'RootFile.md';
      const selectedDirectory: string | null = null;
      
      const directory = selectedDirectory === null
        ? activeFilePath.substring(0, activeFilePath.lastIndexOf('/'))
        : selectedDirectory;
      
      // When file is in root, lastIndexOf('/') returns -1, so substring gives empty string
      expect(directory).toBe('');
    });

    it('should handle nested directories', () => {
      const activeFilePath = 'Folder1/Folder2/Folder3/File.md';
      const selectedDirectory: string | null = null;
      
      const directory = selectedDirectory === null
        ? activeFilePath.substring(0, activeFilePath.lastIndexOf('/'))
        : selectedDirectory;
      
      expect(directory).toBe('Folder1/Folder2/Folder3');
    });
  });

  describe('Dropdown value conversion', () => {
    it('should convert empty string to null (current directory)', () => {
      const dropdownValue: string = '';
      const selectedDirectory = dropdownValue === '' ? null : dropdownValue;
      
      expect(selectedDirectory).toBeNull();
    });

    it('should use directory string when dropdown has value', () => {
      const dropdownValue: string = 'Transcripts';
      const selectedDirectory = dropdownValue === '' ? null : dropdownValue;
      
      expect(selectedDirectory).toBe('Transcripts');
    });

    it('should handle saved directory selection', () => {
      const savedDirs = ['Transcripts', 'Notes/YouTube', 'Videos'];
      const dropdownValue: string = 'Notes/YouTube';
      const selectedDirectory = dropdownValue === '' ? null : dropdownValue;
      
      expect(selectedDirectory).toBe('Notes/YouTube');
      expect(savedDirs).toContain(selectedDirectory);
    });
  });

  describe('Directory path handling', () => {
    it('should handle directory creation logic', () => {
      const directory: string = 'Transcripts';
      const shouldCreate = !!(directory && directory.trim() !== '');
      
      expect(shouldCreate).toBe(true);
    });

    it('should handle empty directory strings', () => {
      const directory: string = '';
      const shouldCreate = !!(directory && directory.trim() !== '');
      
      expect(shouldCreate).toBe(false);
    });

    it('should handle whitespace-only directories', () => {
      const directory: string = '   ';
      const shouldCreate = !!(directory && directory.trim() !== '');
      
      expect(shouldCreate).toBe(false);
    });
  });

  describe('File path construction', () => {
    it('should construct file path with directory', () => {
      const directory = 'Transcripts';
      const filename = 'Video Title.md';
      const filePath = directory ? `${directory}/${filename}` : filename;
      
      expect(filePath).toBe('Transcripts/Video Title.md');
    });

    it('should construct file path without directory (root)', () => {
      const directory = '';
      const filename = 'Video Title.md';
      const filePath = directory ? `${directory}/${filename}` : filename;
      
      expect(filePath).toBe('Video Title.md');
    });

    it('should handle nested directory paths', () => {
      const directory = 'Notes/YouTube';
      const filename = 'Video Title.md';
      const filePath = directory ? `${directory}/${filename}` : filename;
      
      expect(filePath).toBe('Notes/YouTube/Video Title.md');
    });
  });

  describe('Directory normalization', () => {
    it('should normalize paths by removing leading slashes', () => {
      const normalizePath = (path: string): string => {
        return path.trim().replace(/^\/+|\/+$/g, '').replace(/\\/g, '/');
      };

      expect(normalizePath('/Transcripts')).toBe('Transcripts');
      expect(normalizePath('//Transcripts')).toBe('Transcripts');
      expect(normalizePath('Transcripts/')).toBe('Transcripts');
    });

    it('should normalize Windows paths to forward slashes', () => {
      const normalizePath = (path: string): string => {
        return path.trim().replace(/^\/+|\/+$/g, '').replace(/\\/g, '/');
      };

      expect(normalizePath('C:\\Users\\Videos')).toBe('C:/Users/Videos');
      expect(normalizePath('Notes\\YouTube')).toBe('Notes/YouTube');
    });

    it('should handle multiple trailing slashes', () => {
      const normalizePath = (path: string): string => {
        return path.trim().replace(/^\/+|\/+$/g, '').replace(/\\/g, '/');
      };

      expect(normalizePath('Transcripts///')).toBe('Transcripts');
      expect(normalizePath('///Transcripts')).toBe('Transcripts');
    });
  });
});
