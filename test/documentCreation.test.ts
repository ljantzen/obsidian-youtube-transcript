import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TFile } from 'obsidian';

// Test helper functions that match the implementation logic
const sanitizeFilename = (filename: string): string => {
	return filename
		.replace(/[<>:"/\\|?*]/g, '') // Remove invalid characters
		.replace(/\s+/g, ' ') // Normalize whitespace
		.trim()
		.substring(0, 100); // Limit length
};

// Simulate the createTranscriptFile logic for testing (using FileManager API)
async function simulateCreateTranscriptFile(
	getAvailablePath: (basePath: string, extension: string) => string,
	create: (path: string, content: string) => Promise<TFile>,
	createBinary: (path: string, content: ArrayBuffer) => Promise<TFile>,
	activeFile: TFile,
	videoTitle: string,
	transcript: string,
	videoUrl: string,
	includeVideoUrl: boolean,
	fileFormat: "markdown" | "pdf" = "markdown"
): Promise<string> {
	const baseSanitizedTitle = sanitizeFilename(videoTitle);

	const activeFilePath = activeFile.path;
	const directory = activeFilePath.substring(
		0,
		activeFilePath.lastIndexOf('/')
	);

	// Determine file extension based on format
	const extension = fileFormat === "pdf" ? "pdf" : "md";

	// Use FileManager API to get an available path (handles duplicates automatically)
	const basePath = directory
		? `${directory}/${baseSanitizedTitle}.${extension}`
		: `${baseSanitizedTitle}.${extension}`;
	const newFilePath = getAvailablePath(basePath, extension);

	// Build file content
	const parts: string[] = [];
	if (includeVideoUrl) {
		parts.push(`![${videoTitle}](${videoUrl})`);
	}
	parts.push(transcript);
	const fileContent = parts.join('\n\n');

	// Create the file based on format
	if (fileFormat === "pdf") {
		// For PDF, create a mock ArrayBuffer
		const encoder = new TextEncoder();
		const pdfBuffer = encoder.encode("%PDF-1.4\nMock PDF content");
		// Convert to ArrayBuffer for consistency with actual implementation
		await createBinary(newFilePath, pdfBuffer.buffer);
	} else {
		await create(newFilePath, fileContent);
	}
	return newFilePath;
}

// Types for test mocks
type MockGetAvailablePath = (basePath: string, extension: string) => string;

type MockCreate = (path: string, content: string) => Promise<TFile>;

type MockCreateBinary = (path: string, content: ArrayBuffer) => Promise<TFile>;

// Mock Obsidian types
const createMockTFile = (path: string): TFile => {
	return {
		path,
		name: path.split('/').pop() || path,
		basename: path.split('/').pop()?.replace(/\.[^/.]+$/, '') || path,
		extension: 'md',
		stat: {
			ctime: 0,
			mtime: 0,
			size: 0,
		},
		vault: {} as unknown as TFile['vault'],
		parent: null,
	} as TFile;
};

describe('createTranscriptFile', () => {
	let mockGetAvailablePath: MockGetAvailablePath;
	let mockCreate: MockCreate;
	let mockCreateBinary: MockCreateBinary;
	let fileMap: Set<string>;

	beforeEach(() => {
		vi.clearAllMocks();
		fileMap = new Set<string>();
		// Mock getAvailablePath to handle duplicates by appending (1), (2), etc.
		mockGetAvailablePath = vi.fn<MockGetAvailablePath>().mockImplementation((basePath: string) => {
			if (!fileMap.has(basePath)) {
				return basePath;
			}
			// If file exists, find next available path
			const baseName = basePath.replace(/\.(md|pdf)$/, '');
			const extension = basePath.match(/\.(md|pdf)$/)?.[1] || "md";
			let counter = 1;
			let candidatePath = `${baseName} (${counter}).${extension}`;
			while (fileMap.has(candidatePath)) {
				counter++;
				candidatePath = `${baseName} (${counter}).${extension}`;
			}
			return candidatePath;
		});
		mockCreate = vi.fn<MockCreate>().mockImplementation(async (path: string) => {
			if (fileMap.has(path)) {
				throw new Error(`File already exists: ${path}`);
			}
			fileMap.add(path);
			return createMockTFile(path);
		});
		mockCreateBinary = vi.fn<MockCreateBinary>().mockImplementation(async (path: string) => {
			if (fileMap.has(path)) {
				throw new Error(`File already exists: ${path}`);
			}
			fileMap.add(path);
			return createMockTFile(path);
		});
	});

	it('should create a new file when no file exists', async () => {
		const activeFile = createMockTFile('test/active.md');
		const videoTitle = 'Test Video Title';
		const transcript = 'This is a test transcript';
		const videoUrl = 'https://www.youtube.com/watch?v=test123';

		const result = await simulateCreateTranscriptFile(
			mockGetAvailablePath,
			mockCreate,
			mockCreateBinary,
			activeFile,
			videoTitle,
			transcript,
			videoUrl,
			false,
			"markdown"
		);

		expect(result).toBe('test/Test Video Title.md');
		expect(mockCreate).toHaveBeenCalledWith('test/Test Video Title.md', transcript);
	});

	it('should create a secondary file when primary file exists', async () => {
		fileMap.add('test/Test Video Title.md');
		const activeFile = createMockTFile('test/active.md');
		const videoTitle = 'Test Video Title';
		const transcript = 'This is a test transcript';

		const result = await simulateCreateTranscriptFile(
			mockGetAvailablePath,
			mockCreate,
			mockCreateBinary,
			activeFile,
			videoTitle,
			transcript,
			'https://www.youtube.com/watch?v=test123',
			false,
			"markdown"
		);

		expect(result).toBe('test/Test Video Title (1).md');
		expect(mockCreate).toHaveBeenCalledWith('test/Test Video Title (1).md', transcript);
	});

	it('should create file with incremented counter when multiple files exist', async () => {
		fileMap.add('test/Test Video Title.md');
		fileMap.add('test/Test Video Title (1).md');
		fileMap.add('test/Test Video Title (2).md');

		const activeFile = createMockTFile('test/active.md');
		const videoTitle = 'Test Video Title';
		const transcript = 'This is a test transcript';

		const result = await simulateCreateTranscriptFile(
			mockGetAvailablePath,
			mockCreate,
			mockCreateBinary,
			activeFile,
			videoTitle,
			transcript,
			'https://www.youtube.com/watch?v=test123',
			false,
			"markdown"
		);

		expect(result).toBe('test/Test Video Title (3).md');
		expect(mockCreate).toHaveBeenCalledWith('test/Test Video Title (3).md', transcript);
	});

	it('should handle files in root directory', async () => {
		const activeFile = createMockTFile('active.md'); // Root directory
		const videoTitle = 'Root Video';
		const transcript = 'Root transcript';

		const result = await simulateCreateTranscriptFile(
			mockGetAvailablePath,
			mockCreate,
			mockCreateBinary,
			activeFile,
			videoTitle,
			transcript,
			'https://www.youtube.com/watch?v=test123',
			false,
			"markdown"
		);

		expect(result).toBe('Root Video.md');
		expect(mockCreate).toHaveBeenCalledWith('Root Video.md', transcript);
	});

	it('should include video URL when includeVideoUrl is true', async () => {
		const activeFile = createMockTFile('test/active.md');
		const videoTitle = 'Test Video';
		const transcript = 'Transcript content';
		const videoUrl = 'https://www.youtube.com/watch?v=test123';

		const result = await simulateCreateTranscriptFile(
			mockGetAvailablePath,
			mockCreate,
			mockCreateBinary,
			activeFile,
			videoTitle,
			transcript,
			videoUrl,
			true,
			"markdown"
		);

		const expectedContent = `![${videoTitle}](${videoUrl})\n\n${transcript}`;
		expect(result).toBe('test/Test Video.md');
		expect(mockCreate).toHaveBeenCalledWith('test/Test Video.md', expectedContent);
	});

	it('should sanitize filename correctly', async () => {
		const activeFile = createMockTFile('test/active.md');
		const videoTitle = 'Video: Title <with> invalid/chars|?*';
		const transcript = 'Test transcript';

		const result = await simulateCreateTranscriptFile(
			mockGetAvailablePath,
			mockCreate,
			mockCreateBinary,
			activeFile,
			videoTitle,
			transcript,
			'https://www.youtube.com/watch?v=test123',
			false,
			"markdown"
		);

		// Should sanitize invalid characters
		expect(result).toMatch(/^test\/Video Title with invalidchars.*\.md$/);
		expect(mockCreate).toHaveBeenCalledWith(
			expect.stringMatching(/^test\/Video Title with invalidchars.*\.md$/),
			transcript
		);
	});

	it('should handle duplicate files by using getAvailablePath', async () => {
		// getAvailablePath handles duplicates automatically, so if a file exists,
		// it should return the next available path
		fileMap.add('test/Test Video Title.md');
		
		const activeFile = createMockTFile('test/active.md');
		const videoTitle = 'Test Video Title';
		const transcript = 'Test transcript';

		const result = await simulateCreateTranscriptFile(
			mockGetAvailablePath,
			mockCreate,
			mockCreateBinary,
			activeFile,
			videoTitle,
			transcript,
			'https://www.youtube.com/watch?v=test123',
			false,
			"markdown"
		);

		// Should create secondary file using getAvailablePath
		expect(result).toBe('test/Test Video Title (1).md');
		expect(mockCreate).toHaveBeenCalledWith('test/Test Video Title (1).md', transcript);
	});

	it('should handle error when create fails for non-existence reason', async () => {
		const errorGetAvailablePath: MockGetAvailablePath = vi.fn<MockGetAvailablePath>().mockReturnValue('test/Test Video.md');
		const errorCreate: MockCreate = vi.fn<MockCreate>().mockRejectedValue(new Error('Permission denied'));

		const activeFile = createMockTFile('test/active.md');
		const videoTitle = 'Test Video';
		const transcript = 'Test transcript';

		const errorCreateBinary: MockCreateBinary = vi.fn<MockCreateBinary>().mockRejectedValue(new Error('Permission denied'));

		await expect(
			simulateCreateTranscriptFile(
				errorGetAvailablePath,
				errorCreate,
				errorCreateBinary,
				activeFile,
				videoTitle,
				transcript,
				'https://www.youtube.com/watch?v=test123',
				false,
				"markdown"
			)
		).rejects.toThrow('Permission denied');
	});

	it('should handle very long filenames by truncating', async () => {
		const activeFile = createMockTFile('test/active.md');
		const videoTitle = 'a'.repeat(150); // Very long title
		const transcript = 'Test transcript';

		const result = await simulateCreateTranscriptFile(
			mockGetAvailablePath,
			mockCreate,
			mockCreateBinary,
			activeFile,
			videoTitle,
			transcript,
			'https://www.youtube.com/watch?v=test123',
			false,
			"markdown"
		);

		// Should truncate to 100 characters
		const filename = result.split('/').pop()?.replace('.md', '');
		expect(filename?.length).toBeLessThanOrEqual(100);
	});

	it('should handle nested directory paths correctly', async () => {
		fileMap.add('folder/subfolder/Test Video.md');
		const activeFile = createMockTFile('folder/subfolder/active.md');
		const videoTitle = 'Test Video';
		const transcript = 'Test transcript';

		const result = await simulateCreateTranscriptFile(
			mockGetAvailablePath,
			mockCreate,
			mockCreateBinary,
			activeFile,
			videoTitle,
			transcript,
			'https://www.youtube.com/watch?v=test123',
			false,
			"markdown"
		);

		expect(result).toBe('folder/subfolder/Test Video (1).md');
		expect(mockCreate).toHaveBeenCalledWith('folder/subfolder/Test Video (1).md', transcript);
	});

	it('should not overwrite existing files', async () => {
		fileMap.add('test/Test Video.md');
		const activeFile = createMockTFile('test/active.md');
		const videoTitle = 'Test Video';
		const transcript = 'New transcript content';

		const result = await simulateCreateTranscriptFile(
			mockGetAvailablePath,
			mockCreate,
			mockCreateBinary,
			activeFile,
			videoTitle,
			transcript,
			'https://www.youtube.com/watch?v=test123',
			false,
			"markdown"
		);

		// Should create (1) instead of modifying existing file
		expect(result).toBe('test/Test Video (1).md');
		expect(mockCreate).toHaveBeenCalledWith('test/Test Video (1).md', transcript);
		// Verify original file still exists (not modified)
		expect(fileMap.has('test/Test Video.md')).toBe(true);
	});

	it('should create PDF file when fileFormat is pdf', async () => {
		const activeFile = createMockTFile('test/active.md');
		const videoTitle = 'Test Video';
		const transcript = 'This is a test transcript';
		const videoUrl = 'https://www.youtube.com/watch?v=test123';

		const result = await simulateCreateTranscriptFile(
			mockGetAvailablePath,
			mockCreate,
			mockCreateBinary,
			activeFile,
			videoTitle,
			transcript,
			videoUrl,
			false,
			"pdf"
		);

		expect(result).toBe('test/Test Video.pdf');
		expect(mockCreateBinary).toHaveBeenCalledWith(
			'test/Test Video.pdf',
			expect.any(ArrayBuffer)
		);
		expect(mockCreate).not.toHaveBeenCalled();
	});

	it('should create markdown file when fileFormat is markdown', async () => {
		const activeFile = createMockTFile('test/active.md');
		const videoTitle = 'Test Video';
		const transcript = 'This is a test transcript';
		const videoUrl = 'https://www.youtube.com/watch?v=test123';

		const result = await simulateCreateTranscriptFile(
			mockGetAvailablePath,
			mockCreate,
			mockCreateBinary,
			activeFile,
			videoTitle,
			transcript,
			videoUrl,
			false,
			"markdown"
		);

		expect(result).toBe('test/Test Video.md');
		expect(mockCreate).toHaveBeenCalledWith('test/Test Video.md', transcript);
		expect(mockCreateBinary).not.toHaveBeenCalled();
	});

	it('should handle duplicate PDF files', async () => {
		fileMap.add('test/Test Video.pdf');
		const activeFile = createMockTFile('test/active.md');
		const videoTitle = 'Test Video';
		const transcript = 'This is a test transcript';

		const result = await simulateCreateTranscriptFile(
			mockGetAvailablePath,
			mockCreate,
			mockCreateBinary,
			activeFile,
			videoTitle,
			transcript,
			'https://www.youtube.com/watch?v=test123',
			false,
			"pdf"
		);

		expect(result).toBe('test/Test Video (1).pdf');
		expect(mockCreateBinary).toHaveBeenCalledWith(
			'test/Test Video (1).pdf',
			expect.any(ArrayBuffer)
		);
	});

	it('should use correct extension based on format', async () => {
		const activeFile = createMockTFile('test/active.md');
		const videoTitle = 'Test Video';
		const transcript = 'Test transcript';

		// Test PDF format
		const pdfResult = await simulateCreateTranscriptFile(
			mockGetAvailablePath,
			mockCreate,
			mockCreateBinary,
			activeFile,
			videoTitle,
			transcript,
			'https://www.youtube.com/watch?v=test123',
			false,
			"pdf"
		);
		expect(pdfResult).toMatch(/\.pdf$/);

		// Test markdown format
		const mdResult = await simulateCreateTranscriptFile(
			mockGetAvailablePath,
			mockCreate,
			mockCreateBinary,
			activeFile,
			videoTitle,
			transcript,
			'https://www.youtube.com/watch?v=test123',
			false,
			"markdown"
		);
		expect(mdResult).toMatch(/\.md$/);
	});
});
