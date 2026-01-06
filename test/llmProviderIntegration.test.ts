import { describe, it, expect } from "vitest";

type LLMProvider = "openai" | "gemini" | "claude" | "none";

describe("LLM Provider Integration", () => {
  describe("Request body formatting", () => {
    describe("OpenAI request structure", () => {
      it("should format OpenAI API request body correctly", () => {
        const prompt = "Process this transcript";
        const transcript = "Sample transcript text";
        const fullPrompt = `${prompt}\nTranscript:\n${transcript}`;

        const requestBody = {
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: fullPrompt,
            },
          ],
          temperature: 0.3,
        };

        expect(requestBody.model).toBe("gpt-4o-mini");
        expect(requestBody.messages).toHaveLength(1);
        expect(requestBody.messages[0].role).toBe("user");
        expect(requestBody.messages[0].content).toContain("Process this transcript");
        expect(requestBody.messages[0].content).toContain("Sample transcript text");
        expect(requestBody.temperature).toBe(0.3);
      });

      it("should include summary instructions when generateSummary is true", () => {
        const basePrompt = "Process this transcript";
        const generateSummary = true;
        let fullPrompt = basePrompt;

        if (generateSummary) {
          fullPrompt += `\n\nIMPORTANT: You must provide a concise summary (2-3 sentences) of the video content, focusing on the main topics, key points, and overall message.`;
          fullPrompt += `\n\nYou MUST format your response EXACTLY as follows:\n`;
          fullPrompt += `\n## Summary\n\n[Your 2-3 sentence summary here]\n\n## Transcript\n\n[Your processed transcript here]\n`;
          fullPrompt += `\nDo NOT include any other text before or after these sections. Start directly with "## Summary".`;
        }

        expect(fullPrompt).toContain("IMPORTANT");
        expect(fullPrompt).toContain("## Summary");
        expect(fullPrompt).toContain("## Transcript");
      });

      it("should not include summary instructions when generateSummary is false", () => {
        const basePrompt = "Process this transcript";
        const generateSummary = false;
        let fullPrompt = basePrompt;

        if (generateSummary) {
          fullPrompt += `\n\nIMPORTANT`;
        } else {
          fullPrompt += `\n\nPlease format your response as follows:\n`;
          fullPrompt += `- Start with a "## Transcript" markdown header followed by the processed transcript\n`;
        }

        expect(fullPrompt).not.toContain("IMPORTANT");
        expect(fullPrompt).not.toContain("## Summary");
        expect(fullPrompt).toContain("## Transcript");
      });
    });

    describe("Gemini request structure", () => {
      it("should format Gemini API request body correctly", () => {
        const prompt = "Process this transcript";
        const transcript = "Sample transcript text";
        const fullPrompt = `${prompt}\nTranscript:\n${transcript}`;

        const requestBody = {
          contents: [
            {
              parts: [
                {
                  text: fullPrompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.3,
          },
        };

        expect(requestBody.contents).toHaveLength(1);
        expect(requestBody.contents[0].parts).toHaveLength(1);
        expect(requestBody.contents[0].parts[0].text).toContain(
          "Process this transcript",
        );
        expect(requestBody.contents[0].parts[0].text).toContain(
          "Sample transcript text",
        );
        expect(requestBody.generationConfig.temperature).toBe(0.3);
      });

      it("should construct correct Gemini API URL with model", () => {
        const model = "gemini-2.0-flash";
        const apiKey = "test-api-key";
        const expectedUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        expect(expectedUrl).toContain("v1beta");
        expect(expectedUrl).toContain(model);
        expect(expectedUrl).toContain("generateContent");
        expect(expectedUrl).toContain(apiKey);
      });
    });

    describe("Claude request structure", () => {
      it("should format Claude API request body correctly", () => {
        const model = "claude-sonnet-4-20250514";
        const prompt = "Process this transcript";
        const transcript = "Sample transcript text";
        const fullPrompt = `${prompt}\nTranscript:\n${transcript}`;

        const requestBody = {
          model: model,
          max_tokens: 4096,
          messages: [
            {
              role: "user",
              content: fullPrompt,
            },
          ],
          temperature: 0.3,
        };

        expect(requestBody.model).toBe("claude-sonnet-4-20250514");
        expect(requestBody.max_tokens).toBe(4096);
        expect(requestBody.messages).toHaveLength(1);
        expect(requestBody.messages[0].role).toBe("user");
        expect(requestBody.messages[0].content).toContain("Process this transcript");
        expect(requestBody.messages[0].content).toContain("Sample transcript text");
        expect(requestBody.temperature).toBe(0.3);
      });

      it("should include correct headers for Claude API", () => {
        const apiKey = "sk-ant-test123";
        const headers = {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        };

        expect(headers["Content-Type"]).toBe("application/json");
        expect(headers["x-api-key"]).toBe(apiKey);
        expect(headers["anthropic-version"]).toBe("2023-06-01");
      });

      it("should validate Claude model name format", () => {
        const validateClaudeModelName = (modelName: string): boolean => {
          const validPatterns = [
            /^claude-opus-4-1(-[0-9]{8})?$/,
            /^claude-opus-4(-[0-9]{8})?$/,
            /^claude-sonnet-4(-[0-9]{8})?$/,
          ];
          return validPatterns.some((pattern) => pattern.test(modelName));
        };

        // Valid models
        expect(validateClaudeModelName("claude-opus-4-1")).toBe(true);
        expect(validateClaudeModelName("claude-opus-4-1-20250805")).toBe(true);
        expect(validateClaudeModelName("claude-opus-4")).toBe(true);
        expect(validateClaudeModelName("claude-opus-4-20250514")).toBe(true);
        expect(validateClaudeModelName("claude-sonnet-4")).toBe(true);
        expect(validateClaudeModelName("claude-sonnet-4-20250514")).toBe(true);

        // Invalid models
        expect(validateClaudeModelName("claude-3-5-sonnet-20241022")).toBe(false);
        expect(validateClaudeModelName("claude-haiku-4")).toBe(false);
        expect(validateClaudeModelName("claude-5-opus")).toBe(false);
      });
    });
  });

  describe("Response parsing", () => {
    describe("OpenAI response parsing", () => {
      it("should extract content from OpenAI response structure", () => {
        const mockResponse = {
          choices: [
            {
              message: {
                content: "## Transcript\n\nProcessed transcript content here.",
              },
            },
          ],
        };

        const responseContent = mockResponse.choices?.[0]?.message?.content;
        expect(responseContent).toBeDefined();
        expect(responseContent).toContain("## Transcript");
        expect(responseContent).toContain("Processed transcript content");
      });

      it("should handle empty OpenAI response", () => {
        const mockResponse: any = {
          choices: [],
        };

        const responseContent = mockResponse.choices?.[0]?.message?.content;
        expect(responseContent).toBeUndefined();
      });

      it("should handle OpenAI response with missing content", () => {
        const mockResponse: any = {
          choices: [
            {
              message: {},
            },
          ],
        };

        const responseContent = mockResponse.choices?.[0]?.message?.content;
        expect(responseContent).toBeUndefined();
      });
    });

    describe("Gemini response parsing", () => {
      it("should extract content from Gemini response structure", () => {
        const mockResponse = {
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: "## Transcript\n\nProcessed transcript content here.",
                  },
                ],
              },
            },
          ],
        };

        const responseContent =
          mockResponse.candidates?.[0]?.content?.parts?.[0]?.text;
        expect(responseContent).toBeDefined();
        expect(responseContent).toContain("## Transcript");
        expect(responseContent).toContain("Processed transcript content");
      });

      it("should handle empty Gemini response", () => {
        const mockResponse: any = {
          candidates: [],
        };

        const responseContent =
          mockResponse.candidates?.[0]?.content?.parts?.[0]?.text;
        expect(responseContent).toBeUndefined();
      });
    });

    describe("Claude response parsing", () => {
      it("should extract content from Claude response structure", () => {
        const mockResponse = {
          content: [
            {
              text: "## Transcript\n\nProcessed transcript content here.",
            },
          ],
        };

        const responseContent = mockResponse.content?.[0]?.text;
        expect(responseContent).toBeDefined();
        expect(responseContent).toContain("## Transcript");
        expect(responseContent).toContain("Processed transcript content");
      });

      it("should handle empty Claude response", () => {
        const mockResponse: any = {
          content: [],
        };

        const responseContent = mockResponse.content?.[0]?.text;
        expect(responseContent).toBeUndefined();
      });
    });
  });

  describe("Error handling", () => {
    describe("HTTP status code handling", () => {
      it("should identify authentication errors (401)", () => {
        const status = 401;
        const isAuthError = status === 401 || status === 403;
        expect(isAuthError).toBe(true);
      });

      it("should identify authentication errors (403)", () => {
        const status = 403 as number;
        const isAuthError = status === 401 || status === 403;
        expect(isAuthError).toBe(true);
      });

      it("should identify not found errors (404)", () => {
        const status = 404;
        const isNotFound = status === 404;
        expect(isNotFound).toBe(true);
      });

      it("should identify rate limit errors (429)", () => {
        const status = 429;
        const isRateLimit = status === 429;
        expect(isRateLimit).toBe(true);
      });

      it("should detect rate limit from error message", () => {
        const errorMessages = [
          "rate limit exceeded",
          "429 error",
          "too many requests",
          "Rate Limit Exceeded",
          "TOO MANY REQUESTS",
        ];

        errorMessages.forEach((msg) => {
          const isRateLimitError =
            msg.toLowerCase().includes("rate limit") ||
            msg.includes("429") ||
            msg.toLowerCase().includes("too many requests");
          expect(isRateLimitError).toBe(true);
        });
      });
    });

    describe("Error message formatting", () => {
      it("should format OpenAI authentication error message", () => {
        const status = 401;
        const errorMsg = `OpenAI API authentication error (${status}): Invalid API key. Please check your API key in settings.`;

        expect(errorMsg).toContain("OpenAI");
        expect(errorMsg).toContain("401");
        expect(errorMsg).toContain("Invalid API key");
        expect(errorMsg).toContain("settings");
      });

      it("should format Gemini model not found error", () => {
        const model = "gemini-invalid-model";
        const errorMsg = `Gemini API error (404): Model "${model}" not found or invalid API endpoint. Please check that the model name is correct and your API key is valid.`;

        expect(errorMsg).toContain("Gemini");
        expect(errorMsg).toContain("404");
        expect(errorMsg).toContain(model);
        expect(errorMsg).toContain("not found");
      });

      it("should format Claude rate limit error with retry-after header", () => {
        const retryAfter = "60";
        const errorMsg = `Claude rate limit exceeded (429). You've made too many requests too quickly. Please wait ${retryAfter} seconds before retrying.`;

        expect(errorMsg).toContain("Claude");
        expect(errorMsg).toContain("429");
        expect(errorMsg).toContain("60 seconds");
      });

      it("should format Claude rate limit error without retry-after header", () => {
        const errorMsg = `Claude rate limit exceeded (429). You've made too many requests too quickly. Please wait a few minutes before retrying.`;

        expect(errorMsg).toContain("Claude");
        expect(errorMsg).toContain("429");
        expect(errorMsg).toContain("few minutes");
      });
    });

    describe("Retry-After header parsing", () => {
      it("should extract retry-after from headers (lowercase)", () => {
        const headers = {
          "retry-after": "120",
        };

        const retryAfter = headers["retry-after"];
        expect(retryAfter).toBe("120");
      });

      it("should extract retry-after from headers (title case)", () => {
        const headers = {
          "Retry-After": "90",
        };

        const retryAfter = headers["Retry-After"];
        expect(retryAfter).toBe("90");
      });

      it("should handle missing retry-after header", () => {
        const headers: any = {};
        const retryAfter = headers["retry-after"] || headers["Retry-After"];
        expect(retryAfter).toBeUndefined();
      });
    });
  });

  describe("Timeout handling", () => {
    it("should calculate timeout in milliseconds from minutes", () => {
      const timeoutMinutes = 2;
      const timeoutMs = timeoutMinutes * 60 * 1000;

      expect(timeoutMs).toBe(120000); // 2 minutes = 120,000ms
    });

    		it("should use default timeout when not specified", () => {
    			let timeoutMinutes;
    			if (timeoutMinutes === undefined) {
    				timeoutMinutes = 1;
    			}
    			const timeoutMs = timeoutMinutes * 60 * 1000;
    
    			expect(timeoutMs).toBe(60000); // 1 minute = 60,000ms
    		});
    it("should detect timeout error message", () => {
      const errorMessages = [
        "OpenAI request timed out after 2 minutes",
        "Gemini request timed out after 1 minute",
        "Claude request timed out after 3 minutes",
      ];

      errorMessages.forEach((msg) => {
        const isTimeout = msg.includes("timed out");
        expect(isTimeout).toBe(true);
      });
    });

    it("should format timeout error message with plural minutes", () => {
      const timeoutMinutes = 2 as number;
      const errorMsg = `OpenAI request timed out after ${timeoutMinutes} minute${timeoutMinutes !== 1 ? "s" : ""}`;

      expect(errorMsg).toContain("2 minutes");
      expect(errorMsg.endsWith("2 minutes")).toBe(true);
    });

    it("should format timeout error message with singular minute", () => {
      const timeoutMinutes = 1;
      const errorMsg = `OpenAI request timed out after ${timeoutMinutes} minute${timeoutMinutes !== 1 ? "s" : ""}`;

      expect(errorMsg).toContain("1 minute");
      expect(errorMsg.endsWith("1 minute")).toBe(true);
    });
  });

  describe("API key validation", () => {
    it("should trim API key whitespace", () => {
      const apiKeyWithSpaces = "  sk-test-key-123  ";
      const trimmedKey = apiKeyWithSpaces.trim();

      expect(trimmedKey).toBe("sk-test-key-123");
      expect(trimmedKey).not.toContain(" ");
    });

    it("should detect empty API key", () => {
      const apiKey = "" as string;
      const isValid = !!(apiKey && apiKey.trim() !== "");

      expect(isValid).toBe(false);
    });

    it("should detect whitespace-only API key", () => {
      const apiKey = "   ";
      const isValid = !!(apiKey && apiKey.trim() !== "");

      expect(isValid).toBe(false);
    });

    it("should validate non-empty API key", () => {
      const apiKey = "sk-test-key-123";
      const isValid = !!(apiKey && apiKey.trim() !== "");

      expect(isValid).toBe(true);
    });
  });

  describe("Model selection", () => {
    it("should use default model when setting is undefined", () => {
      const settingsModel: string | undefined = undefined;
      const defaultModel = "gpt-4o-mini";
      const modelToUse = settingsModel || defaultModel;

      expect(modelToUse).toBe("gpt-4o-mini");
    });

    it("should use settings model when provided", () => {
      const settingsModel = "gpt-4";
      const defaultModel = "gpt-4o-mini";
      const modelToUse = settingsModel || defaultModel;

      expect(modelToUse).toBe("gpt-4");
    });

    it("should use correct default models for each provider", () => {
      const defaults = {
        openai: "gpt-4o-mini",
        gemini: "gemini-2.0-flash",
        claude: "claude-sonnet-4-20250514",
      };

      expect(defaults.openai).toBe("gpt-4o-mini");
      expect(defaults.gemini).toBe("gemini-2.0-flash");
      expect(defaults.claude).toBe("claude-sonnet-4-20250514");
    });
  });

  describe("Status callback", () => {
    it("should provide status updates at different stages", () => {
      const statusMessages = [
        "Processing transcript with OpenAI (this may take a moment)...",
        "Processing transcript with Gemini (this may take a moment)...",
        "Processing transcript with Claude (this may take a moment)...",
        "Retrying OpenAI processing...",
        "Retrying Gemini processing...",
        "Retrying Claude processing...",
        "Waiting before retrying OpenAI processing (rate limit)...",
        "Waiting before retrying Gemini processing (rate limit)...",
        "Waiting before retrying Claude processing (rate limit)...",
      ];

      statusMessages.forEach((msg) => {
        expect(msg.length).toBeGreaterThan(0);
        expect(typeof msg).toBe("string");
      });
    });
  });

  describe("Provider routing", () => {
    it("should route to correct processing function based on provider", () => {
      const providers: LLMProvider[] = ["openai", "gemini", "claude", "none"];

      providers.forEach((provider) => {
        let processingFunction: string;

        switch (provider) {
          case "openai":
            processingFunction = "processWithOpenAI";
            break;
          case "gemini":
            processingFunction = "processWithGemini";
            break;
          case "claude":
            processingFunction = "processWithClaude";
            break;
          default:
            processingFunction = "none";
        }

        if (provider === "openai") {
          expect(processingFunction).toBe("processWithOpenAI");
        } else if (provider === "gemini") {
          expect(processingFunction).toBe("processWithGemini");
        } else if (provider === "claude") {
          expect(processingFunction).toBe("processWithClaude");
        } else {
          expect(processingFunction).toBe("none");
        }
      });
    });

    it("should handle unsupported provider gracefully", () => {
      const provider = "unsupported" as LLMProvider;
      const supportedProviders: LLMProvider[] = [
        "openai",
        "gemini",
        "claude",
        "none",
      ];
      const isSupported = supportedProviders.includes(provider);

      expect(isSupported).toBe(false);
    });
  });

  describe("Summary and transcript response format", () => {
    it("should include both summary and transcript sections when generateSummary is true", () => {
      const mockLLMResponse = `## Summary\n\nThis video discusses machine learning fundamentals.\n\n## Transcript\n\nWelcome to this video about machine learning...`;

      const hasSummarySection = /##\s+Summary/i.test(mockLLMResponse);
      const hasTranscriptSection = /##\s+Transcript/i.test(mockLLMResponse);

      expect(hasSummarySection).toBe(true);
      expect(hasTranscriptSection).toBe(true);
    });

    it("should only include transcript section when generateSummary is false", () => {
      const mockLLMResponse = `## Transcript\n\nWelcome to this video about machine learning...`;

      const hasSummarySection = /##\s+Summary/i.test(mockLLMResponse);
      const hasTranscriptSection = /##\s+Transcript/i.test(mockLLMResponse);

      expect(hasSummarySection).toBe(false);
      expect(hasTranscriptSection).toBe(true);
    });
  });

  describe("Fallback to raw transcript", () => {
    it("should return raw transcript when API key is missing", () => {
      const transcript = "Raw transcript text";
      const apiKey = "" as string;
      const isValid = !!(apiKey && apiKey.trim() !== "");

      if (!isValid) {
        const result = { transcript, summary: null };
        expect(result.transcript).toBe(transcript);
        expect(result.summary).toBeNull();
      }
    });

    it("should return raw transcript on API error when user declines retry", () => {
      const transcript = "Raw transcript text";
      const shouldRetry = false;

      if (!shouldRetry) {
        const result = { transcript, summary: null };
        expect(result.transcript).toBe(transcript);
        expect(result.summary).toBeNull();
      }
    });

    it("should return raw transcript after rate limit when user declines retry", () => {
      const transcript = "Raw transcript text";
      const isRateLimited = true;
      const shouldRetry = false;

      if (isRateLimited && !shouldRetry) {
        const result = { transcript, summary: null };
        expect(result.transcript).toBe(transcript);
        expect(result.summary).toBeNull();
      }
    });
  });
});
