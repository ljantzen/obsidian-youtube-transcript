# Testing Guide for YouTube Transcript Plugin

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development mode**:
   ```bash
   npm run dev
   ```
   This watches for file changes and rebuilds automatically.

3. **Link plugin to Obsidian**:
   ```bash
   # Replace with your actual vault path
   VAULT_PATH="$HOME/Documents/Obsidian/MyVault"
   mkdir -p "$VAULT_PATH/.obsidian/plugins"
   ln -s "$(pwd)" "$VAULT_PATH/.obsidian/plugins/obsidian-youtube-transcript"
   ```

4. **Enable in Obsidian**:
   - Settings → Community plugins
   - Find "YouTube Transcript" → Enable

## Testing Checklist

### ✅ Basic Functionality
- [ ] Plugin loads without errors
- [ ] Ribbon icon appears
- [ ] Command palette shows "Fetch YouTube Transcript"
- [ ] URL modal opens when triggered
- [ ] Can enter YouTube URL
- [ ] Transcript is fetched and inserted

### ✅ URL Parsing
- [ ] Full URL: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
- [ ] Short URL: `https://youtu.be/dQw4w9WgXcQ`
- [ ] Embed URL: `https://www.youtube.com/embed/dQw4w9WgXcQ`
- [ ] Direct ID: `dQw4w9WgXcQ`

### ✅ OpenAI Integration
- [ ] Settings page shows OpenAI API key field
- [ ] Settings page shows prompt textarea
- [ ] Default prompt is pre-filled
- [ ] Can save OpenAI API key
- [ ] Can customize prompt
- [ ] Transcript is processed when API key is set
- [ ] Self-promotion is removed from processed transcripts
- [ ] Transcript formatting is improved

### ✅ Error Handling
- [ ] Invalid URL shows error message
- [ ] Video without captions shows error
- [ ] Invalid OpenAI key shows error
- [ ] Network errors are handled gracefully

### ✅ Settings
- [ ] Settings are persisted
- [ ] Settings tab displays correctly
- [ ] All fields are editable
- [ ] Changes are saved automatically

## Test Videos

Use these videos for testing:

1. **Video with captions**: Any popular YouTube video
   - Example: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`

2. **Video without captions**: Some videos don't have captions
   - Should show appropriate error message

3. **Video with self-promotion**: Educational/tutorial videos often have "like and subscribe"
   - Test that OpenAI removes these when configured

## Troubleshooting

### Plugin not appearing
- Check that files are in `.obsidian/plugins/obsidian-youtube-transcript/`
- Verify `main.js`, `manifest.json`, `styles.css` exist
- Check Obsidian console for errors (Help → Toggle Developer Tools)

### Build errors
- Run `npm install` again
- Check Node.js version (should be 16+)
- Delete `node_modules` and reinstall

### Transcript not fetching
- Check browser console for network errors
- Verify video has captions available
- Try a different video

### OpenAI not working
- Verify API key is correct
- Check API key has credits/quota
- Check browser console for API errors
- Verify prompt is not empty

## Development Tips

- Keep `npm run dev` running while developing
- Reload Obsidian (Ctrl/Cmd+R) after code changes
- Use Obsidian Developer Tools (Help → Toggle Developer Tools) to see console logs
- Check `main.js` is updated after TypeScript changes
