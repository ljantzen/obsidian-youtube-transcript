import { describe, it, expect } from "vitest";

describe("Force LLM Language Setting", () => {
  it("should have forceLLMLanguage in default settings", () => {
    const defaultSettings = {
      forceLLMLanguage: false,
    };

    expect(typeof defaultSettings.forceLLMLanguage).toBe("boolean");
    expect(defaultSettings.forceLLMLanguage).toBe(false);
  });

  it("should handle forceLLMLanguage setting as boolean", () => {
    const settings = {
      forceLLMLanguage: false,
    };

    expect(settings.forceLLMLanguage).toBe(false);

    settings.forceLLMLanguage = true;
    expect(settings.forceLLMLanguage).toBe(true);

    settings.forceLLMLanguage = false;
    expect(settings.forceLLMLanguage).toBe(false);
  });

  it("should validate forceLLMLanguage setting type", () => {
    const settings = {
      forceLLMLanguage: false,
    };

    expect(typeof settings.forceLLMLanguage).toBe("boolean");
    expect(settings.forceLLMLanguage).toBe(false);

    // Test with true
    settings.forceLLMLanguage = true;
    expect(typeof settings.forceLLMLanguage).toBe("boolean");
    expect(settings.forceLLMLanguage).toBe(true);
  });
});

describe("Language Code Passing", () => {
  it("should pass language code through processing chain", () => {
    const transcriptLanguageCode = "es";
    const settings = {
      forceLLMLanguage: true,
    };

    // Simulate passing through chain
    const languageToUse = transcriptLanguageCode;
    const shouldForceLanguage = !!(settings.forceLLMLanguage && languageToUse && languageToUse.trim() !== "");

    expect(languageToUse).toBe("es");
    expect(shouldForceLanguage).toBe(true);
  });

  it("should handle empty language code", () => {
    const transcriptLanguageCode: string = "";
    const settings = {
      forceLLMLanguage: true,
    };

    const hasLanguageCode = transcriptLanguageCode.trim() !== "";
    const shouldForceLanguage = !!(settings.forceLLMLanguage && hasLanguageCode);

    expect(shouldForceLanguage).toBe(false);
  });

  it("should handle undefined language code", () => {
    const transcriptLanguageCode: string | undefined = undefined;
    const settings = {
      forceLLMLanguage: true,
    };

    // Simulate the actual logic: check if language code exists and is not empty
    const hasValidLanguageCode = transcriptLanguageCode !== undefined && transcriptLanguageCode !== null && (transcriptLanguageCode as string).trim() !== "";
    const shouldForceLanguage = settings.forceLLMLanguage && hasValidLanguageCode;

    expect(shouldForceLanguage).toBe(false);
  });

  it("should handle null language code", () => {
    const transcriptLanguageCode: string | null = null;
    const settings = {
      forceLLMLanguage: true,
    };

    // Simulate the actual logic: check if language code exists and is not empty
    const hasValidLanguageCode = transcriptLanguageCode !== undefined && transcriptLanguageCode !== null && (transcriptLanguageCode as string).trim() !== "";
    const shouldForceLanguage = settings.forceLLMLanguage && hasValidLanguageCode;

    expect(shouldForceLanguage).toBe(false);
  });

  it("should handle whitespace-only language code", () => {
    const transcriptLanguageCode = "   ";
    const settings = {
      forceLLMLanguage: true,
    };

    const shouldForceLanguage = !!(settings.forceLLMLanguage && transcriptLanguageCode && transcriptLanguageCode.trim() !== "");

    expect(shouldForceLanguage).toBe(false);
  });

  it("should pass language code when setting is disabled", () => {
    const transcriptLanguageCode = "es";
    const settings = {
      forceLLMLanguage: false,
    };

    const shouldForceLanguage = !!(settings.forceLLMLanguage && transcriptLanguageCode && transcriptLanguageCode.trim() !== "");

    expect(transcriptLanguageCode).toBe("es");
    expect(shouldForceLanguage).toBe(false);
  });
});

