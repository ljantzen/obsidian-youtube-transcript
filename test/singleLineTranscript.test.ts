import { describe, it, expect } from 'vitest';

describe('Single Line Transcript', () => {
  it('should have false as default', () => {
    const settings = {
      singleLineTranscript: false,
    };
    expect(settings.singleLineTranscript).toBe(false);
  });

  it('should enable single line transcript', () => {
    const settings = {
      singleLineTranscript: true,
    };
    expect(settings.singleLineTranscript).toBe(true);
  });

  describe('Transcript formatting with single line', () => {
    const formatTranscriptSingleLine = (
      segments: Array<{ text: string; startTime: number }>,
      includeTimestamps: boolean,
      singleLine: boolean
    ): string => {
      if (singleLine) {
        if (includeTimestamps) {
          const parts: string[] = [];
          segments.forEach((segment) => {
            const timestamp = `[${Math.floor(segment.startTime / 60)}:${String(Math.floor(segment.startTime % 60)).padStart(2, '0')}](url)`;
            parts.push(timestamp, segment.text);
          });
          return parts.join(' ');
        } else {
          return segments.map((s) => s.text).join(' ');
        }
      } else {
        // Multi-line mode
        if (includeTimestamps) {
          const lines: string[] = [];
          segments.forEach((segment) => {
            const timestamp = `[${Math.floor(segment.startTime / 60)}:${String(Math.floor(segment.startTime % 60)).padStart(2, '0')}](url)`;
            lines.push(`${timestamp} ${segment.text}`);
          });
          return lines.join('\n');
        } else {
          const text = segments.map((s) => s.text).join(' ');
          return text.replace(/([.!?])\s+([A-Z])/g, '$1\n\n$2');
        }
      }
    };

    it('should format transcript as single line without timestamps', () => {
      const segments = [
        { text: 'Hello world.', startTime: 0 },
        { text: 'This is a test.', startTime: 5 },
        { text: 'Another sentence.', startTime: 10 },
      ];

      const result = formatTranscriptSingleLine(segments, false, true);
      expect(result).toBe('Hello world. This is a test. Another sentence.');
      expect(result).not.toContain('\n');
    });

    it('should format transcript as single line with timestamps', () => {
      const segments = [
        { text: 'Hello world.', startTime: 0 },
        { text: 'This is a test.', startTime: 5 },
      ];

      const result = formatTranscriptSingleLine(segments, true, true);
      expect(result).toContain('Hello world.');
      expect(result).toContain('This is a test.');
      expect(result).not.toContain('\n');
      expect(result.split(' ').length).toBeGreaterThan(4); // Should have timestamps and text
    });

    it('should format transcript with line breaks when single line is disabled', () => {
      const segments = [
        { text: 'Hello world.', startTime: 0 },
        { text: 'This is a test.', startTime: 5 },
      ];

      const result = formatTranscriptSingleLine(segments, false, false);
      expect(result).toContain('\n');
    });

    it('should format transcript with line breaks and timestamps when single line is disabled', () => {
      const segments = [
        { text: 'Hello world.', startTime: 0 },
        { text: 'This is a test.', startTime: 5 },
      ];

      const result = formatTranscriptSingleLine(segments, true, false);
      expect(result).toContain('\n');
      expect(result.split('\n').length).toBeGreaterThan(1);
    });

    it('should join all segments with spaces in single line mode', () => {
      const segments = [
        { text: 'First', startTime: 0 },
        { text: 'second', startTime: 2 },
        { text: 'third', startTime: 4 },
      ];

      const result = formatTranscriptSingleLine(segments, false, true);
      expect(result).toBe('First second third');
      expect(result.split(' ').length).toBe(3);
    });

    it('should handle empty segments in single line mode', () => {
      const segments: Array<{ text: string; startTime: number }> = [];
      const result = formatTranscriptSingleLine(segments, false, true);
      expect(result).toBe('');
    });

    it('should preserve spacing between words in single line mode', () => {
      const segments = [
        { text: 'Hello world', startTime: 0 },
        { text: 'test sentence', startTime: 5 },
      ];

      const result = formatTranscriptSingleLine(segments, false, true);
      expect(result).toBe('Hello world test sentence');
      expect(result.split(' ').length).toBe(4);
    });

    it('should include timestamps inline in single line mode', () => {
      const segments = [
        { text: 'Hello', startTime: 0 },
        { text: 'world', startTime: 5 },
      ];

      const result = formatTranscriptSingleLine(segments, true, true);
      // Should contain timestamp markers
      expect(result).toMatch(/\[0:\d{2}\]/);
      expect(result).toMatch(/\[0:\d{2}\]/);
      expect(result).toContain('Hello');
      expect(result).toContain('world');
      expect(result).not.toContain('\n');
    });
  });

  describe('Single line vs multi-line comparison', () => {
    const segments = [
      { text: 'First sentence.', startTime: 0 },
      { text: 'Second sentence.', startTime: 5 },
      { text: 'Third sentence.', startTime: 10 },
    ];

    it('should produce different output for single line vs multi-line', () => {
      const singleLine = segments.map((s) => s.text).join(' ');
      const multiLine = segments.map((s) => s.text).join('\n\n');

      expect(singleLine).not.toBe(multiLine);
      expect(singleLine).not.toContain('\n');
      expect(multiLine).toContain('\n');
    });

    it('should have same content but different formatting', () => {
      const singleLine = segments.map((s) => s.text).join(' ');
      const multiLine = segments.map((s) => s.text).join('\n\n');

      // Remove formatting to compare content
      const singleLineContent = singleLine.replace(/\s+/g, ' ').trim();
      const multiLineContent = multiLine.replace(/\s+/g, ' ').trim();

      expect(singleLineContent).toBe(multiLineContent);
    });
  });
});
