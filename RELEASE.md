# Release Process

This document describes how to create a new release for the YouTube Transcript plugin.

## Prerequisites

- Git configured with your GitHub credentials
- Node.js and npm installed
- All changes committed and pushed to the repository

## Steps to Create a Release

### 1. Update Version Numbers

Update the version in the following files:
- `manifest.json` - Update the `version` field
- `package.json` - Update the `version` field (optional, for npm)

You can use the version script:
```bash
npm run version
```

Or manually update:
- `manifest.json`: `"version": "0.1.0"` → `"version": "0.2.0"`
- `package.json`: `"version": "0.1.0"` → `"version": "0.2.0"`

### 2. Commit Version Changes

```bash
git add manifest.json package.json versions.json
git commit -m "Bump version to 0.2.0"
git push
```

### 3. Create and Push Tag

Create a tag matching the version (must start with `v`):
```bash
git tag v0.2.0
git push origin v0.2.0
```

### 4. GitHub Actions Will Automatically

- Build the plugin
- Create a GitHub release
- Upload release artifacts (main.js, manifest.json, styles.css, versions.json)

## Release Tag Format

Tags must follow the semantic versioning format with a `v` prefix:
- ✅ `v0.1.0`
- ✅ `v1.0.0`
- ✅ `v0.2.1`
- ❌ `0.1.0` (missing `v` prefix)
- ❌ `v1.0` (not semantic versioning)

## Manual Release (Alternative)

If you need to create a release manually:

1. Build the plugin:
   ```bash
   npm run build
   ```

2. Go to GitHub → Releases → Draft a new release

3. Create a new tag (e.g., `v0.2.0`)

4. Upload files:
   - `main.js`
   - `manifest.json`
   - `styles.css` (if present)
   - `versions.json` (if present)

5. Write release notes and publish

## Verifying the Release

After the GitHub Actions workflow completes:

1. Check the Actions tab to ensure the workflow succeeded
2. Go to Releases to see the new release
3. Verify all files are attached
4. Test the release by downloading and installing in Obsidian
