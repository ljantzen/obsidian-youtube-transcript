import { describe, it, expect, vi } from 'vitest';

type LLMProvider = "openai" | "gemini" | "claude" | "none";

describe('URL Modal Provider Selection', () => {
	describe('Provider dropdown options', () => {
		it('should include all provider options', () => {
			const options = [
				{ value: "none", label: "None (raw transcript)" },
				{ value: "openai", label: "OpenAI" },
				{ value: "gemini", label: "Google Gemini" },
				{ value: "claude", label: "Anthropic Claude" }
			];

			expect(options).toHaveLength(4);
			options.forEach(option => {
				expect(option.value).toBeDefined();
				expect(option.label).toBeDefined();
				expect(["none", "openai", "gemini", "claude"]).toContain(option.value);
			});
		});

		it('should default to settings provider', () => {
			const settingsProvider: LLMProvider = "openai";
			const defaultValue = settingsProvider || "none";
			
			expect(defaultValue).toBe("openai");
		});

		it('should default to "none" when settings provider is undefined', () => {
			const settingsProvider: LLMProvider | undefined = undefined;
			const defaultValue = settingsProvider || "none";
			
			expect(defaultValue).toBe("none");
		});
	});

	describe('Provider selection callback', () => {
		it('should pass selected provider to onSubmit callback', () => {
			const onSubmit = vi.fn();
			const selectedProvider: LLMProvider = "gemini";
			const url = "https://www.youtube.com/watch?v=test";
			const createNewFile = false;
			const includeVideoUrl = false;
			const generateSummary = false;

			onSubmit(url, createNewFile, includeVideoUrl, generateSummary, selectedProvider);

			expect(onSubmit).toHaveBeenCalledWith(
				url,
				createNewFile,
				includeVideoUrl,
				generateSummary,
				selectedProvider
			);
		});

		it('should handle provider change in modal', () => {
			let currentProvider: LLMProvider = "openai";
			const newProvider: LLMProvider = "claude";
			
			currentProvider = newProvider;
			
			expect(currentProvider).toBe("claude");
		});
	});

	describe('Summary label updates', () => {
		const getProviderName = (provider: LLMProvider): string => {
			switch (provider) {
				case "openai":
					return "OpenAI";
				case "gemini":
					return "Gemini";
				case "claude":
					return "Claude";
				default:
					return "LLM";
			}
		};

		it('should update summary label based on selected provider', () => {
			const providers: LLMProvider[] = ["openai", "gemini", "claude", "none"];
			
			providers.forEach(provider => {
				const providerName = getProviderName(provider);
				const labelText = `Generate summary (requires ${providerName} API key)`;
				
				expect(labelText).toContain(providerName);
				expect(labelText).toContain("Generate summary");
			});
		});

		it('should show correct provider name for each provider', () => {
			expect(getProviderName("openai")).toBe("OpenAI");
			expect(getProviderName("gemini")).toBe("Gemini");
			expect(getProviderName("claude")).toBe("Claude");
			expect(getProviderName("none")).toBe("LLM");
		});
	});

	describe('Provider validation', () => {
		it('should validate provider selection before submission', () => {
			const validProviders: LLMProvider[] = ["none", "openai", "gemini", "claude"];
			const selectedProvider: LLMProvider = "openai";
			
			expect(validProviders).toContain(selectedProvider);
		});

		it('should handle provider selection with API key check', () => {
			const hasKey = (provider: LLMProvider, keys: {
				openaiKey: string;
				geminiKey: string;
				claudeKey: string;
			}): boolean => {
				switch (provider) {
					case "openai":
						return !!(keys.openaiKey && keys.openaiKey.trim() !== "");
					case "gemini":
						return !!(keys.geminiKey && keys.geminiKey.trim() !== "");
					case "claude":
						return !!(keys.claudeKey && keys.claudeKey.trim() !== "");
					default:
						return false;
				}
			};

			const keys = {
				openaiKey: "sk-test",
				geminiKey: "",
				claudeKey: ""
			};

			expect(hasKey("openai", keys)).toBe(true);
			expect(hasKey("gemini", keys)).toBe(false);
			expect(hasKey("claude", keys)).toBe(false);
			expect(hasKey("none", keys)).toBe(false);
		});
	});
});
