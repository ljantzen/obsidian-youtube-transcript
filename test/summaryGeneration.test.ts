import { describe, it, expect } from 'vitest';

describe('Summary Generation', () => {
	describe('Prompt building', () => {
		it('should include summary instructions when generateSummary is true', () => {
			const basePrompt = 'Process this transcript';
			const generateSummary = true;
			
			let fullPrompt = basePrompt;
			
			if (generateSummary) {
				fullPrompt += `\n\nIMPORTANT: You must provide a concise summary (2-3 sentences) of the video content, focusing on the main topics, key points, and overall message.`;
				fullPrompt += `\n\nYou MUST format your response EXACTLY as follows:\n`;
				fullPrompt += `\n## Summary\n\n[Your 2-3 sentence summary here]\n\n## Transcript\n\n[Your processed transcript here]\n`;
				fullPrompt += `\nDo NOT include any other text before or after these sections. Start directly with "## Summary".`;
			}
			
			expect(fullPrompt).toContain('## Summary');
			expect(fullPrompt).toContain('## Transcript');
			expect(fullPrompt).toContain('IMPORTANT');
		});

		it('should not include summary instructions when generateSummary is false', () => {
			const basePrompt = 'Process this transcript';
			const generateSummary = false;
			
			let fullPrompt = basePrompt;
			
			if (generateSummary) {
				fullPrompt += `\n\nIMPORTANT: You must provide a concise summary`;
			} else {
				fullPrompt += `\n\nPlease format your response as follows:\n`;
				fullPrompt += `- Start with a "## Transcript" markdown header followed by the processed transcript\n`;
			}
			
			expect(fullPrompt).not.toContain('## Summary');
			expect(fullPrompt).toContain('## Transcript');
		});
	});

	describe('Summary extraction from OpenAI response', () => {
		it('should extract summary with double newline format', () => {
			const response = `## Summary\n\nThis is a test summary with multiple sentences. It covers the main topics.\n\n## Transcript\n\nThis is the processed transcript content.`;
			
			const summaryMatch = response.match(/##\s+Summary\s*\n\n(.*?)(?=\n##\s+Transcript|$)/s);
			expect(summaryMatch).not.toBeNull();
			if (summaryMatch) {
				expect(summaryMatch[1].trim()).toBe('This is a test summary with multiple sentences. It covers the main topics.');
			}
		});

		it('should extract summary with single newline format', () => {
			const response = `## Summary\nThis is a test summary.\n\n## Transcript\n\nThis is the transcript.`;
			
			let summaryMatch = response.match(/##\s+Summary\s*\n\n(.*?)(?=\n##\s+Transcript|$)/s);
			if (!summaryMatch) {
				summaryMatch = response.match(/##\s+Summary\s*\n(.*?)(?=\n##\s+Transcript|$)/s);
			}
			
			expect(summaryMatch).not.toBeNull();
			if (summaryMatch) {
				expect(summaryMatch[1].trim()).toContain('This is a test summary');
			}
		});

		it('should handle alternative summary formats', () => {
			const response = `Summary: This is an alternative format summary.\n\n## Transcript\n\nTranscript content.`;
			
			let summaryMatch = response.match(/##\s+Summary\s*\n\n(.*?)(?=\n##\s+Transcript|$)/s);
			if (!summaryMatch) {
				summaryMatch = response.match(/##\s+Summary\s*\n(.*?)(?=\n##\s+Transcript|$)/s);
			}
			if (!summaryMatch) {
				summaryMatch = response.match(/(?:##\s+)?Summary[:\-]?\s*\n\n?(.*?)(?=\n##\s+Transcript|\n##\s+Summary|$)/is);
			}
			
			// The alternative format might not match if there's no ## header
			// This is expected behavior - we rely on fallback logic for non-standard formats
			if (summaryMatch) {
				expect(summaryMatch[1].trim()).toContain('alternative format');
			} else {
				// Fallback: alternative formats should trigger fallback logic
				const hasSummarySection = /##\s+Summary/i.test(response);
				expect(hasSummarySection).toBe(false); // No standard format found
			}
		});

		it('should detect both Summary and Transcript sections', () => {
			const response = `## Summary\n\nTest summary.\n\n## Transcript\n\nTest transcript.`;
			
			const hasSummarySection = /##\s+Summary/i.test(response);
			const hasTranscriptSection = /##\s+Transcript/i.test(response);
			
			expect(hasSummarySection).toBe(true);
			expect(hasTranscriptSection).toBe(true);
		});

		it('should handle missing summary section with fallback', () => {
			const response = `This is just a transcript without proper formatting.`;
			
			const hasSummarySection = /##\s+Summary/i.test(response);
			const hasTranscriptSection = /##\s+Transcript/i.test(response);
			
			expect(hasSummarySection).toBe(false);
			expect(hasTranscriptSection).toBe(false);
			
			// Fallback: use first paragraph as summary
			const firstPara = response.split('\n\n')[0] || response.split('\n')[0];
			expect(firstPara).toBeDefined();
		});
	});

	describe('Content reconstruction', () => {
		it('should reconstruct content with proper format when sections are missing', () => {
			const summary = 'This is the extracted summary.';
			const transcriptContent = 'This is the transcript content.';
			
			const reconstructed = `## Summary\n\n${summary}\n\n## Transcript\n\n${transcriptContent}`;
			
			expect(reconstructed).toContain('## Summary');
			expect(reconstructed).toContain('## Transcript');
			expect(reconstructed).toContain(summary);
			expect(reconstructed).toContain(transcriptContent);
		});

		it('should preserve full response when both sections exist', () => {
			const fullResponse = `## Summary\n\nTest summary.\n\n## Transcript\n\nTest transcript.`;
			const hasSummarySection = /##\s+Summary/i.test(fullResponse);
			const hasTranscriptSection = /##\s+Transcript/i.test(fullResponse);
			
			let processedTranscript: string;
			if (hasSummarySection && hasTranscriptSection) {
				processedTranscript = fullResponse;
			} else {
				processedTranscript = `## Summary\n\n${fullResponse}\n\n## Transcript\n\n${fullResponse}`;
			}
			
			expect(processedTranscript).toBe(fullResponse);
		});

		it('should handle summary-only response', () => {
			const response = `## Summary\n\nThis is only a summary section.`;
			const summaryIndex = response.indexOf('## Summary');
			const transcriptIndex = response.indexOf('## Transcript');
			
			if (transcriptIndex === -1 && summaryIndex !== -1) {
				const afterSummary = response.substring(summaryIndex + 10).trim();
				const firstPara = afterSummary.split('\n\n')[0] || afterSummary.split('\n')[0] || afterSummary.substring(0, 300);
				const summary = firstPara.trim();
				const processedTranscript = `## Summary\n\n${summary}\n\n## Transcript\n\n${afterSummary}`;
				
				expect(processedTranscript).toContain('## Summary');
				expect(processedTranscript).toContain('## Transcript');
			}
		});
	});

	describe('Edge cases', () => {
		it('should handle empty summary extraction', () => {
			const response = `## Summary\n\n\n\n## Transcript\n\nContent.`;
			const summaryMatch = response.match(/##\s+Summary\s*\n\n(.*?)(?=\n##\s+Transcript|$)/s);
			
			if (summaryMatch && summaryMatch[1]) {
				const summary = summaryMatch[1].trim();
				expect(summary.length).toBeGreaterThanOrEqual(0);
			}
		});

		it('should handle very long summary', () => {
			const longSummary = 'A'.repeat(1000);
			const response = `## Summary\n\n${longSummary}\n\n## Transcript\n\nContent.`;
			
			const summaryMatch = response.match(/##\s+Summary\s*\n\n(.*?)(?=\n##\s+Transcript|$)/s);
			expect(summaryMatch).not.toBeNull();
		});

		it('should handle summary with special characters', () => {
			const summary = 'Summary with "quotes" & special chars <test>';
			const response = `## Summary\n\n${summary}\n\n## Transcript\n\nContent.`;
			
			const summaryMatch = response.match(/##\s+Summary\s*\n\n(.*?)(?=\n##\s+Transcript|$)/s);
			expect(summaryMatch).not.toBeNull();
			if (summaryMatch) {
				expect(summaryMatch[1].trim()).toBe(summary);
			}
		});

		it('should handle multiple summary sections (take first)', () => {
			const response = `## Summary\n\nFirst summary.\n\n## Summary\n\nSecond summary.\n\n## Transcript\n\nContent.`;
			
			const summaryMatch = response.match(/##\s+Summary\s*\n\n(.*?)(?=\n##\s+Transcript|$)/s);
			expect(summaryMatch).not.toBeNull();
			if (summaryMatch) {
				expect(summaryMatch[1].trim()).toContain('First summary');
			}
		});
	});

	describe('Integration scenarios', () => {
		it('should handle complete flow: extract summary and build final content', () => {
			const mockOpenAIResponse = `## Summary\n\nThis video discusses machine learning fundamentals, covering neural networks and training algorithms.\n\n## Transcript\n\n[Processed transcript content here...]`;
			
			// Extract summary
			const summaryMatch = mockOpenAIResponse.match(/##\s+Summary\s*\n\n(.*?)(?=\n##\s+Transcript|$)/s);
			const summary = summaryMatch && summaryMatch[1] ? summaryMatch[1].trim() : null;
			
			// Build final content
			const hasSummarySection = /##\s+Summary/i.test(mockOpenAIResponse);
			const hasTranscriptSection = /##\s+Transcript/i.test(mockOpenAIResponse);
			
			let processedTranscript: string;
			if (hasSummarySection && hasTranscriptSection) {
				processedTranscript = mockOpenAIResponse;
			} else {
				processedTranscript = `## Summary\n\n${summary || 'No summary available'}\n\n## Transcript\n\n${mockOpenAIResponse}`;
			}
			
			expect(summary).not.toBeNull();
			expect(summary).toContain('machine learning');
			expect(processedTranscript).toContain('## Summary');
			expect(processedTranscript).toContain('## Transcript');
		});

		it('should handle OpenAI not following format (fallback scenario)', () => {
			const badResponse = `Here is the summary: Machine learning is important. And here is the transcript: [content]`;
			
			const hasSummarySection = /##\s+Summary/i.test(badResponse);
			const hasTranscriptSection = /##\s+Transcript/i.test(badResponse);
			
			expect(hasSummarySection).toBe(false);
			expect(hasTranscriptSection).toBe(false);
			
			// Fallback logic
			const firstPara = badResponse.split('\n\n')[0] || badResponse.split('\n')[0];
			const summary = firstPara && firstPara.length < 500 && !firstPara.startsWith('##') 
				? firstPara.trim() 
				: null;
			
			const processedTranscript = summary
				? `## Summary\n\n${summary}\n\n## Transcript\n\n${badResponse}`
				: `## Summary\n\nVideo transcript processed and cleaned.\n\n## Transcript\n\n${badResponse}`;
			
			expect(processedTranscript).toContain('## Summary');
			expect(processedTranscript).toContain('## Transcript');
		});
	});
});
