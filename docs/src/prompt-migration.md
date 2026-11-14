# Prompt Migration

The default prompt changed in version 2.0.27. The earlier default asked for "complete sentences" and "proper grammar and sentence structure", which made models rewrite the transcript into something closer to a summary. The new default keeps the speaker's own words (see [LLM Processing](llm-processing.md#default-processing)).

## What happens when you upgrade

- **Unmodified default prompt**: If your saved prompt is exactly the earlier default (leading and trailing whitespace are ignored), it is replaced with the new default when the plugin loads. You don't need to do anything.
- **Empty prompt**: The new default is used.
- **Customized prompt**: Any change to the earlier default, even one added line, counts as a customization. Your prompt is left exactly as it is and keeps working as before.

## Checking which prompt you have

Since the introduction of [Saved Prompts](saved-prompts.md), your prompt is no longer a single settings field — a customized prompt from before that change shows up as a saved prompt named "Migrated prompt" in Settings → YouTube Transcript Settings → Saved prompts. Open it to check its text: if it starts with "Please process the following YouTube video transcript", it's the earlier default or a customized version of it. The current Default prompt (viewable but not editable in the same section) starts with "Please clean up the following YouTube video transcript".

## Switching a customized prompt to the new default

Edit your "Migrated prompt" entry (or any other saved prompt based on the earlier default) directly: remove "Create an accurate and complete transcription with complete sentences" and "Ensure proper grammar and sentence structure", and add an instruction to keep the speaker's own words without paraphrasing or condensing. Or delete it and rely on the built-in Default, optionally copying over any instructions of your own first (for example, "Make sections where appropriate using markdown headings") into a new saved prompt.
