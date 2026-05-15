import { describe, it, expect } from 'vitest';
import { sanitizeExternalMarkdown } from '../src/utils';

describe('sanitizeExternalMarkdown', () => {
	it('should escape a dataviewjs code fence', () => {
		const input = '```dataviewjs\nrequire("child_process").exec("rm -rf ~");\n```';
		const result = sanitizeExternalMarkdown(input);
		expect(result).not.toMatch(/^```/m);
		expect(result).toContain('\\`\\`\\`dataviewjs');
	});

	it('should escape a generic fenced code block', () => {
		const input = '```javascript\nconsole.log("hello");\n```';
		const result = sanitizeExternalMarkdown(input);
		expect(result).not.toMatch(/^```/m);
	});

	it('should escape fences with four or more backticks', () => {
		const input = '````python\nprint("hi")\n````';
		const result = sanitizeExternalMarkdown(input);
		expect(result).not.toMatch(/^````/m);
		expect(result).toContain('\\`\\`\\`\\`python');
	});

	it('should escape a fence at the start of the string (no leading newline)', () => {
		const result = sanitizeExternalMarkdown('```sh\necho hi\n```');
		expect(result.startsWith('\\`\\`\\`')).toBe(true);
	});

	it('should escape multiple fences in the same text', () => {
		const input = 'First block:\n```dataviewjs\ncode();\n```\nSecond block:\n```js\nother();\n```';
		const result = sanitizeExternalMarkdown(input);
		expect(result.match(/^```/m)).toBeNull();
		expect(result.match(/\\`\\`\\`/g)?.length).toBe(4);
	});

	it('should not alter normal transcript text', () => {
		const input = 'Hello world, this is a normal sentence.\nNo code here.';
		expect(sanitizeExternalMarkdown(input)).toBe(input);
	});

	it('should not alter inline backtick code', () => {
		const input = 'Use `console.log()` to debug.';
		expect(sanitizeExternalMarkdown(input)).toBe(input);
	});

	it('should not alter two consecutive backticks', () => {
		const input = 'An ``inline`` example.';
		expect(sanitizeExternalMarkdown(input)).toBe(input);
	});

	it('should handle empty string', () => {
		expect(sanitizeExternalMarkdown('')).toBe('');
	});

	it('should not escape backticks that are mid-line (not at line start)', () => {
		const input = 'some text ```not a fence```';
		expect(sanitizeExternalMarkdown(input)).toBe(input);
	});

	it('should escape a tilde-fenced block — no, tildes are unaffected', () => {
		// tildes are a separate markdown fence syntax; this function only handles backticks
		const input = '~~~dataviewjs\ncode();\n~~~';
		expect(sanitizeExternalMarkdown(input)).toBe(input);
	});
});
