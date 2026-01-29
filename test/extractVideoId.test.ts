import { describe, it, expect } from 'vitest';
import { extractVideoId } from '../src/utils';

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