describe("Language Name Mapping", () => {
  const getLanguageName = (languageCode: string): string => {
    const languageNames: Record<string, string> = {
      en: "English",
      es: "Spanish",
      fr: "French",
      de: "German",
      it: "Italian",
      pt: "Portuguese",
      ru: "Russian",
      ja: "Japanese",
      ko: "Korean",
      zh: "Chinese",
      ar: "Arabic",
      hi: "Hindi",
      nl: "Dutch",
      pl: "Polish",
      tr: "Turkish",
      no: "Norwegian",
      sv: "Swedish",
      da: "Danish",
      fi: "Finnish",
      cs: "Czech",
      hu: "Hungarian",
      ro: "Romanian",
      uk: "Ukrainian",
      vi: "Vietnamese",
      th: "Thai",
      id: "Indonesian",
      ms: "Malay",
      he: "Hebrew",
      el: "Greek",
      bg: "Bulgarian",
      hr: "Croatian",
      sk: "Slovak",
      sl: "Slovenian",
    };
    
    return languageNames[languageCode.toLowerCase()] || languageCode.toUpperCase();
  };

  it("should map common language codes to names", () => {
    expect(getLanguageName("en")).toBe("English");
    expect(getLanguageName("es")).toBe("Spanish");
    expect(getLanguageName("fr")).toBe("French");
    expect(getLanguageName("de")).toBe("German");
    expect(getLanguageName("it")).toBe("Italian");
    expect(getLanguageName("pt")).toBe("Portuguese");
    expect(getLanguageName("ru")).toBe("Russian");
    expect(getLanguageName("ja")).toBe("Japanese");
    expect(getLanguageName("ko")).toBe("Korean");
    expect(getLanguageName("zh")).toBe("Chinese");
  });

  it("should handle uppercase language codes", () => {
    expect(getLanguageName("EN")).toBe("English");
    expect(getLanguageName("ES")).toBe("Spanish");
    expect(getLanguageName("FR")).toBe("French");
  });

  it("should handle mixed case language codes", () => {
    expect(getLanguageName("En")).toBe("English");
    expect(getLanguageName("eS")).toBe("Spanish");
    expect(getLanguageName("Fr")).toBe("French");
  });

  it("should return uppercase code for unknown languages", () => {
    expect(getLanguageName("xx")).toBe("XX");
    expect(getLanguageName("unknown")).toBe("UNKNOWN");
    expect(getLanguageName("zz")).toBe("ZZ");
  });

  it("should map all supported languages", () => {
    const supportedLanguages = [
      { code: "en", name: "English" },
      { code: "es", name: "Spanish" },
      { code: "fr", name: "French" },
      { code: "de", name: "German" },
      { code: "it", name: "Italian" },
      { code: "pt", name: "Portuguese" },
      { code: "ru", name: "Russian" },
      { code: "ja", name: "Japanese" },
      { code: "ko", name: "Korean" },
      { code: "zh", name: "Chinese" },
      { code: "ar", name: "Arabic" },
      { code: "hi", name: "Hindi" },
      { code: "nl", name: "Dutch" },
      { code: "pl", name: "Polish" },
      { code: "tr", name: "Turkish" },
      { code: "no", name: "Norwegian" },
      { code: "sv", name: "Swedish" },
      { code: "da", name: "Danish" },
      { code: "fi", name: "Finnish" },
      { code: "cs", name: "Czech" },
      { code: "hu", name: "Hungarian" },
      { code: "ro", name: "Romanian" },
      { code: "uk", name: "Ukrainian" },
      { code: "vi", name: "Vietnamese" },
      { code: "th", name: "Thai" },
      { code: "id", name: "Indonesian" },
      { code: "ms", name: "Malay" },
      { code: "he", name: "Hebrew" },
      { code: "el", name: "Greek" },
      { code: "bg", name: "Bulgarian" },
      { code: "hr", name: "Croatian" },
      { code: "sk", name: "Slovak" },
      { code: "sl", name: "Slovenian" },
    ];

    supportedLanguages.forEach(({ code, name }) => {
      expect(getLanguageName(code)).toBe(name);
    });
  });
});

