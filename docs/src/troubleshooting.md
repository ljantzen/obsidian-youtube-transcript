# Troubleshooting

## Transcript not fetching

- Ensure the video has captions available
- Check your internet connection
- Try a different video to verify the plugin is working
- Check the console (F12) for error messages

## LLM processing not working

- Verify your API key is correct in Settings
- Check that you have credits available in your provider account
- Verify the selected model is available
- **For custom providers**: Test the endpoint URL in a browser or with curl to verify it's accessible
- **For local models**: Ensure the local server (Ollama, LM Studio) is running
- Review the console (F12) for error messages
- Check the timeout setting if requests are timing out
- **Rate limit errors on long videos**: Long videos are processed in several requests (see [Long Videos](long-videos.md)). If you hit rate limits, wait and retry (finished parts are kept) or use a plan with higher limits

## LLM-processed transcript is shorter than expected

- Some reduction is normal: the default prompt removes filler words, repetition, and promotional content
- If content is missing from the end of the video, check the console (F12) for warnings that a response was truncated
- **For custom providers**: Make sure the server reports `finish_reason: "length"` for cut-off responses, and that the model's context window can hold a part of about 12,000 characters plus the prompt
- A custom prompt that asks for a condensed or summarized version will shorten each part

## Timestamps not appearing

- Ensure "Include timestamps" is enabled in settings
- Verify the video has captions with timing information
- Check that timestamps aren't being removed by LLM processing (if "Include timestamps in LLM output" is disabled)

## File creation issues

- Ensure you have write permissions in the target directory
- Check that the video title doesn't contain invalid filename characters (these are automatically sanitized)
- Verify the default directory path is correct if using that option
- **PDF generation**: PDF format requires Electron API access (desktop app only). If PDF generation fails, try using Markdown format instead. PDF generation may also fail if the transcript is too large or if there are formatting issues.
- **Cover notes**: When "Create cover note" is enabled, PDF and SRT files will be automatically nested in subfolders. You can customize the cover note location using template variables like `{ChannelName}` to organize files by channel.

## Model selection issues

- Click the refresh button next to the model dropdown to fetch latest models
- Ensure your API key has access to the selected model
- Some models may require specific API access levels
