import { describe, it, expect } from 'vitest';

describe('Saved Directories', () => {
  it('should have empty array as default', () => {
    const settings = {
      savedDirectories: [] as string[],
    };
    expect(settings.savedDirectories).toEqual([]);
    expect(Array.isArray(settings.savedDirectories)).toBe(true);
  });

  it('should store multiple directories', () => {
    const settings = {
      savedDirectories: ['Transcripts', 'Notes/YouTube', 'Videos/Transcripts'] as string[],
    };
    expect(settings.savedDirectories).toHaveLength(3);
    expect(settings.savedDirectories).toContain('Transcripts');
    expect(settings.savedDirectories).toContain('Notes/YouTube');
    expect(settings.savedDirectories).toContain('Videos/Transcripts');
  });

  it('should normalize directory paths', () => {
    const normalizePath = (path: string): string => {
      return path.trim().replace(/^\/+|\/+$/g, '').replace(/\\/g, '/');
    };

    const testCases = [
      { input: 'Transcripts/', expected: 'Transcripts' },
      { input: '/Transcripts', expected: 'Transcripts' },
      { input: '/Transcripts/', expected: 'Transcripts' },
      { input: 'Notes\\YouTube', expected: 'Notes/YouTube' },
      { input: '  Transcripts  ', expected: 'Transcripts' },
      { input: 'Notes/YouTube/', expected: 'Notes/YouTube' },
    ];

    testCases.forEach(({ input, expected }) => {
      const result = normalizePath(input);
      expect(result).toBe(expected);
    });
  });

  it('should prevent duplicate directories', () => {
    const directories = ['Transcripts', 'Notes/YouTube'];
    const newDir = 'Transcripts';
    
    if (!directories.includes(newDir)) {
      directories.push(newDir);
    }
    
    expect(directories).toHaveLength(2);
    expect(directories).toEqual(['Transcripts', 'Notes/YouTube']);
  });

  it('should handle empty directory strings', () => {
    const directories = ['Transcripts', '', 'Notes/YouTube', '   '];
    const filtered = directories.filter(dir => dir && dir.trim() !== '');
    
    expect(filtered).toHaveLength(2);
    expect(filtered).toEqual(['Transcripts', 'Notes/YouTube']);
  });

  it('should remove directories by index', () => {
    const directories = ['Transcripts', 'Notes/YouTube', 'Videos'];
    const indexToRemove = 1;
    
    const updated = directories.filter((_, i) => i !== indexToRemove);
    
    expect(updated).toHaveLength(2);
    expect(updated).toEqual(['Transcripts', 'Videos']);
  });

  it('should handle directory selection logic', () => {
    // null = use current file's directory
    // string = use specified directory
    const selectedDirectory: string | null = null;
    const currentFileDir = 'Notes';
    
    const directory = selectedDirectory === null 
      ? currentFileDir 
      : selectedDirectory;
    
    expect(directory).toBe('Notes');
    
    // Test with selected directory
    const selectedDir: string | null = 'Transcripts';
    const directory2 = selectedDir === null 
      ? currentFileDir 
      : selectedDir;
    
    expect(directory2).toBe('Transcripts');
  });

  it('should handle directory dropdown values', () => {
    // Empty string from dropdown = current directory (pass null)
    const dropdownValue = '';
    const selectedDirectory = dropdownValue === '' ? null : dropdownValue;
    expect(selectedDirectory).toBeNull();
    
    // Non-empty string = specific directory
    const dropdownValue2: string = 'Transcripts';
    const selectedDirectory2 = dropdownValue2 === '' ? null : dropdownValue2;
    expect(selectedDirectory2).toBe('Transcripts');
  });
});
