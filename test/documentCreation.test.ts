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
	activeFile: TFile,
	videoTitle: string,
	transcript: string,
	videoUrl: string,
	includeVideoUrl: boolean
): Promise<string> {
	const baseSanitizedTitle = sanitizeFilename(videoTitle);

	const activeFilePath = activeFile.path;
	const directory = activeFilePath.substring(
		0,
		activeFilePath.lastIndexOf('/')
	);

	// Use FileManager API to get an available path (handles duplicates automatically)
	const basePath = directory
		? `${directory}/${baseSanitizedTitle}.md`
		: `${baseSanitizedTitle}.md`;
	const newFilePath = getAvailablePath(basePath, "md");

	// Build file content
	const parts: string[] = [];
	if (includeVideoUrl) {
		parts.push(`![${videoTitle}](${videoUrl})`);
	}
	parts.push(transcript);
	const fileContent = parts.join('\n\n');

	// Create the file
	await create(newFilePath, fileContent);
	return newFilePath;
}

// Types for test mocks
type MockGetAvailablePath = (basePath: string, extension: string) => string;

type MockCreate = (path: string, content: string) => Promise<TFile>;

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
	let fileMap: Set<string>;

	beforeEach(() => {
		vi.clearAllMocks();
		fileMap = new Set<string>();
		// Mock getAvailablePath to handle duplicates by appending (1), (2), etc.
		mockGetAvailablePath = vi.fn<[string, string], string>().mockImplementation((basePath: string) => {
			if (!fileMap.has(basePath)) {
				return basePath;
			}
			// If file exists, find next available path
			const baseName = basePath.replace(/\.md$/, '');
			let counter = 1;
			let candidatePath = `${baseName} (${counter}).md`;
			while (fileMap.has(candidatePath)) {
				counter++;
				candidatePath = `${baseName} (${counter}).md`;
			}
			return candidatePath;
		});
		mockCreate = vi.fn<[string, string], Promise<TFile>>().mockImplementation(async (path: string) => {
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
			activeFile,
			videoTitle,
			transcript,
			videoUrl,
			false
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
			activeFile,
			videoTitle,
			transcript,
			'https://www.youtube.com/watch?v=test123',
			false
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
			activeFile,
			videoTitle,
			transcript,
			'https://www.youtube.com/watch?v=test123',
			false
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
			activeFile,
			videoTitle,
			transcript,
			'https://www.youtube.com/watch?v=test123',
			false
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
			activeFile,
			videoTitle,
			transcript,
			videoUrl,
			true
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
			activeFile,
			videoTitle,
			transcript,
			'https://www.youtube.com/watch?v=test123',
			false
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
			activeFile,
			videoTitle,
			transcript,
			'https://www.youtube.com/watch?v=test123',
			false
		);

		// Should create secondary file using getAvailablePath
		expect(result).toBe('test/Test Video Title (1).md');
		expect(mockCreate).toHaveBeenCalledWith('test/Test Video Title (1).md', transcript);
	});

	it('should handle error when create fails for non-existence reason', async () => {
		const errorGetAvailablePath: MockGetAvailablePath = vi.fn<[string, string], string>().mockReturnValue('test/Test Video.md');
		const errorCreate: MockCreate = vi.fn<[string, string], Promise<TFile>>().mockRejectedValue(new Error('Permission denied'));

		const activeFile = createMockTFile('test/active.md');
		const videoTitle = 'Test Video';
		const transcript = 'Test transcript';

		await expect(
			simulateCreateTranscriptFile(
				errorGetAvailablePath,
				errorCreate,
				activeFile,
				videoTitle,
				transcript,
				'https://www.youtube.com/watch?v=test123',
				false
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
			activeFile,
			videoTitle,
			transcript,
			'https://www.youtube.com/watch?v=test123',
			false
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
			activeFile,
			videoTitle,
			transcript,
			'https://www.youtube.com/watch?v=test123',
			false
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
			activeFile,
			videoTitle,
			transcript,
			'https://www.youtube.com/watch?v=test123',
			false
		);

		// Should create (1) instead of modifying existing file
		expect(result).toBe('test/Test Video (1).md');
		expect(mockCreate).toHaveBeenCalledWith('test/Test Video (1).md', transcript);
		// Verify original file still exists (not modified)
		expect(fileMap.has('test/Test Video.md')).toBe(true);
	});
});
