import { describe, it, expect } from 'vitest';
import { extractVideoId, extractAllVideoUrls } from '../src/utils';

describe('extractVideoId', () => {
	it('should extract video ID from full YouTube URL', () => {
		const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
		const result = extractVideoId(url);
		expect(result).toBe('dQw4w9WgXcQ');
	});

	it('should extract video ID from short YouTube URL', () => {
		const url = 'https://youtu.be/dQw4w9WgXcQ';
		const result = extractVideoId(url);
		expect(result).toBe('dQw4w9WgXcQ');
	});

	it('should extract video ID from embed URL', () => {
		const url = 'https://www.youtube.com/embed/dQw4w9WgXcQ';
		const result = extractVideoId(url);
		expect(result).toBe('dQw4w9WgXcQ');
	});

	it('should extract video ID from direct ID', () => {
		const url = 'dQw4w9WgXcQ';
		const result = extractVideoId(url);
		expect(result).toBe('dQw4w9WgXcQ');
	});

	it('should extract video ID from URL with additional parameters', () => {
		const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s&list=PLxxx';
		const result = extractVideoId(url);
		expect(result).toBe('dQw4w9WgXcQ');
	});

	it('should return null for invalid URL', () => {
		const url = 'https://example.com/video';
		const result = extractVideoId(url);
		expect(result).toBeNull();
	});

	it('should return null for empty string', () => {
		const url = '';
		const result = extractVideoId(url);
		expect(result).toBeNull();
	});

	it('should return null for non-YouTube URL', () => {
		const url = 'https://vimeo.com/123456789';
		const result = extractVideoId(url);
		expect(result).toBeNull();
	});

	// Mobile YouTube URL tests
	it('should extract video ID from mobile YouTube URL (m.youtube.com)', () => {
		const url = 'https://m.youtube.com/watch?v=dQw4w9WgXcQ';
		const result = extractVideoId(url);
		expect(result).toBe('dQw4w9WgXcQ');
	});

	it('should extract video ID from mobile YouTube URL (mobile.youtube.com)', () => {
		const url = 'https://mobile.youtube.com/watch?v=dQw4w9WgXcQ';
		const result = extractVideoId(url);
		expect(result).toBe('dQw4w9WgXcQ');
	});

	it('should extract video ID from YouTube Music URL', () => {
		const url = 'https://music.youtube.com/watch?v=dQw4w9WgXcQ';
		const result = extractVideoId(url);
		expect(result).toBe('dQw4w9WgXcQ');
	});

	it('should extract video ID from mobile embed URL', () => {
		const url = 'https://m.youtube.com/embed/dQw4w9WgXcQ';
		const result = extractVideoId(url);
		expect(result).toBe('dQw4w9WgXcQ');
	});
});

describe('extractAllVideoUrls', () => {
	it('should extract single URL', () => {
		const text = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
		const result = extractAllVideoUrls(text);
		expect(result).toEqual(['https://www.youtube.com/watch?v=dQw4w9WgXcQ']);
	});

	it('should extract multiple newline-separated URLs', () => {
		const text = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ\nhttps://youtu.be/xvFZjo5PgG0';
		const result = extractAllVideoUrls(text);
		expect(result).toHaveLength(2);
		expect(result).toContain('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
		expect(result).toContain('https://youtu.be/xvFZjo5PgG0');
	});

	it('should extract multiple space-separated URLs', () => {
		const text = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ https://youtu.be/xvFZjo5PgG0';
		const result = extractAllVideoUrls(text);
		expect(result).toHaveLength(2);
		expect(result).toContain('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
		expect(result).toContain('https://youtu.be/xvFZjo5PgG0');
	});

	it('should deduplicate URLs with same video ID', () => {
		const text = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ https://youtu.be/dQw4w9WgXcQ';
		const result = extractAllVideoUrls(text);
		expect(result).toHaveLength(1);
	});

	it('should deduplicate when long form comes before short form', () => {
		const text = 'https://youtu.be/dQw4w9WgXcQ https://www.youtube.com/watch?v=dQw4w9WgXcQ';
		const result = extractAllVideoUrls(text);
		expect(result).toHaveLength(1);
		expect(result[0]).toBe('https://youtu.be/dQw4w9WgXcQ');
	});

	it('should filter out invalid URLs and keep only valid ones', () => {
		const text = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ https://example.com/invalid https://youtu.be/xvFZjo5PgG0';
		const result = extractAllVideoUrls(text);
		expect(result).toHaveLength(2);
		expect(result).toContain('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
		expect(result).toContain('https://youtu.be/xvFZjo5PgG0');
	});

	it('should extract bare video IDs', () => {
		const text = 'dQw4w9WgXcQ xvFZjo5PgG0';
		const result = extractAllVideoUrls(text);
		expect(result).toHaveLength(2);
		expect(result).toContain('dQw4w9WgXcQ');
		expect(result).toContain('xvFZjo5PgG0');
	});

	it('should deduplicate bare IDs and URLs for same video', () => {
		const text = 'dQw4w9WgXcQ https://www.youtube.com/watch?v=dQw4w9WgXcQ';
		const result = extractAllVideoUrls(text);
		expect(result).toHaveLength(1);
	});

	it('should return empty array for empty text', () => {
		const text = '';
		const result = extractAllVideoUrls(text);
		expect(result).toEqual([]);
	});

	it('should return empty array for text with no valid URLs', () => {
		const text = 'https://example.com/video https://vimeo.com/123456789';
		const result = extractAllVideoUrls(text);
		expect(result).toEqual([]);
	});

	it('should handle URLs with whitespace', () => {
		const text = '  https://www.youtube.com/watch?v=dQw4w9WgXcQ  \n  https://youtu.be/xvFZjo5PgG0  ';
		const result = extractAllVideoUrls(text);
		expect(result).toHaveLength(2);
		expect(result).toContain('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
		expect(result).toContain('https://youtu.be/xvFZjo5PgG0');
	});

	it('should handle mixed URLs and IDs', () => {
		const text = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ\nxvFZjo5PgG0\nhttps://youtu.be/abc123def45';
		const result = extractAllVideoUrls(text);
		expect(result).toHaveLength(3);
		expect(result).toContain('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
		expect(result).toContain('xvFZjo5PgG0');
		expect(result).toContain('https://youtu.be/abc123def45');
	});
});
