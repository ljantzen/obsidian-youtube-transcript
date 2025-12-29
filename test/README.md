# Test Suite for YouTube Transcript Plugin

This directory contains the test suite for the YouTube Transcript plugin.

## Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Test Structure

- `extractVideoId.test.ts` - Tests for video ID extraction from various URL formats
- `sanitizeFilename.test.ts` - Tests for filename sanitization
- `parseTranscript.test.ts` - Tests for XML transcript parsing (uses happy-dom for DOM APIs)
- `plugin.test.ts` - Tests for plugin initialization and settings
- `integration.test.ts` - Integration tests for complete workflows

## Test Environment

The tests use **happy-dom** as the DOM environment, which provides:
- Fast DOM implementation
- Better ES module compatibility
- No dependency conflicts
- Full support for DOMParser and XML parsing

## Test Coverage

The test suite covers:
- ✅ URL parsing and video ID extraction
- ✅ Filename sanitization
- ✅ XML transcript parsing
- ✅ Error handling
- ✅ Edge cases

## Adding New Tests

When adding new functionality:
1. Create a new test file or add to existing one
2. Follow the existing test structure
3. Use descriptive test names
4. Test both success and error cases
5. Run `npm test` to verify

## Mocking

For tests that require Obsidian APIs, we use mocks. The `plugin.test.ts` file shows examples of mocking Obsidian's App and PluginManifest types.
