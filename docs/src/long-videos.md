# Long Videos

Models limit how much text a single response can contain, and they tend to shorten very long inputs on their own. Sending the transcript of a long video in one request would therefore return only part of it. To avoid this, long transcripts are processed in parts:

- **Splitting**: Transcripts longer than about 12,000 characters (roughly 15 minutes of speech) are split into parts at line breaks, sentence ends, or spaces. Each part is sent in its own request and the results are joined into one transcript.
- **Continuous structure**: Each part is sent with the headings used so far and the end of the previous part, so headings continue across parts instead of starting over. When the parts are joined, a repeated document title is turned into a section heading, and a heading that repeats the section the previous part ended in is removed.
- **Output limit detection**: If a response still stops at the model's output limit, that part is split in two and sent again.
- **Summary**: When a summary is requested, it is generated in a separate request from the full transcript.
- **Progress**: The status notice shows which part is being processed (e.g. "part 3 of 7").
- **Timeouts and retries**: The timeout applies to each request. If a request times out or is rate limited and you retry, parts that already finished are not sent again.

Short transcripts are still sent in a single request.

## Things to keep in mind

- A long video takes several requests (about one per 15 minutes of video, plus one for the summary), which uses more of your provider's rate limit and quota. Free tiers with low per-minute limits may trigger the rate-limit dialog on long videos.
- A custom prompt applies to every part. Instructions that concern the document as a whole, such as "start with a title", work best for short videos.
- Because the model sees each part separately, heading levels can still vary slightly between parts.
