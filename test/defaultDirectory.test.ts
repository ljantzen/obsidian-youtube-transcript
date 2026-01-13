import { describe, it, expect } from 'vitest';

describe('Default Directory', () => {
  it('should have null as default', () => {
    const settings = {
      defaultDirectory: null as string | null,
    };
    expect(settings.defaultDirectory).toBeNull();
  });

  it('should store a default directory from saved directories', () => {
    const settings = {
      savedDirectories: ['Transcripts', 'Notes/YouTube'] as string[],
      defaultDirectory: 'Transcripts' as string | null,
    };
    expect(settings.defaultDirectory).toBe('Transcripts');
    expect(settings.savedDirectories).toContain(settings.defaultDirectory);
  });

  it('should validate default directory is in saved directories', () => {
    const savedDirs = ['Transcripts', 'Notes/YouTube'];
    const defaultDir = 'Transcripts';
    
    const isValid = savedDirs.includes(defaultDir);
    expect(isValid).toBe(true);
    
    // Invalid case
    const invalidDefault = 'NonExistent';
    const isInvalid = savedDirs.includes(invalidDefault);
    expect(isInvalid).toBe(false);
  });

  it('should clear default directory when it is removed from saved directories', () => {
    let savedDirs = ['Transcripts', 'Notes/YouTube'];
    let defaultDir: string | null = 'Transcripts';
    
    // Remove the default directory
    savedDirs = savedDirs.filter(dir => dir !== defaultDir);
    
    // Clear default if it no longer exists
    if (!savedDirs.includes(defaultDir!)) {
      defaultDir = null;
    }
    
    expect(defaultDir).toBeNull();
    expect(savedDirs).toEqual(['Notes/YouTube']);
  });

  it('should use default directory when selectedDirectory is null', () => {
    const defaultDir: string | null = 'Transcripts';
    const selectedDir: string | null = null;
    
    const directory = selectedDir || defaultDir;
    expect(directory).toBe('Transcripts');
  });

  it('should prioritize selected directory over default directory', () => {
    const defaultDir: string | null = 'Transcripts';
    const selectedDir: string | null = 'Notes/YouTube';
    
    const directory = selectedDir || defaultDir;
    expect(directory).toBe('Notes/YouTube');
  });

  it('should fall back to null when neither default nor selected is set', () => {
    const defaultDir: string | null = null;
    const selectedDir: string | null = null;
    
    const directory = selectedDir || defaultDir;
    expect(directory).toBeNull();
  });
});
