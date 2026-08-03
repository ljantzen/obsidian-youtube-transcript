import { describe, it, expect } from "vitest";
import {
  normalizeVaultPath,
  normalizeFilesystemPath,
  normalizeFolderName,
  normalizeLanguageList,
  valueOrDefault,
  trimmedOrDefault,
  resolveClaudeModel,
  resolveDirectoryDeletion,
  resolveProviderDeletion,
} from "../src/utils";
import { DEFAULT_SETTINGS } from "../src/settings";
import type { CustomLLMProvider } from "../src/types";

describe("normalizeVaultPath", () => {
  it("strips leading and trailing slashes", () => {
    expect(normalizeVaultPath("/Transcripts/")).toBe("Transcripts");
  });

  it("converts backslashes to forward slashes", () => {
    expect(normalizeVaultPath("Notes\\YouTube")).toBe("Notes/YouTube");
  });

  it("trims whitespace", () => {
    expect(normalizeVaultPath("  Transcripts  ")).toBe("Transcripts");
  });

  it("leaves an already-normalized path untouched", () => {
    expect(normalizeVaultPath("Notes/YouTube")).toBe("Notes/YouTube");
  });
});

describe("normalizeFilesystemPath", () => {
  it("strips only the trailing slash, keeping a leading slash", () => {
    expect(normalizeFilesystemPath("/path/to/videos/")).toBe("/path/to/videos");
  });

  it("converts backslashes to forward slashes", () => {
    expect(normalizeFilesystemPath("C:\\videos\\")).toBe("C:/videos");
  });

  it("trims whitespace", () => {
    expect(normalizeFilesystemPath("  /path/to/videos  ")).toBe("/path/to/videos");
  });
});

describe("normalizeFolderName", () => {
  it("strips all slash characters", () => {
    expect(normalizeFolderName("nested/folder\\name")).toBe("nestedfoldername");
  });

  it("trims whitespace", () => {
    expect(normalizeFolderName("  attachments  ")).toBe("attachments");
  });
});

describe("normalizeLanguageList", () => {
  it("trims and lowercases each entry", () => {
    expect(normalizeLanguageList(" EN , Es ,FR ")).toBe("en,es,fr");
  });

  it("drops empty entries", () => {
    expect(normalizeLanguageList("en,,es,")).toBe("en,es");
  });

  it("returns an empty string for empty input", () => {
    expect(normalizeLanguageList("")).toBe("");
  });
});

describe("valueOrDefault", () => {
  it("returns the value when non-empty", () => {
    expect(valueOrDefault("My Note", "{VideoName}")).toBe("My Note");
  });

  it("returns the fallback for an empty string", () => {
    expect(valueOrDefault("", "{VideoName}")).toBe("{VideoName}");
  });

  it("does not trim whitespace-only input", () => {
    expect(valueOrDefault("   ", "{VideoName}")).toBe("   ");
  });
});

describe("trimmedOrDefault", () => {
  it("returns the trimmed value when non-empty", () => {
    expect(trimmedOrDefault("  myProp  ", "url")).toBe("myProp");
  });

  it("returns the fallback for an empty or whitespace-only string", () => {
    expect(trimmedOrDefault("   ", "url")).toBe("url");
    expect(trimmedOrDefault("", "url")).toBe("url");
  });
});

describe("resolveClaudeModel", () => {
  const fallback = DEFAULT_SETTINGS.claudeModel;

  it("falls back to the default for empty input", () => {
    expect(resolveClaudeModel("", fallback)).toEqual({ value: fallback });
  });

  it("falls back to the default for whitespace-only input", () => {
    expect(resolveClaudeModel("   ", fallback)).toEqual({ value: fallback });
  });

  it("accepts a valid trimmed model name", () => {
    expect(resolveClaudeModel("  claude-opus-4-1-20250805  ", fallback)).toEqual({
      value: "claude-opus-4-1-20250805",
    });
  });

  it("rejects an invalid model name with an error message", () => {
    const result = resolveClaudeModel("gpt-4o", fallback);
    expect(result.value).toBe("gpt-4o");
    expect(result.error).toContain("Invalid Claude model name");
  });
});

describe("resolveDirectoryDeletion", () => {
  it("removes the directory at the given index", () => {
    const result = resolveDirectoryDeletion(["A", "B", "C"], null, 1);
    expect(result.savedDirectories).toEqual(["A", "C"]);
  });

  it("clears defaultDirectory when the deleted entry was the default", () => {
    const result = resolveDirectoryDeletion(["A", "B", "C"], "B", 1);
    expect(result.savedDirectories).toEqual(["A", "C"]);
    expect(result.defaultDirectory).toBeNull();
  });

  it("leaves defaultDirectory untouched when a non-default entry is deleted", () => {
    const result = resolveDirectoryDeletion(["A", "B", "C"], "C", 1);
    expect(result.savedDirectories).toEqual(["A", "C"]);
    expect(result.defaultDirectory).toBe("C");
  });
});

describe("resolveProviderDeletion", () => {
  const providers: CustomLLMProvider[] = [
    { id: "custom-1", name: "OpenRouter", endpoint: "https://example.com", apiKey: "k", model: "m", timeout: 1 },
    { id: "custom-2", name: "Ollama", endpoint: "https://example2.com", apiKey: "k2", model: "m2", timeout: 1 },
  ];

  it("removes the provider with the matching id", () => {
    const result = resolveProviderDeletion(providers, "openai", "custom-1");
    expect(result.customProviders.map((p) => p.id)).toEqual(["custom-2"]);
  });

  it("resets llmProvider to openai when the deleted provider was selected", () => {
    const result = resolveProviderDeletion(providers, "custom-1", "custom-1");
    expect(result.llmProvider).toBe("openai");
  });

  it("leaves llmProvider untouched when a non-selected provider is deleted", () => {
    const result = resolveProviderDeletion(providers, "custom-2", "custom-1");
    expect(result.llmProvider).toBe("custom-2");
  });
});
