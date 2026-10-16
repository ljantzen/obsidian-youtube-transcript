# Custom Providers

You can configure custom LLM providers that use OpenAI-compatible API format, such as OpenRouter, Ollama, or LM Studio.

## Adding a Custom Provider

1. Go to Settings → YouTube Transcript Settings → Custom LLM Providers
2. Click "Add custom provider"
3. Fill in the configuration:
   - **Provider name**: A friendly name (e.g., "OpenRouter", "Local Ollama")
   - **API endpoint**: Full URL to the chat completions endpoint
   - **API key**: Your authentication token
   - **Model**: The model identifier to use
   - **Timeout**: Request timeout in minutes (default: 1)
   - **Custom headers** (optional): Additional HTTP headers (e.g., for OpenRouter)

## Example Configurations

**OpenRouter** (access 100+ models):
- Name: `OpenRouter`
- Endpoint: `https://openrouter.ai/api/v1/chat/completions`
- API Key: Your OpenRouter API key (from openrouter.ai)
- Model: `openai/gpt-4o-mini` (or any model from their catalog)
- Custom headers:
  - `HTTP-Referer`: Your site URL (optional, for ranking)
  - `X-Title`: Your app name (optional, for ranking)

**Ollama** (local models):
- Name: `Ollama`
- Endpoint: `http://localhost:11434/v1/chat/completions`
- API Key: `ollama` (any value works for local Ollama)
- Model: `llama3` (or any installed model)
- Timeout: 5 (local models may need more time)

**LM Studio** (local models):
- Name: `LM Studio`
- Endpoint: `http://localhost:1234/v1/chat/completions`
- API Key: `lm-studio` (any value works)
- Model: The model loaded in LM Studio
- Timeout: 5

## Using Custom Providers

1. After adding a custom provider, it will appear in the "LLM provider" dropdown
2. Select it like any built-in provider
3. Enable "Use LLM processing" to use it for transcripts
4. All retry logic and error handling works the same as built-in providers

## Requirements

- Custom providers must use OpenAI-compatible API format
- The API should accept requests with `model`, `messages`, and `temperature` fields
- The response should follow OpenAI's format with `choices[0].message.content`
- The response should set `choices[0].finish_reason` to `"length"` when output stops at the model's limit, as OpenAI does. This is how the plugin detects a cut-off response and splits the part. If a server doesn't report it, cut-off parts can't be detected.