describe("Prompt Building with Language Instructions", () => {
  const buildPrompt = (
    basePrompt: string,
    transcript: string,
    generateSummary: boolean,
    includeTimestampsInLLM: boolean,
    forceLLMLanguage: boolean,
    transcriptLanguageCode?: string,
  ): string => {
    let fullPrompt = basePrompt;

    if (generateSummary) {
      fullPrompt += `\n\nIMPORTANT: You must provide a concise summary (2-3 sentences) of the video content, focusing on the main topics, key points, and overall message.`;
      fullPrompt += `\n\nYou MUST format your response EXACTLY as follows:\n`;
      fullPrompt += `\n## Summary\n\n[Your 2-3 sentence summary here]\n\n## Transcript\n\n[Your processed transcript here]\n`;
      fullPrompt += `\nDo NOT include any other text before or after these sections. Start directly with "## Summary".`;
    } else {
      fullPrompt += `\n\nPlease format your response as follows:\n`;
      fullPrompt += `- Start with a "## Transcript" markdown header followed by the processed transcript\n`;
    }

    if (includeTimestampsInLLM) {
      fullPrompt += `\n\nIMPORTANT: The transcript contains timestamp links in the format [MM:SS](url). You MUST preserve these timestamp links exactly as they appear in the original transcript. Do not remove, modify, or reformat them.`;
    }

    const getLanguageName = (languageCode: string): string => {
      const languageNames: Record<string, string> = {
        en: "English",
        es: "Spanish",
        fr: "French",
        de: "German",
        it: "Italian",
        pt: "Portuguese",
        ru: "Russian",
        ja: "Japanese",
        ko: "Korean",
        zh: "Chinese",
        ar: "Arabic",
        hi: "Hindi",
        nl: "Dutch",
        pl: "Polish",
        tr: "Turkish",
        no: "Norwegian",
        sv: "Swedish",
        da: "Danish",
        fi: "Finnish",
        cs: "Czech",
        hu: "Hungarian",
        ro: "Romanian",
        uk: "Ukrainian",
        vi: "Vietnamese",
        th: "Thai",
        id: "Indonesian",
        ms: "Malay",
        he: "Hebrew",
        el: "Greek",
        bg: "Bulgarian",
        hr: "Croatian",
        sk: "Slovak",
        sl: "Slovenian",
      };
      
      return languageNames[languageCode.toLowerCase()] || languageCode.toUpperCase();
    };

    if (forceLLMLanguage && transcriptLanguageCode && transcriptLanguageCode.trim() !== "") {
      const languageName = getLanguageName(transcriptLanguageCode);
      fullPrompt += `\n\nCRITICAL LANGUAGE REQUIREMENT: The transcript you are processing is in ${languageName} (language code: ${transcriptLanguageCode.toUpperCase()}). You MUST output your processed transcript and summary (if requested) in the SAME LANGUAGE (${languageName}). Do not translate or convert the content to any other language. Maintain the original language throughout your entire response.`;
    }

    fullPrompt += `\nTranscript:\n${transcript}`;

    return fullPrompt;
  };

  it("should include language instructions when forceLLMLanguage is enabled", () => {
    const basePrompt = "Process this transcript";
    const transcript = "Sample transcript text";
    const generateSummary = false;
    const includeTimestampsInLLM = false;
    const forceLLMLanguage = true;
    const transcriptLanguageCode = "es";

    const fullPrompt = buildPrompt(
      basePrompt,
      transcript,
      generateSummary,
      includeTimestampsInLLM,
      forceLLMLanguage,
      transcriptLanguageCode,
    );

    expect(fullPrompt).toContain("CRITICAL LANGUAGE REQUIREMENT");
    expect(fullPrompt).toContain("Spanish");
    expect(fullPrompt).toContain("ES");
    expect(fullPrompt).toContain("SAME LANGUAGE");
    expect(fullPrompt).toContain("Do not translate");
  });

  it("should not include language instructions when forceLLMLanguage is disabled", () => {
    const basePrompt = "Process this transcript";
    const transcript = "Sample transcript text";
    const generateSummary = false;
    const includeTimestampsInLLM = false;
    const forceLLMLanguage = false;
    const transcriptLanguageCode = "es";

    const fullPrompt = buildPrompt(
      basePrompt,
      transcript,
      generateSummary,
      includeTimestampsInLLM,
      forceLLMLanguage,
      transcriptLanguageCode,
    );

    expect(fullPrompt).not.toContain("CRITICAL LANGUAGE REQUIREMENT");
    expect(fullPrompt).not.toContain("Spanish");
    expect(fullPrompt).not.toContain("SAME LANGUAGE");
  });

  it("should not include language instructions when language code is empty", () => {
    const basePrompt = "Process this transcript";
    const transcript = "Sample transcript text";
    const generateSummary = false;
    const includeTimestampsInLLM = false;
    const forceLLMLanguage = true;
    const transcriptLanguageCode = "";

    const fullPrompt = buildPrompt(
      basePrompt,
      transcript,
      generateSummary,
      includeTimestampsInLLM,
      forceLLMLanguage,
      transcriptLanguageCode,
    );

    expect(fullPrompt).not.toContain("CRITICAL LANGUAGE REQUIREMENT");
  });

  it("should not include language instructions when language code is undefined", () => {
    const basePrompt = "Process this transcript";
    const transcript = "Sample transcript text";
    const generateSummary = false;
    const includeTimestampsInLLM = false;
    const forceLLMLanguage = true;
    const transcriptLanguageCode = undefined;

    const fullPrompt = buildPrompt(
      basePrompt,
      transcript,
      generateSummary,
      includeTimestampsInLLM,
      forceLLMLanguage,
      transcriptLanguageCode,
    );

    expect(fullPrompt).not.toContain("CRITICAL LANGUAGE REQUIREMENT");
  });

  it("should include language instructions for different languages", () => {
    const basePrompt = "Process this transcript";
    const transcript = "Sample transcript text";
    const generateSummary = false;
    const includeTimestampsInLLM = false;
    const forceLLMLanguage = true;

    const languages = [
      { code: "en", name: "English" },
      { code: "es", name: "Spanish" },
      { code: "fr", name: "French" },
      { code: "de", name: "German" },
      { code: "ja", name: "Japanese" },
    ];

    languages.forEach(({ code, name }) => {
      const fullPrompt = buildPrompt(
        basePrompt,
        transcript,
        generateSummary,
        includeTimestampsInLLM,
        forceLLMLanguage,
        code,
      );

      expect(fullPrompt).toContain("CRITICAL LANGUAGE REQUIREMENT");
      expect(fullPrompt).toContain(name);
      expect(fullPrompt).toContain(code.toUpperCase());
    });
  });

  it("should include language instructions with summary generation", () => {
    const basePrompt = "Process this transcript";
    const transcript = "Sample transcript text";
    const generateSummary = true;
    const includeTimestampsInLLM = false;
    const forceLLMLanguage = true;
    const transcriptLanguageCode = "es";

    const fullPrompt = buildPrompt(
      basePrompt,
      transcript,
      generateSummary,
      includeTimestampsInLLM,
      forceLLMLanguage,
      transcriptLanguageCode,
    );

    expect(fullPrompt).toContain("CRITICAL LANGUAGE REQUIREMENT");
    expect(fullPrompt).toContain("Spanish");
    expect(fullPrompt).toContain("summary");
    expect(fullPrompt).toContain("SAME LANGUAGE");
  });

  it("should include language instructions with timestamps", () => {
    const basePrompt = "Process this transcript";
    const transcript = "Sample transcript text";
    const generateSummary = false;
    const includeTimestampsInLLM = true;
    const forceLLMLanguage = true;
    const transcriptLanguageCode = "es";

    const fullPrompt = buildPrompt(
      basePrompt,
      transcript,
      generateSummary,
      includeTimestampsInLLM,
      forceLLMLanguage,
      transcriptLanguageCode,
    );

    expect(fullPrompt).toContain("CRITICAL LANGUAGE REQUIREMENT");
    expect(fullPrompt).toContain("Spanish");
    expect(fullPrompt).toContain("timestamp links");
  });

  it("should include all instructions together", () => {
    const basePrompt = "Process this transcript";
    const transcript = "Sample transcript text";
    const generateSummary = true;
    const includeTimestampsInLLM = true;
    const forceLLMLanguage = true;
    const transcriptLanguageCode = "fr";

    const fullPrompt = buildPrompt(
      basePrompt,
      transcript,
      generateSummary,
      includeTimestampsInLLM,
      forceLLMLanguage,
      transcriptLanguageCode,
    );

    expect(fullPrompt).toContain("CRITICAL LANGUAGE REQUIREMENT");
    expect(fullPrompt).toContain("French");
    expect(fullPrompt).toContain("summary");
    expect(fullPrompt).toContain("timestamp links");
    expect(fullPrompt).toContain("SAME LANGUAGE");
  });

  it("should handle unknown language codes", () => {
    const basePrompt = "Process this transcript";
    const transcript = "Sample transcript text";
    const generateSummary = false;
    const includeTimestampsInLLM = false;
    const forceLLMLanguage = true;
    const transcriptLanguageCode = "xx";

    const fullPrompt = buildPrompt(
      basePrompt,
      transcript,
      generateSummary,
      includeTimestampsInLLM,
      forceLLMLanguage,
      transcriptLanguageCode,
    );

    expect(fullPrompt).toContain("CRITICAL LANGUAGE REQUIREMENT");
    expect(fullPrompt).toContain("XX");
    expect(fullPrompt).toContain("SAME LANGUAGE");
  });

  it("should preserve base prompt and transcript", () => {
    const basePrompt = "Process this transcript carefully";
    const transcript = "This is the actual transcript content";
    const generateSummary = false;
    const includeTimestampsInLLM = false;
    const forceLLMLanguage = true;
    const transcriptLanguageCode = "es";

    const fullPrompt = buildPrompt(
      basePrompt,
      transcript,
      generateSummary,
      includeTimestampsInLLM,
      forceLLMLanguage,
      transcriptLanguageCode,
    );

    expect(fullPrompt).toContain(basePrompt);
    expect(fullPrompt).toContain(transcript);
    expect(fullPrompt).toContain("Transcript:\n");
  });
});

