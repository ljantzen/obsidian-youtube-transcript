import { describe, it, expect } from 'vitest';
import { sanitizeFilename, sanitizeTagName } from '../src/utils';

describe('sanitizeFilename', () => {
	it('should remove invalid filename characters', () => {
		const input = 'Video: Title <with> invalid/chars|?*';
		const result = sanitizeFilename(input);
		expect(result).toBe('Video Title with invalidchars');
		expect(result).not.toContain('<');
		expect(result).not.toContain('>');
		expect(result).not.toContain(':');
		expect(result).not.toContain('/');
		expect(result).not.toContain('\\');
		expect(result).not.toContain('|');
		expect(result).not.toContain('?');
		expect(result).not.toContain('*');
	});

	it('should normalize whitespace', () => {
		const input = 'Video    Title   with    multiple   spaces';
		const result = sanitizeFilename(input);
		expect(result).toBe('Video Title with multiple spaces');
	});

	it('should trim leading and trailing whitespace', () => {
		const input = '   Video Title   ';
		const result = sanitizeFilename(input);
		expect(result).toBe('Video Title');
	});

	it('should limit length to 100 characters', () => {
		const input = 'a'.repeat(150);
		const result = sanitizeFilename(input);
		expect(result).toHaveLength(100);
	});

	it('should handle empty string', () => {
		const input = '';
		const result = sanitizeFilename(input);
		expect(result).toBe('');
	});

	it('should handle string with only invalid characters', () => {
		const input = '<>:"/\\|?*';
		const result = sanitizeFilename(input);
		expect(result).toBe('');
	});

	it('should preserve valid characters', () => {
		const input = 'Video Title 123 - Test';
		const result = sanitizeFilename(input);
		expect(result).toBe('Video Title 123 - Test');
	});

	it('should handle special unicode characters', () => {
		const input = 'Video Title with émojis 🎥';
		const result = sanitizeFilename(input);
		// Should preserve unicode but remove emojis if they cause issues
		expect(result).toContain('Video Title');
	});
});

describe('sanitizeTagName', () => {
	it('should replace spaces with hyphens', () => {
		expect(sanitizeTagName('hello world')).toBe('hello-world');
	});

	it('should remove non-alphanumeric characters except hyphens and underscores', () => {
		expect(sanitizeTagName('hello!@#world')).toBe('helloworld');
	});

	it('should collapse multiple hyphens', () => {
		expect(sanitizeTagName('hello---world')).toBe('hello-world');
	});

	it('should remove leading and trailing hyphens', () => {
		expect(sanitizeTagName('-hello-world-')).toBe('hello-world');
	});

	it('should convert to lowercase', () => {
		expect(sanitizeTagName('Hello World')).toBe('hello-world');
	});

	it('should limit length to 50 characters', () => {
		expect(sanitizeTagName('a'.repeat(60))).toHaveLength(50);
	});

	it('should handle empty string', () => {
		expect(sanitizeTagName('')).toBe('');
	});
});
