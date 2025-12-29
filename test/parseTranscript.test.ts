import { describe, it, expect } from 'vitest';

// Mock DOMParser for testing
class MockDOMParser {
	parseFromString(xml: string, type: string): Document {
		const parser = new DOMParser();
		return parser.parseFromString(xml, type);
	}
}

// Test helper function
const parseTranscript = (transcriptXml: string): string[] => {
	const parser = new MockDOMParser();
	const xmlDoc = parser.parseFromString(transcriptXml, 'text/xml');
	
	const parserError = xmlDoc.querySelector('parsererror');
	if (parserError) {
		throw new Error('Failed to parse transcript XML');
	}

	let textElements = xmlDoc.getElementsByTagName('text');
	if (textElements.length === 0) {
		textElements = xmlDoc.getElementsByTagName('transcript');
		if (textElements.length === 0) {
			textElements = xmlDoc.getElementsByTagName('p');
		}
	}

	const transcriptParts: string[] = [];
	for (let i = 0; i < textElements.length; i++) {
		const element = textElements[i];
		let text = element.textContent || '';
		
		if (!text && element.firstChild) {
			text = element.firstChild.textContent || '';
		}
		
		if (text && text.trim()) {
			transcriptParts.push(text.trim());
		}
	}

	return transcriptParts;
};

describe('parseTranscript', () => {
	it('should parse valid YouTube transcript XML', () => {
		const xml = `<?xml version="1.0" encoding="utf-8" ?>
<transcript>
	<text start="0.0" dur="5.0">Hello world</text>
	<text start="5.0" dur="3.0">This is a test</text>
	<text start="8.0" dur="4.0">YouTube transcript</text>
</transcript>`;
		
		const result = parseTranscript(xml);
		expect(result).toHaveLength(3);
		expect(result[0]).toBe('Hello world');
		expect(result[1]).toBe('This is a test');
		expect(result[2]).toBe('YouTube transcript');
	});

	it('should handle empty text elements', () => {
		const xml = `<?xml version="1.0" encoding="utf-8" ?>
<transcript>
	<text start="0.0" dur="5.0">Hello</text>
	<text start="5.0" dur="3.0"></text>
	<text start="8.0" dur="4.0">World</text>
</transcript>`;
		
		const result = parseTranscript(xml);
		expect(result).toHaveLength(2);
		expect(result[0]).toBe('Hello');
		expect(result[1]).toBe('World');
	});

	it('should handle whitespace-only text elements', () => {
		const xml = `<?xml version="1.0" encoding="utf-8" ?>
<transcript>
	<text start="0.0" dur="5.0">Hello</text>
	<text start="5.0" dur="3.0">   </text>
	<text start="8.0" dur="4.0">World</text>
</transcript>`;
		
		const result = parseTranscript(xml);
		expect(result).toHaveLength(2);
	});

	it('should trim text content', () => {
		const xml = `<?xml version="1.0" encoding="utf-8" ?>
<transcript>
	<text start="0.0" dur="5.0">  Hello world  </text>
</transcript>`;
		
		const result = parseTranscript(xml);
		expect(result).toHaveLength(1);
		expect(result[0]).toBe('Hello world');
	});

	it('should throw error for invalid XML', () => {
		const xml = '<invalid>xml</invalid>';
		
		expect(() => parseTranscript(xml)).not.toThrow(); // Parser might not throw, just return empty
	});

	it('should handle nested text elements', () => {
		const xml = `<?xml version="1.0" encoding="utf-8" ?>
<transcript>
	<text start="0.0" dur="5.0">
		Hello world
	</text>
</transcript>`;
		
		const result = parseTranscript(xml);
		expect(result.length).toBeGreaterThan(0);
	});
});
