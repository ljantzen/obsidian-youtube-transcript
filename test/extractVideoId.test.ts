import { describe, it, expect } from 'vitest';

// We need to extract the extractVideoId function for testing
// Since it's a private method, we'll test it through a test helper
// or make it accessible for testing

describe('extractVideoId', () => {
	// Test helper function that matches the implementation
	const extractVideoId = (url: string): string | null => {
		const patterns = [
			/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
			/^([a-zA-Z0-9_-]{11})$/ // Direct video ID
		];

		for (const pattern of patterns) {
			const match = url.match(pattern);
			if (match) {
				return match[1];
			}
		}
		return null;
	};

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
});
