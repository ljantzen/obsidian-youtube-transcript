import { describe, it, expect } from 'vitest';

// Test helper function that matches the implementation
const decodeHtmlEntities = (text: string): string => {
	// Use DOMParser to safely decode HTML entities
	const parser = new DOMParser();
	const doc = parser.parseFromString(text, "text/html");
	return doc.documentElement.textContent || text;
};

describe('decodeHtmlEntities', () => {
	it('should decode &quot; to double quote', () => {
		const input = 'Hello &quot;world&quot;';
		const result = decodeHtmlEntities(input);
		expect(result).toBe('Hello "world"');
	});

	it('should decode &#39; to single quote', () => {
		const input = "It&#39;s a test";
		const result = decodeHtmlEntities(input);
		expect(result).toBe("It's a test");
	});

	it('should decode &amp; to ampersand', () => {
		const input = 'Tom &amp; Jerry';
		const result = decodeHtmlEntities(input);
		expect(result).toBe('Tom & Jerry');
	});

	it('should decode &lt; and &gt; to angle brackets', () => {
		const input = '&lt;tag&gt;';
		const result = decodeHtmlEntities(input);
		expect(result).toBe('<tag>');
	});

	it('should decode numeric entities', () => {
		const input = '&#34;quoted&#34;';
		const result = decodeHtmlEntities(input);
		expect(result).toBe('"quoted"');
	});

	it('should handle multiple entities in one string', () => {
		const input = '&quot;Hello&quot; &amp; &quot;World&quot;';
		const result = decodeHtmlEntities(input);
		expect(result).toBe('"Hello" & "World"');
	});

	it('should handle text without entities', () => {
		const input = 'Plain text without entities';
		const result = decodeHtmlEntities(input);
		expect(result).toBe('Plain text without entities');
	});

	it('should handle empty string', () => {
		const input = '';
		const result = decodeHtmlEntities(input);
		expect(result).toBe('');
	});

	it('should handle mixed content', () => {
		const input = 'Normal text &quot;quoted&quot; and more text';
		const result = decodeHtmlEntities(input);
		expect(result).toBe('Normal text "quoted" and more text');
	});
});
