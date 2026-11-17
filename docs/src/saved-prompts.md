# Saved Prompts

Settings → YouTube Transcript Settings → LLM has a **Saved prompts** list, alongside the built-in, unmodifiable **Default** prompt (viewable but not editable from the same section):

- **Add a saved prompt**: Click "Add saved prompt", give it a name and the prompt text, and save
- **Edit or delete**: Click a saved prompt in the list to edit it, or use the delete control to remove it
- **Using a saved prompt**: The "Enter YouTube URL" dialog shows a prompt dropdown whenever more than one prompt is available (Default plus at least one saved prompt). Selecting one changes which prompt will be used for that fetch
- **One-off edits**: The prompt text itself is hidden by default to keep the dialog compact — check **Edit prompt for this fetch** to reveal an editable box loaded with the selected prompt's text. Editing it only affects this one fetch and doesn't change the saved prompt. If you want to keep the edit, a **Save as new prompt** option appears once you've changed the text, letting you save it as a new named prompt without losing your current fetch
- **"Fetch from clipboard"**: Since this command has no dialog, it uses whichever prompt was last selected or edited in the "Enter YouTube URL" dialog

If you customize a prompt, avoid instructions such as "use complete sentences" or "ensure proper grammar and sentence structure". Models tend to take them as permission to rewrite, and the transcript drifts toward a summary.

**Upgrading from an older version:** if you had customized the old single "Processing prompt" setting, that text is preserved automatically as a new saved prompt (named "Migrated prompt") and selected as active, so your existing fetch behavior is unchanged. The built-in Default itself is unaffected by this migration. See [Prompt Migration](prompt-migration.md) for details.