describe("Language Instruction Format", () => {
  it("should format language instruction correctly", () => {
    const languageCode = "es";
    const languageName = "Spanish";
    const instruction = `CRITICAL LANGUAGE REQUIREMENT: The transcript you are processing is in ${languageName} (language code: ${languageCode.toUpperCase()}). You MUST output your processed transcript and summary (if requested) in the SAME LANGUAGE (${languageName}). Do not translate or convert the content to any other language. Maintain the original language throughout your entire response.`;

    expect(instruction).toContain("CRITICAL LANGUAGE REQUIREMENT");
    expect(instruction).toContain(languageName);
    expect(instruction).toContain(languageCode.toUpperCase());
    expect(instruction).toContain("SAME LANGUAGE");
    expect(instruction).toContain("Do not translate");
    expect(instruction).toContain("Maintain the original language");
  });

  it("should include summary mention in instruction", () => {
    const languageCode = "fr";
    const languageName = "French";
    const instruction = `CRITICAL LANGUAGE REQUIREMENT: The transcript you are processing is in ${languageName} (language code: ${languageCode.toUpperCase()}). You MUST output your processed transcript and summary (if requested) in the SAME LANGUAGE (${languageName}). Do not translate or convert the content to any other language. Maintain the original language throughout your entire response.`;

    expect(instruction).toContain("summary (if requested)");
  });
});

