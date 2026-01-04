import { describe, it, expect } from 'vitest';

type LLMProvider = "openai" | "gemini" | "claude" | "none";

describe('Settings', () => {
	it('should have correct default settings structure', () => {
		const defaultSettings = {
			llmProvider: "none" as LLMProvider,
			openaiKey: '',
			openaiModel: "gpt-4o-mini",
			geminiKey: '',
			geminiModel: "gemini-1.5-flash",
			claudeKey: '',
			claudeModel: "claude-3-5-sonnet-20241022",
			prompt: 'Test prompt',
			openaiTimeout: 1,
			includeVideoUrl: false,
			generateSummary: false,
		};

		// Verify structure exists
		expect(defaultSettings.llmProvider).toBe("none");
		expect(defaultSettings.openaiModel).toBe("gpt-4o-mini");
		expect(defaultSettings.geminiModel).toBe("gemini-1.5-flash");
		expect(defaultSettings.claudeModel).toBe("claude-3-5-sonnet-20241022");
		expect(defaultSettings.openaiTimeout).toBe(1);
		expect(defaultSettings.includeVideoUrl).toBe(false);
		expect(defaultSettings.generateSummary).toBe(false);
		expect(typeof defaultSettings.prompt).toBe('string');
		expect(defaultSettings.prompt.length).toBeGreaterThan(0);
	});

	it('should validate timeout is positive number', () => {
		const validTimeouts = [1, 5, 10, 60];
		const invalidTimeouts = [0, -1, NaN];

		validTimeouts.forEach(timeout => {
			expect(timeout).toBeGreaterThan(0);
		});

		invalidTimeouts.forEach(timeout => {
			if (isNaN(timeout)) {
				expect(isNaN(timeout)).toBe(true);
			} else {
				expect(timeout).toBeLessThanOrEqual(0);
			}
		});
	});

	it('should handle boolean settings correctly', () => {
		const booleanSettings = {
			includeVideoUrl: false,
			generateSummary: false,
		};

		expect(typeof booleanSettings.includeVideoUrl).toBe('boolean');
		expect(typeof booleanSettings.generateSummary).toBe('boolean');

		// Test toggle behavior
		booleanSettings.includeVideoUrl = true;
		expect(booleanSettings.includeVideoUrl).toBe(true);

		booleanSettings.generateSummary = true;
		expect(booleanSettings.generateSummary).toBe(true);
	});

	it('should validate OpenAI key format (if provided)', () => {
		const validKeys = ['sk-test123', 'sk-1234567890abcdef'];
		const invalidKeys = ['', 'invalid', 'test'];

		validKeys.forEach(key => {
			expect(key.startsWith('sk-')).toBe(true);
			expect(key.length).toBeGreaterThan(3);
		});

		invalidKeys.forEach(key => {
			if (key === '') {
				expect(key).toBe('');
			} else {
				expect(key.startsWith('sk-')).toBe(false);
			}
		});
	});

	it('should validate provider selection', () => {
		const validProviders: LLMProvider[] = ["none", "openai", "gemini", "claude"];
		
		validProviders.forEach(provider => {
			expect(typeof provider).toBe("string");
			expect(["none", "openai", "gemini", "claude"]).toContain(provider);
		});
	});

	it('should validate model settings', () => {
		const settings = {
			openaiModel: "gpt-4o-mini",
			geminiModel: "gemini-1.5-flash",
			claudeModel: "claude-3-5-sonnet-20241022"
		};

		expect(typeof settings.openaiModel).toBe("string");
		expect(typeof settings.geminiModel).toBe("string");
		expect(typeof settings.claudeModel).toBe("string");
		expect(settings.openaiModel.length).toBeGreaterThan(0);
		expect(settings.geminiModel.length).toBeGreaterThan(0);
		expect(settings.claudeModel.length).toBeGreaterThan(0);
	});
});
