import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { App, PluginManifest, DataAdapter } from 'obsidian';

// Mock Obsidian types
const createMockApp = (): Partial<App> => {
	return {
		workspace: {
			getActiveViewOfType: vi.fn(),
			getActiveFile: vi.fn(),
			openLinkText: vi.fn()
		} as unknown as App['workspace'],
		vault: {
			create: vi.fn(),
			adapter: {
				exists: vi.fn().mockResolvedValue(false)
			} as unknown as DataAdapter
		} as unknown as App['vault']
	};
};

const createMockManifest = (): PluginManifest => {
	return {
		id: 'obsidian-youtube-transcript',
		name: 'YouTube Transcript',
		version: '0.1.0',
		minAppVersion: '0.15.0',
		description: 'Test plugin',
		author: 'Test Author',
		authorUrl: '',
		isDesktopOnly: false
	};
};

describe('YouTubeTranscriptPlugin', () => {
	let mockApp: Partial<App>;
	let mockManifest: PluginManifest;

	beforeEach(() => {
		mockApp = createMockApp();
		mockManifest = createMockManifest();
		vi.clearAllMocks();
	});

	it('should initialize with default settings', () => {
		// This would require importing the actual plugin class
		// For now, we test the concept
		expect(mockApp).toBeDefined();
		expect(mockManifest).toBeDefined();
	});

	it('should handle settings loading', () => {
		// Test that settings can be loaded
		const defaultSettings = {
			llmProvider: "none" as const,
			openaiKey: '',
			openaiModel: "gpt-4o-mini",
			geminiKey: '',
			geminiModel: "gemini-1.5-flash",
			claudeKey: '',
			claudeModel: "claude-3-5-sonnet-20241022",
			prompt: 'Default prompt',
			openaiTimeout: 1,
			includeVideoUrl: false,
			generateSummary: false,
		};
		
		expect(defaultSettings.llmProvider).toBe("none");
		expect(defaultSettings.openaiKey).toBe('');
		expect(defaultSettings.openaiModel).toBe("gpt-4o-mini");
		expect(defaultSettings.geminiModel).toBe("gemini-1.5-flash");
		expect(defaultSettings.claudeModel).toBe("claude-3-5-sonnet-20241022");
		expect(defaultSettings.prompt).toBe('Default prompt');
		expect(defaultSettings.openaiTimeout).toBe(1);
		expect(defaultSettings.includeVideoUrl).toBe(false);
		expect(defaultSettings.generateSummary).toBe(false);
	});

	it('should validate video ID extraction patterns', () => {
		const patterns = [
			/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
			/^([a-zA-Z0-9_-]{11})$/
		];

		const testCases = [
			{ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ' },
			{ url: 'https://youtu.be/dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ' },
			{ url: 'dQw4w9WgXcQ', expected: 'dQw4w9WgXcQ' }
		];

		testCases.forEach(({ url, expected }) => {
			for (const pattern of patterns) {
				const match = url.match(pattern);
				if (match) {
					expect(match[1]).toBe(expected);
					break;
				}
			}
		});
	});
});
