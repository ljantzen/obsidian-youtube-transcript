# Prompt Migration

The default prompt changed in version 2.0.27. The earlier default asked for "complete sentences" and "proper grammar and sentence structure", which made models rewrite the transcript into something closer to a summary. The new default keeps the speaker's own words (see [LLM Processing](llm-processing.md#default-processing)).

## What happens when you upgrade

- **Unmodified default prompt**: If your saved prompt is exactly the earlier default (leading and trailing whitespace are ignored), it is replaced with the new default when the plugin loads. You don't need to do anything.
- **Empty prompt**: The new default is used.
- **Customized prompt**: Any change to the earlier default, even one added line, counts as a customization. Your prompt is left exactly as it is and keeps working as before.

## Checking which prompt you have

Open Settings → YouTube Transcript Settings → Processing prompt. If it starts with "Please process the following YouTube video transcript", you still have the earlier default or a customized version of it. The new default starts with "Please clean up the following YouTube video transcript".

## Switching a customized prompt to the new default

1. Copy any instructions of your own that you want to keep (for example, "Make sections where appropriate using markdown headings").
2. Clear the prompt field. The new default is used right away and is shown as the field's placeholder; it is saved as your prompt the next time the plugin loads.
3. To add your own instructions, paste the placeholder text into the field and add them as extra numbered items before the final paragraph.

Alternatively, edit your prompt in place: remove "Create an accurate and complete transcription with complete sentences" and "Ensure proper grammar and sentence structure", and add an instruction to keep the speaker's own words without paraphrasing or condensing.
