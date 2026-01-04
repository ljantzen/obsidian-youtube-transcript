import { describe, it, expect } from 'vitest';

describe('URL formatting and video URL inclusion', () => {
	const extractVideoId = (url: string): string | null => {
		const patterns = [
			/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
			/^([a-zA-Z0-9_-]{11})$/
		];

		for (const pattern of patterns) {
			const match = url.match(pattern);
			if (match) {
				return match[1];
			}
		}
		return null;
	};

	const normalizeUrl = (url: string): string => {
		const videoId = extractVideoId(url);
		return videoId ? `https://www.youtube.com/watch?v=${videoId}` : url;
	};

	const formatVideoUrlMarkdown = (title: string, url: string): string => {
		return `![${title}](${url})`;
	};

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
		const result = formatVideoUrlMarkdown(title, url);
		expect(result).toBe(`![${title}](${url})`);
	});

	it('should handle special characters in video title', () => {
		const title = 'Video: Title with "quotes" & special chars';
		const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
		const result = formatVideoUrlMarkdown(title, url);
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
});
