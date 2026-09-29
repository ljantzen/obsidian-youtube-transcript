import { describe, it, expect } from 'vitest';
import { extractAllVideoUrls, extractVideoId, stripTrackingParams } from '../src/utils';

describe('stripTrackingParams', () => {
	it('should drop the share tracker from a short URL', () => {
		expect(stripTrackingParams('https://youtu.be/dQw4w9WgXcQ?si=AbCdEfGh12345678')).toBe('https://youtu.be/dQw4w9WgXcQ');
	});

	it('should keep the video ID and drop tracking parameters from a watch URL', () => {
		expect(
			stripTrackingParams('https://www.youtube.com/watch?v=dQw4w9WgXcQ&feature=share&pp=ygUEdGVzdA%3D%3D&utm_source=newsletter&utm_medium=email'),
		).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
	});

	it('should drop tracking parameters that come before the video ID', () => {
		expect(stripTrackingParams('https://www.youtube.com/watch?feature=youtu.be&v=dQw4w9WgXcQ&ab_channel=RickAstley'))
			.toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
	});

	it('should keep the timestamp and playlist', () => {
		expect(stripTrackingParams('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL123&index=2&t=42s&si=xyz'))
			.toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL123&index=2&t=42s');
		expect(stripTrackingParams('https://youtu.be/dQw4w9WgXcQ?si=xyz&t=42')).toBe('https://youtu.be/dQw4w9WgXcQ?t=42');
	});

	it('should keep a fragment', () => {
		expect(stripTrackingParams('https://www.youtube.com/watch?v=dQw4w9WgXcQ&fbclid=abc#t=1m2s'))
			.toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ#t=1m2s');
	});

	it('should clean URLs without a scheme and on other YouTube hosts', () => {
		expect(stripTrackingParams('youtube.com/watch?v=dQw4w9WgXcQ&si=xyz')).toBe('youtube.com/watch?v=dQw4w9WgXcQ');
		expect(stripTrackingParams('https://m.youtube.com/watch?v=dQw4w9WgXcQ&si=xyz')).toBe('https://m.youtube.com/watch?v=dQw4w9WgXcQ');
		expect(stripTrackingParams('https://music.youtube.com/watch?v=dQw4w9WgXcQ&si=xyz')).toBe('https://music.youtube.com/watch?v=dQw4w9WgXcQ');
		expect(stripTrackingParams('https://www.youtube.com/embed/dQw4w9WgXcQ?si=xyz')).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
	});

	it('should leave URLs without tracking parameters unchanged', () => {
		expect(stripTrackingParams('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
		expect(stripTrackingParams('https://youtu.be/dQw4w9WgXcQ')).toBe('https://youtu.be/dQw4w9WgXcQ');
	});

	it('should leave bare video IDs and other URLs unchanged', () => {
		expect(stripTrackingParams('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
		expect(stripTrackingParams('https://example.com/watch?v=dQw4w9WgXcQ&si=xyz')).toBe('https://example.com/watch?v=dQw4w9WgXcQ&si=xyz');
	});

	it('should keep the video ID extractable', () => {
		const cleaned = stripTrackingParams('https://www.youtube.com/watch?si=xyz&v=dQw4w9WgXcQ');
		expect(extractVideoId(cleaned)).toBe('dQw4w9WgXcQ');
	});
});

describe('extractAllVideoUrls tracking parameters', () => {
	it('should return URLs without tracking parameters', () => {
		const text = 'https://youtu.be/dQw4w9WgXcQ?si=abc\nhttps://www.youtube.com/watch?v=xvFZjo5PgG0&feature=share';
		expect(extractAllVideoUrls(text)).toEqual([
			'https://youtu.be/dQw4w9WgXcQ',
			'https://www.youtube.com/watch?v=xvFZjo5PgG0',
		]);
	});
});

describe('extractAllVideoUrls with tracking parameter removal off', () => {
	it('should return URLs as they were', () => {
		const text = 'https://youtu.be/dQw4w9WgXcQ?si=abc';
		expect(extractAllVideoUrls(text, false)).toEqual(['https://youtu.be/dQw4w9WgXcQ?si=abc']);
	});
});
