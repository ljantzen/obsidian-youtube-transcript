import { describe, it, expect } from 'vitest';

// Test helper function that matches the implementation including HTML entity decoding
const parseTranscriptWithEntities = (transcriptXml: string): string[] => {
	const parser = new DOMParser();
	const xmlDoc = parser.parseFromString(transcriptXml, 'text/xml');
	
	const parserError = xmlDoc.querySelector('parsererror');
	if (parserError) {
		throw new Error('Failed to parse transcript XML');
	}

	let textElements: HTMLCollectionOf<Element> = xmlDoc.getElementsByTagName('text') as HTMLCollectionOf<Element>;
	if (textElements.length === 0) {
		textElements = xmlDoc.getElementsByTagName('transcript') as HTMLCollectionOf<Element>;
		if (textElements.length === 0) {
			textElements = xmlDoc.getElementsByTagName('p') as HTMLCollectionOf<Element>;
		}
	}

	const transcriptParts: string[] = [];
	for (let i = 0; i < textElements.length; i++) {
		const element = textElements[i];
		let text = element.textContent || '';
		
		if (!text && element.firstChild) {
			text = element.firstChild.textContent || '';
		}

		// Decode HTML entities
		if (text) {
			const parser = new DOMParser();
			const doc = parser.parseFromString(text, "text/html");
			text = doc.documentElement.textContent || text;
		}

		if (text && text.trim()) {
			transcriptParts.push(text.trim());
		}
	}

	return transcriptParts;
};

describe('parseTranscript with HTML entities', () => {
	it('should decode HTML entities in transcript text', () => {
		const xml = `<?xml version="1.0" encoding="utf-8" ?>
<transcript>
	<text start="0.0" dur="5.0">Hello &quot;world&quot;</text>
	<text start="5.0" dur="3.0">It&#39;s a test</text>
	<text start="8.0" dur="4.0">Tom &amp; Jerry</text>
</transcript>`;
		
		const result = parseTranscriptWithEntities(xml);
		expect(result).toHaveLength(3);
		expect(result[0]).toBe('Hello "world"');
		expect(result[1]).toBe("It's a test");
		expect(result[2]).toBe('Tom & Jerry');
	});

	it('should handle mixed entities and plain text', () => {
		const xml = `<?xml version="1.0" encoding="utf-8" ?>
<transcript>
	<text start="0.0" dur="5.0">Normal text &quot;quoted&quot; here</text>
</transcript>`;
		
		const result = parseTranscriptWithEntities(xml);
		expect(result).toHaveLength(1);
		expect(result[0]).toBe('Normal text "quoted" here');
	});

	it('should handle numeric HTML entities', () => {
		const xml = `<?xml version="1.0" encoding="utf-8" ?>
<transcript>
	<text start="0.0" dur="5.0">Quote: &#34;test&#34;</text>
</transcript>`;
		
		const result = parseTranscriptWithEntities(xml);
		expect(result).toHaveLength(1);
		expect(result[0]).toBe('Quote: "test"');
	});
});
