# Gemini Code Companion Context

This document provides context for the Gemini Code Companion to understand the obsidian-ytt project.

## Project Overview

This project is an Obsidian plugin that allows users to fetch and embed YouTube video transcripts directly in their notes. It is written in TypeScript and uses `esbuild` for bundling. The plugin supports fetching transcripts from various YouTube URL formats, and optionally processing them with OpenAI, Gemini, or Claude to clean up the content.

The project is structured as follows:

-   `src/`: Contains the main plugin source code.
    -   `main.ts`: The entry point of the plugin, responsible for initializing the plugin, registering commands, and setting up the UI.
    -   `youtube.ts`: Contains the logic for fetching YouTube transcripts.
    -   `llm/`: Contains the logic for interacting with LLM providers like OpenAI, Gemini, and Claude.
    -   `modals.ts`: Defines the modal dialogs used for user input.
    -   `settings.ts` and `settingsTab.ts`: Manage the plugin's settings.
-   `test/`: Contains the test suite, which uses `vitest`.

## Building and Running

### Development

To start the development server, run:

```bash
npm run dev
```

This will watch for changes and automatically rebuild the plugin.

### Building for Production

To build the plugin for production, run:

```bash
npm run build
```

This will create a `main.js` file in the project root.

### Testing

To run the test suite, use the following commands:

-   `npm test`: Run all tests once.
-   `npm run test:watch`: Run tests in watch mode.
-   `npm run test:coverage`: Run tests and generate a coverage report.

## Development Conventions

### Coding Style

The project uses ESLint for linting, and the configuration can be found in `eslint.config.js`. The coding style is consistent with modern TypeScript projects, using modules, async/await, and classes.

### Testing Practices

The project has a comprehensive test suite using `vitest`. Tests are located in the `test/` directory and are organized by function. The tests cover both unit and integration scenarios.

### Contribution Guidelines

There are no explicit contribution guidelines, but the `README.md` provides detailed instructions for development and testing. The presence of a `dependabot.yml` file indicates that the project uses Dependabot to keep dependencies up to date.
