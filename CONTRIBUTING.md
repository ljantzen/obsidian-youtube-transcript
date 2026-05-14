# Contributing

## Setup

```bash
npm install
npm run dev   # watch mode — rebuilds on save
```

Link the plugin to your vault for manual testing:

```bash
VAULT=~/path/to/your/vault
ln -s "$(pwd)" "$VAULT/.obsidian/plugins/obsidian-youtube-transcript"
```

Then enable the plugin in Obsidian → Settings → Community plugins.

## Before submitting a PR

```bash
npm run lint        # ESLint — must pass with no warnings
npm run build       # TypeScript type-check + production build
npm test            # Vitest unit tests
```

`lint:fix` will auto-correct most style issues:

```bash
npm run lint:fix
```

## Code style

- TypeScript with strict ESLint rules (`typescript-eslint`). No `any`, no unsafe casts.
- No comments unless the *why* is non-obvious. Well-named identifiers carry the what.
- Keep changes focused — one concern per PR.

## Tests

Tests live in `test/`. Add or update tests for any logic change. Coverage report:

```bash
npm run test:coverage
```

## Releases

Maintainers handle releases. See [RELEASE.md](RELEASE.md) for the process.

## Issues & questions

Open a GitHub issue for bugs or feature requests. Please include the plugin version (Settings → Community plugins → YouTube Transcript), Obsidian version, and steps to reproduce.
