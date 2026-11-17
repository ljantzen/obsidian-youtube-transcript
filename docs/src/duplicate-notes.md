# Preventing Duplicate Notes

The plugin can check whether a transcript for the same video already exists in your vault before fetching:

1. Enable "Prevent duplicate notes" in Settings → YouTube Transcript Settings → File Creation
2. Set "Duplicate check property" to the YAML frontmatter key that holds the video URL or ID (default: `url`)
3. As soon as the "Enter YouTube URL" dialog recognizes a video ID in the URL field — typed, pasted, or prefilled from the clipboard or editor selection — the plugin searches all markdown files in your vault for a note whose frontmatter property matches that video
4. If a match is found, the dialog shows a warning with a link to the existing note and disables "Fetch transcript", so you find out before filling in the rest of the form
5. The same check runs again when you submit, as a safety net, in case the match only appeared afterward (e.g. "Create new file" was off until just now) — if it fires there, a notice shows the existing note's name and the operation is cancelled with no network request made

## How matching works

- The frontmatter property value can be a full YouTube URL (`https://www.youtube.com/watch?v=VIDEO_ID`), a short URL (`https://youtu.be/VIDEO_ID`), or a bare video ID
- All formats resolve to the same video ID for comparison, so different URL formats won't cause false negatives

## Notes

- The check only applies when "Create new file" is enabled — inserting into an existing note always proceeds
- Only markdown files are checked; PDF and SRT files are not
- The check uses Obsidian's in-memory metadata cache, so it adds no meaningful delay before the network request
