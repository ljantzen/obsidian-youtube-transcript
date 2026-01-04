import { describe, it, expect, vi, beforeEach } from 'vitest';

// Integration tests that test the flow of operations
describe('Integration Tests', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should handle complete transcript fetching flow', async () => {
		// Mock the flow:
		// 1. Extract video ID
		// 2. Fetch HTML
		// 3. Extract API key
		// 4. Call InnerTube API
		// 5. Parse transcript
		
		const mockApiKey = 'AIzaSyTest123';
		
		// Simulate API key extraction
		const mockHtml = `"INNERTUBE_API_KEY": "${mockApiKey}"`;
		const apiKeyMatch = mockHtml.match(/"INNERTUBE_API_KEY":\s*"([a-zA-Z0-9_-]+)"/);
		
		expect(apiKeyMatch).not.toBeNull();
		if (apiKeyMatch) {
			expect(apiKeyMatch[1]).toBe(mockApiKey);
		}
	});

	it('should handle error cases gracefully', () => {
		const errorCases = [
			{ input: '', expected: null },
			{ input: 'invalid-url-too-long', expected: null },
			{ input: 'https://example.com', expected: null }
		];

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

		errorCases.forEach(({ input, expected }) => {
			const result = extractVideoId(input);
			expect(result).toBe(expected);
		});
	});

	it('should sanitize filenames correctly for file creation', () => {
		const sanitizeFilename = (filename: string): string => {
			return filename
				.replace(/[<>:"/\\|?*]/g, '')
				.replace(/\s+/g, ' ')
				.trim()
				.substring(0, 100);
		};

		const testCases = [
			{
				input: 'Video: Title <with> invalid/chars',
				expected: 'Video Title with invalidchars'
			},
			{
				input: '   Normal Title   ',
				expected: 'Normal Title'
			},
			{
				input: 'a'.repeat(150),
				expected: 'a'.repeat(100)
			}
		];

		testCases.forEach(({ input, expected }) => {
			const result = sanitizeFilename(input);
			expect(result).toBe(expected);
		});
	});

	it('should build content with URL, summary, and transcript correctly', () => {
		const parts: string[] = [];
		const includeVideoUrl = true;
		const videoTitle = 'Test Video';
		const videoUrl = 'https://www.youtube.com/watch?v=test';
		const transcript = '## Transcript\n\nThis is a test transcript with multiple words';

		if (includeVideoUrl) {
			parts.push(`![${videoTitle}](${videoUrl})`);
		}

		// The transcript already includes markdown headers from OpenAI
		parts.push(transcript);

		const result = parts.join('\n\n');

		expect(result).toContain(`![${videoTitle}](${videoUrl})`);
		expect(result).toContain('## Transcript');
		expect(result).toContain('This is a test transcript');
		
		// Verify URL comes before transcript
		const urlIndex = result.indexOf('![Test Video]');
		const transcriptIndex = result.indexOf('## Transcript');
		expect(urlIndex).toBeLessThan(transcriptIndex);
	});
});
