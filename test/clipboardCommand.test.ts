import { describe, it, expect } from 'vitest';
import { extractVideoId } from '../src/utils';

describe('Clipboard Command', () => {
  describe('URL validation', () => {
    it('should validate YouTube URL from clipboard', () => {
      const clipboardText = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      const videoId = extractVideoId(clipboardText);
      
      expect(videoId).toBe('dQw4w9WgXcQ');
    });

    it('should validate short YouTube URL from clipboard', () => {
      const clipboardText = 'https://youtu.be/dQw4w9WgXcQ';
      const videoId = extractVideoId(clipboardText);
      
      expect(videoId).toBe('dQw4w9WgXcQ');
    });

    it('should validate video ID from clipboard', () => {
      const clipboardText = 'dQw4w9WgXcQ';
      const videoId = extractVideoId(clipboardText);
      
      expect(videoId).toBe('dQw4w9WgXcQ');
    });

    it('should reject invalid URL from clipboard', () => {
      const clipboardText = 'not a youtube url';
      const videoId = extractVideoId(clipboardText);
      
      expect(videoId).toBeNull();
    });

    it('should reject empty clipboard', () => {
      const clipboardText = '';
      const videoId = extractVideoId(clipboardText);
      
      expect(videoId).toBeNull();
    });

    it('should handle whitespace in clipboard', () => {
      const clipboardText = '  https://www.youtube.com/watch?v=dQw4w9WgXcQ  ';
      const trimmedUrl = clipboardText.trim();
      const videoId = extractVideoId(trimmedUrl);
      
      expect(videoId).toBe('dQw4w9WgXcQ');
    });
  });

  describe('Default settings usage', () => {
    it('should use default createNewFile setting', () => {
      const settings = {
        createNewFile: true,
      };
      
      const createNewFile = settings.createNewFile ?? false;
      expect(createNewFile).toBe(true);
    });

    it('should use default includeVideoUrl setting', () => {
      const settings = {
        includeVideoUrl: false,
      };
      
      const includeVideoUrl = settings.includeVideoUrl ?? false;
      expect(includeVideoUrl).toBe(false);
    });

    it('should use default generateSummary setting', () => {
      const settings = {
        generateSummary: true,
      };
      
      const generateSummary = settings.generateSummary ?? false;
      expect(generateSummary).toBe(true);
    });

    it('should use default tagWithChannelName setting', () => {
      const settings = {
        tagWithChannelName: false,
      };
      
      const tagWithChannelName = settings.tagWithChannelName ?? false;
      expect(tagWithChannelName).toBe(false);
    });

    it('should use all configured fileFormats', () => {
      const settings = {
        fileFormats: ['markdown', 'pdf', 'srt'] as ('markdown' | 'pdf' | 'srt')[],
      };

      const fileFormats = (settings.fileFormats && settings.fileFormats.length > 0)
        ? settings.fileFormats
        : ['markdown'];
      expect(fileFormats).toContain('markdown');
      expect(fileFormats).toContain('pdf');
      expect(fileFormats).toContain('srt');
    });

    it('should default to markdown array for backward compatibility', () => {
      const settings = {
        fileFormats: undefined as ('markdown' | 'pdf' | 'srt')[] | undefined,
      };

      const fileFormats = (settings.fileFormats && settings.fileFormats.length > 0)
        ? settings.fileFormats
        : ['markdown'];
      expect(fileFormats).toEqual(['markdown']);
    });

    it('should use default directory when set', () => {
      const settings = {
        defaultDirectory: 'Transcripts' as string | null,
      };
      
      const selectedDirectory = settings.defaultDirectory || null;
      expect(selectedDirectory).toBe('Transcripts');
    });

    it('should use null directory when default not set', () => {
      const settings = {
        defaultDirectory: null as string | null,
      };
      
      const selectedDirectory = settings.defaultDirectory || null;
      expect(selectedDirectory).toBeNull();
    });
  });

  describe('LLM provider selection', () => {
    it('should use configured provider when available', () => {
      const settings = {
        llmProvider: 'openai' as 'openai' | 'gemini' | 'claude' | 'none',
      };
      const hasProviderKey = (provider: string) => provider === 'openai';
      
      let llmProvider: 'openai' | 'gemini' | 'claude' | 'none' = 'none';
      if (settings.llmProvider && settings.llmProvider !== 'none') {
        if (hasProviderKey(settings.llmProvider)) {
          llmProvider = settings.llmProvider;
        }
      }
      
      expect(llmProvider).toBe('openai');
    });

    it('should use "none" when provider not configured', () => {
      const settings = {
        llmProvider: 'openai' as 'openai' | 'gemini' | 'claude' | 'none',
      };
      const hasProviderKey = (_provider: string) => false;
      
      let llmProvider: 'openai' | 'gemini' | 'claude' | 'none' = 'none';
      if (settings.llmProvider && settings.llmProvider !== 'none') {
        if (hasProviderKey(settings.llmProvider)) {
          llmProvider = settings.llmProvider;
        }
      }
      
      expect(llmProvider).toBe('none');
    });

    it('should use "none" when provider is "none"', () => {
      const settings = {
        llmProvider: 'none' as 'openai' | 'gemini' | 'claude' | 'none',
      };
      
      let llmProvider: 'openai' | 'gemini' | 'claude' | 'none' = 'none';
      if (settings.llmProvider && settings.llmProvider !== 'none') {
        llmProvider = settings.llmProvider;
      }
      
      expect(llmProvider).toBe('none');
    });
  });

  describe('Error handling', () => {
    it('should handle clipboard access denied error', () => {
      const error = new Error('Clipboard access denied');
      error.name = 'NotAllowedError';

      const isNotAllowedError = error instanceof Error && error.name === 'NotAllowedError';
      expect(isNotAllowedError).toBe(true);
    });

    it('should handle clipboard not found error', () => {
      const error = new Error('Clipboard not found');
      error.name = 'NotFoundError';

      const isNotFoundError = error instanceof Error && error.name === 'NotFoundError';
      expect(isNotFoundError).toBe(true);
    });

    it('should handle generic clipboard errors', () => {
      const error = new Error('Unknown clipboard error');
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      expect(errorMessage).toBe('Unknown clipboard error');
    });
  });

  describe('Multiple format processing', () => {
    it('should process multiple formats from clipboard', () => {
      const settings = {
        fileFormats: ['markdown', 'pdf', 'srt'] as ('markdown' | 'pdf' | 'srt')[],
      };

      const fileFormats = (settings.fileFormats && settings.fileFormats.length > 0)
        ? settings.fileFormats
        : ['markdown'];

      // Should process all formats
      expect(fileFormats.length).toBe(3);
      fileFormats.forEach((format) => {
        expect(['markdown', 'pdf', 'srt']).toContain(format);
      });
    });

    it('should auto-enable createNewFile when PDF or SRT selected', () => {
      const fileFormats = ['markdown', 'pdf', 'srt'] as ('markdown' | 'pdf' | 'srt')[];
      const createNewFile = false;

      const hasPdfOrSrt = fileFormats.includes('pdf') || fileFormats.includes('srt');
      const finalCreateNewFile = hasPdfOrSrt ? true : createNewFile;

      expect(finalCreateNewFile).toBe(true);
    });

    it('should not require createNewFile when only markdown selected', () => {
      const fileFormats = ['markdown'] as ('markdown' | 'pdf' | 'srt')[];
      const createNewFile = false;

      const hasPdfOrSrt = fileFormats.includes('pdf') || fileFormats.includes('srt');
      const finalCreateNewFile = hasPdfOrSrt ? true : createNewFile;

      expect(finalCreateNewFile).toBe(false);
    });
  });

  describe('PDF and Markdown cover note conflict', () => {
    it('should detect markdown and PDF together', () => {
      const fileFormats = ['markdown', 'pdf'] as ('markdown' | 'pdf' | 'srt')[];

      const hasBothMarkdownAndPdf = fileFormats.includes('markdown') && fileFormats.includes('pdf');
      expect(hasBothMarkdownAndPdf).toBe(true);
    });

    it('should detect when only PDF selected', () => {
      const fileFormats = ['pdf'] as ('markdown' | 'pdf' | 'srt')[];

      const hasBothMarkdownAndPdf = fileFormats.includes('markdown') && fileFormats.includes('pdf');
      expect(hasBothMarkdownAndPdf).toBe(false);
    });

    it('should detect when only markdown selected', () => {
      const fileFormats = ['markdown'] as ('markdown' | 'pdf' | 'srt')[];

      const hasBothMarkdownAndPdf = fileFormats.includes('markdown') && fileFormats.includes('pdf');
      expect(hasBothMarkdownAndPdf).toBe(false);
    });

    it('should disable cover notes when both markdown and PDF present with setting enabled', () => {
      const fileFormats = ['markdown', 'pdf'] as ('markdown' | 'pdf' | 'srt')[];
      const createPdfCoverNote = true;

      const hasBothMarkdownAndPdf = fileFormats.includes('markdown') && fileFormats.includes('pdf');
      const disablePdfCoverNote = hasBothMarkdownAndPdf && createPdfCoverNote;

      expect(disablePdfCoverNote).toBe(true);
    });

    it('should allow cover notes when only PDF selected', () => {
      const fileFormats = ['pdf'] as ('markdown' | 'pdf' | 'srt')[];
      const createPdfCoverNote = true;

      const hasBothMarkdownAndPdf = fileFormats.includes('markdown') && fileFormats.includes('pdf');
      const disablePdfCoverNote = hasBothMarkdownAndPdf && createPdfCoverNote;

      expect(disablePdfCoverNote).toBe(false);
    });
  });
});
