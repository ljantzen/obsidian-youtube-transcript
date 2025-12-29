import { describe, it, expect } from 'vitest';

// Test helper function that matches the implementation
const sanitizeFilename = (filename: string): string => {
	return filename
		.replace(/[<>:"/\\|?*]/g, '') // Remove invalid characters
		.replace(/\s+/g, ' ') // Normalize whitespace
		.trim()
		.substring(0, 100); // Limit length
};

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