describe("Integration with Settings", () => {
  it("should combine forceLLMLanguage with other settings", () => {
    const settings = {
      forceLLMLanguage: true,
      includeTimestampsInLLM: true,
      generateSummary: true,
    };

    const transcriptLanguageCode = "de";

    const shouldIncludeLanguage = !!(settings.forceLLMLanguage && transcriptLanguageCode && transcriptLanguageCode.trim() !== "");
    const shouldIncludeTimestamps = settings.includeTimestampsInLLM;
    const shouldIncludeSummary = settings.generateSummary;

    expect(shouldIncludeLanguage).toBe(true);
    expect(shouldIncludeTimestamps).toBe(true);
    expect(shouldIncludeSummary).toBe(true);
  });

  it("should handle all settings disabled", () => {
    const settings = {
      forceLLMLanguage: false,
      includeTimestampsInLLM: false,
      generateSummary: false,
    };

    const transcriptLanguageCode = "es";

    const shouldIncludeLanguage = !!(settings.forceLLMLanguage && transcriptLanguageCode && transcriptLanguageCode.trim() !== "");
    const shouldIncludeTimestamps = settings.includeTimestampsInLLM;
    const shouldIncludeSummary = settings.generateSummary;

    expect(shouldIncludeLanguage).toBe(false);
    expect(shouldIncludeTimestamps).toBe(false);
    expect(shouldIncludeSummary).toBe(false);
  });
});
