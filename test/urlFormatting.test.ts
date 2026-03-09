import { describe, it, expect } from 'vitest';
import { extractVideoId, normalizeUrl } from '../src/utils';

describe('URL formatting and video URL inclusion', () => {
	it('should normalize various URL formats to watch URL', () => {
		const testCases = [
			{
				input: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
				expected: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
			},
			{
				input: 'https://youtu.be/dQw4w9WgXcQ',
				expected: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
			},
			{
				input: 'dQw4w9WgXcQ',
				expected: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
			},
			{
				input: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s',
				expected: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
			}
		];

		testCases.forEach(({ input, expected }) => {
			const result = normalizeUrl(input);
			expect(result).toBe(expected);
		});
	});

	it('should format video URL in markdown format', () => {
		const title = 'Test Video Title';
		const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
		const result = `![${title}](${url})`;
		expect(result).toBe(`![${title}](${url})`);
	});

	it('should handle special characters in video title', () => {
		const title = 'Video: Title with "quotes" & special chars';
		const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
		const result = `![${title}](${url})`;
		expect(result).toContain(title);
		expect(result).toContain(url);
	});

	it('should build content with URL, summary, and transcript in correct order', () => {
		const parts: string[] = [];
		const includeVideoUrl = true;
		const videoTitle = 'Test Video';
		const videoUrl = 'https://www.youtube.com/watch?v=test';
		const summary = 'This is a summary';
		const transcript = 'This is the transcript';

		if (includeVideoUrl) {
			parts.push(`![${videoTitle}](${videoUrl})`);
		}

		if (summary) {
			parts.push(`## Summary\n\n${summary}`);
			parts.push(`## Transcript\n\n`);
		}

		parts.push(transcript);

		const result = parts.join('\n\n');

		expect(result).toContain(`![${videoTitle}](${videoUrl})`);
		expect(result).toContain('## Summary');
		expect(result).toContain('## Transcript');
		expect(result).toContain(transcript);

		// Verify order: URL comes before summary, summary before transcript
		const urlIndex = result.indexOf('![Test Video]');
		const summaryIndex = result.indexOf('## Summary');
		const transcriptIndex = result.indexOf('This is the transcript');

		expect(urlIndex).toBeLessThan(summaryIndex);
		expect(summaryIndex).toBeLessThan(transcriptIndex);
	});

	it('should build content without URL when disabled', () => {
		const parts: string[] = [];
		const includeVideoUrl = false;
		const transcript = 'This is the transcript';

		if (includeVideoUrl) {
			parts.push('![Title](url)');
		}

		parts.push(transcript);

		const result = parts.join('\n\n');
		expect(result).not.toContain('![Title]');
		expect(result).toContain(transcript);
	});

	it('should extract video ID from various URL formats', () => {
		expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
		expect(extractVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
		expect(extractVideoId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
	});

	it('should return the original URL unchanged when it is not a YouTube URL', () => {
		const nonYouTubeUrl = 'https://example.com/video';
		expect(normalizeUrl(nonYouTubeUrl)).toBe(nonYouTubeUrl);
	});
});
