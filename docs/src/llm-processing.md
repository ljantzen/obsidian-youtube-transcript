# LLM Processing

The plugin supports multiple LLM providers for cleaning and processing transcripts.

## Built-in Providers

1. **OpenAI** - e.g. GPT-4o Mini, GPT-4o
2. **Google Gemini** - e.g. Gemini 3 Pro, Gemini 3 Flash, Gemini 2.0 Flash
3. **Anthropic Claude** - e.g. Claude Opus 5, Claude Sonnet 5, Claude Haiku 4.5

The model list for each built-in provider is fetched from the provider's API, so any model available to your API key can be selected, including models released after this plugin version.

For custom OpenAI-compatible providers (OpenRouter, Ollama, LM Studio, etc.), see [Custom Providers](custom-providers.md).

## Setup

1. Go to Settings → YouTube Transcript Settings
2. Select your preferred LLM provider
3. Enter your API key for the selected provider
4. Choose a model (models are automatically fetched from the provider's API)
5. Optionally customize the processing prompt

## Processing Options

- **Use LLM processing**: Toggle in the modal to enable/disable LLM processing for individual transcripts (even if a provider is configured)
- **Custom prompt**: Modify the default prompt to change how transcripts are processed
- **Generate summary**: When enabled, the LLM will generate a 2-3 sentence summary of the video
- **Include timestamps in LLM output**: Preserve timestamps when processing with LLM
- **Force LLM output language**: When enabled, the LLM will be instructed to output in the same language as the selected transcript language, preventing unwanted translations

**Note**: If no LLM providers are configured (no API keys), LLM-related options will be hidden from the modal to keep the interface clean.

## Default Processing

The default prompt cleans up the transcript while keeping the speaker's own words: it adds punctuation, capitalization, and paragraph breaks, fixes obvious transcription errors, and removes filler words and promotional content. It tells the model not to paraphrase, summarize, or condense, so the result reads like an edited transcript rather than an article about the video.

If you customize the prompt, avoid instructions such as "use complete sentences" or "ensure proper grammar and sentence structure". Models tend to take them as permission to rewrite, and the transcript drifts toward a summary. To get the current default back, clear the prompt field.

See [Prompt Migration](prompt-migration.md) if you're upgrading from an older version of the plugin and want to know what changed.

## Summary Generation

When enabled, the plugin can generate concise summaries of video content:

1. Enable "Generate summary" in settings or the modal
2. Ensure an LLM provider is configured with a valid API key
3. The summary will appear at the top of the transcript with a "## Summary" header

For long videos, the summary is generated in a separate request after the transcript parts (see [Long Videos](long-videos.md)).
