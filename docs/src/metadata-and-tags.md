# Metadata and Tags

## Channel Name Tagging

Automatically tag notes with the YouTube channel name:

1. Enable "Tag with channel name" in settings or the modal
2. Notes will be tagged with `#channel-name` at the top
3. Channel names are automatically sanitized to create valid Obsidian tags

## Video Metadata

The plugin automatically extracts and includes video metadata:

**In Markdown Files:**
- Metadata is included as YAML frontmatter at the top of the file
- Includes: title, url, videoId, channel, channelId, duration, views, published date, description, and more
- Fully searchable and queryable in Obsidian
- Choose which fields are written and rename their property keys in Settings → Frontmatter (see [Settings Reference](settings-reference.md#frontmatter-settings))

**In Cover Notes:**
- All metadata is available as template variables (see [Cover Notes](cover-notes.md))
- Use template variables to customize how metadata is displayed in cover notes
