import { describe, it, expect } from "vitest";

describe("Language Selection Settings", () => {
  it("should have preferredLanguage in default settings", () => {
    const defaultSettings = {
      preferredLanguage: "",
    };

    expect(typeof defaultSettings.preferredLanguage).toBe("string");
    expect(defaultSettings.preferredLanguage).toBe("");
  });

  it("should handle preferredLanguage setting as single language", () => {
    const settings = {
      preferredLanguage: "",
    };

    expect(settings.preferredLanguage).toBe("");

    settings.preferredLanguage = "en";
    expect(settings.preferredLanguage).toBe("en");

    settings.preferredLanguage = "es";
    expect(settings.preferredLanguage).toBe("es");

    settings.preferredLanguage = "";
    expect(settings.preferredLanguage).toBe("");
  });

  it("should handle preferredLanguage as comma-separated list", () => {
    const settings = {
      preferredLanguage: "",
    };

    settings.preferredLanguage = "en,es,fr";
    expect(settings.preferredLanguage).toBe("en,es,fr");

    settings.preferredLanguage = "es,fr";
    expect(settings.preferredLanguage).toBe("es,fr");
  });

  it("should normalize comma-separated language codes", () => {
    const input = "EN, ES , FR";
    const normalized = input
      .split(",")
      .map((lang) => lang.trim().toLowerCase())
      .filter((lang) => lang.length > 0)
      .join(",");

    expect(normalized).toBe("en,es,fr");
  });

  it("should handle language code case normalization", () => {
    const settings = {
      preferredLanguage: "EN",
    };

    // Normalize to lowercase
    const normalized = settings.preferredLanguage.toLowerCase();
    expect(normalized).toBe("en");
  });

  it("should filter out empty language codes", () => {
    const input = "en,,es, ,fr";
    const normalized = input
      .split(",")
      .map((lang) => lang.trim().toLowerCase())
      .filter((lang) => lang.length > 0)
      .join(",");

    expect(normalized).toBe("en,es,fr");
  });
});

describe("Language Selection Logic", () => {
  it("should select preferred language when available", () => {
    const captionTracks = [
      { languageCode: "en", baseUrl: "url1" },
      { languageCode: "es", baseUrl: "url2" },
      { languageCode: "fr", baseUrl: "url3" },
    ];

    const preferredLanguageCode = "es";
    const selectedTrack = captionTracks.find(
      (track) => track.languageCode === preferredLanguageCode,
    );

    expect(selectedTrack).toBeDefined();
    expect(selectedTrack?.languageCode).toBe("es");
  });

  it("should try languages in order from comma-separated list", () => {
    const captionTracks = [
      { languageCode: "en", baseUrl: "url1" },
      { languageCode: "es", baseUrl: "url2" },
      { languageCode: "fr", baseUrl: "url3" },
    ];

    const preferredLanguageCode = "de,es,fr"; // de not available, es is
    const preferredLanguages = preferredLanguageCode
      .split(",")
      .map((lang) => lang.trim().toLowerCase())
      .filter((lang) => lang.length > 0);

    let selectedTrack: typeof captionTracks[0] | undefined;
    for (const langCode of preferredLanguages) {
      selectedTrack = captionTracks.find(
        (track) => track.languageCode === langCode,
      );
      if (selectedTrack) {
        break;
      }
    }

    expect(selectedTrack).toBeDefined();
    expect(selectedTrack?.languageCode).toBe("es"); // Second in list, first available
  });

  it("should use first available language from comma-separated list", () => {
    const captionTracks = [
      { languageCode: "en", baseUrl: "url1" },
      { languageCode: "fr", baseUrl: "url2" },
    ];

    const preferredLanguageCode = "de,it,fr"; // de and it not available, fr is
    const preferredLanguages = preferredLanguageCode
      .split(",")
      .map((lang) => lang.trim().toLowerCase())
      .filter((lang) => lang.length > 0);

    let selectedTrack: typeof captionTracks[0] | undefined;
    for (const langCode of preferredLanguages) {
      selectedTrack = captionTracks.find(
        (track) => track.languageCode === langCode,
      );
      if (selectedTrack) {
        break;
      }
    }

    expect(selectedTrack).toBeDefined();
    expect(selectedTrack?.languageCode).toBe("fr"); // Third in list, first available
  });

  it("should fallback when no languages in comma-separated list are available", () => {
    const captionTracks = [
      { languageCode: "en", baseUrl: "url1" },
      { languageCode: "es", baseUrl: "url2" },
    ];

    const preferredLanguageCode = "de,it,fr"; // None available
    const preferredLanguages = preferredLanguageCode
      .split(",")
      .map((lang) => lang.trim().toLowerCase())
      .filter((lang) => lang.length > 0);

    let selectedTrack: typeof captionTracks[0] | undefined;
    for (const langCode of preferredLanguages) {
      selectedTrack = captionTracks.find(
        (track) => track.languageCode === langCode,
      );
      if (selectedTrack) {
        break;
      }
    }

    // Should be undefined, will fallback to English
    expect(selectedTrack).toBeUndefined();
  });

  it("should fallback to English when preferred language not available", () => {
    const captionTracks = [
      { languageCode: "en", baseUrl: "url1" },
      { languageCode: "fr", baseUrl: "url2" },
      { languageCode: "de", baseUrl: "url3" },
    ];

    const preferredLanguageCode = "es"; // Not available
    let selectedTrack = captionTracks.find(
      (track) => track.languageCode === preferredLanguageCode,
    );

    // Fallback to English
    if (!selectedTrack) {
      selectedTrack = captionTracks.find(
        (track) => track.languageCode === "en",
      );
    }

    expect(selectedTrack).toBeDefined();
    expect(selectedTrack?.languageCode).toBe("en");
  });

  it("should fallback to first available when English not available", () => {
    const captionTracks = [
      { languageCode: "es", baseUrl: "url1" },
      { languageCode: "fr", baseUrl: "url2" },
      { languageCode: "de", baseUrl: "url3" },
    ];

    const preferredLanguageCode = null;
    let selectedTrack: typeof captionTracks[0] | undefined;

    // Try preferred (null)
    if (preferredLanguageCode) {
      selectedTrack = captionTracks.find(
        (track) => track.languageCode === preferredLanguageCode,
      );
    }

    // Fallback to English
    if (!selectedTrack) {
      selectedTrack = captionTracks.find(
        (track) => track.languageCode === "en",
      );
    }

    // Fallback to first available
    if (!selectedTrack) {
      selectedTrack = captionTracks[0];
    }

    expect(selectedTrack).toBeDefined();
    expect(selectedTrack?.languageCode).toBe("es");
  });

  it("should handle empty preferred language (auto-select)", () => {
    const captionTracks = [
      { languageCode: "en", baseUrl: "url1" },
      { languageCode: "es", baseUrl: "url2" },
    ];

    const preferredLanguageCode: string = "";
    let selectedTrack: typeof captionTracks[0] | undefined;

    if (preferredLanguageCode && preferredLanguageCode.trim() !== "") {
      selectedTrack = captionTracks.find(
        (track) => track.languageCode === preferredLanguageCode.trim(),
      );
    }

    // Fallback to English
    if (!selectedTrack) {
      selectedTrack = captionTracks.find(
        (track) => track.languageCode === "en",
      );
    }

    expect(selectedTrack).toBeDefined();
    expect(selectedTrack?.languageCode).toBe("en");
  });

  it("should handle whitespace in preferred language code", () => {
    const captionTracks = [
      { languageCode: "en", baseUrl: "url1" },
      { languageCode: "es", baseUrl: "url2" },
    ];

    const preferredLanguageCode = " es "; // With whitespace
    const trimmedCode = preferredLanguageCode.trim();
    const selectedTrack = captionTracks.find(
      (track) => track.languageCode === trimmedCode,
    );

    expect(selectedTrack).toBeDefined();
    expect(selectedTrack?.languageCode).toBe("es");
  });
});

describe("Language Code Validation", () => {
  it("should accept valid language codes", () => {
    const validCodes = ["en", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh"];

    validCodes.forEach((code) => {
      expect(typeof code).toBe("string");
      expect(code.length).toBeGreaterThan(0);
      expect(code.length).toBeLessThanOrEqual(3);
    });
  });

  it("should handle language code format", () => {
    const languageCode = "en";
    const normalized = languageCode.trim().toLowerCase();

    expect(normalized).toBe("en");
    expect(normalized.length).toBe(2);
  });
});

describe("Language Selection Priority", () => {
  it("should prioritize in correct order: preferred > English > first available", () => {
    const captionTracks = [
      { languageCode: "fr", baseUrl: "url1" },
      { languageCode: "en", baseUrl: "url2" },
      { languageCode: "de", baseUrl: "url3" },
    ];

    // Test 1: Preferred language available
    let preferred = "fr";
    let selected = captionTracks.find((t) => t.languageCode === preferred);
    expect(selected?.languageCode).toBe("fr");

    // Test 2: Preferred not available, should use English
    preferred = "es";
    selected = captionTracks.find((t) => t.languageCode === preferred);
    if (!selected) {
      selected = captionTracks.find((t) => t.languageCode === "en");
    }
    expect(selected?.languageCode).toBe("en");

    // Test 3: No preferred, no English, use first
    const tracksNoEnglish = [
      { languageCode: "fr", baseUrl: "url1" },
      { languageCode: "de", baseUrl: "url2" },
    ];
    // No preferred language (null)
    const preferred3: string | null = null;
    let selected3 = preferred3
      ? tracksNoEnglish.find((t) => t.languageCode === preferred3)
      : undefined;
    if (!selected3) {
      selected3 = tracksNoEnglish.find((t) => t.languageCode === "en");
    }
    if (!selected3) {
      selected3 = tracksNoEnglish[0];
    }
    expect(selected3?.languageCode).toBe("fr");
  });
});

describe("Language Names Mapping", () => {
  it("should map common language codes to names", () => {
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
    };

    expect(languageNames.en).toBe("English");
    expect(languageNames.es).toBe("Spanish");
    expect(languageNames.fr).toBe("French");
    expect(languageNames.de).toBe("German");
  });

  it("should handle unknown language codes", () => {
    const languageNames: Record<string, string> = {
      en: "English",
      es: "Spanish",
    };

    const unknownCode = "xx";
    const langName = languageNames[unknownCode] || unknownCode.toUpperCase();

    expect(langName).toBe("XX");
  });

  it("should format language display correctly", () => {
    const languageNames: Record<string, string> = {
      en: "English",
      es: "Spanish",
    };

    const langCode = "en";
    const langName = languageNames[langCode] || langCode.toUpperCase();
    const displayText = `${langName} (${langCode})`;

    expect(displayText).toBe("English (en)");
  });
});

describe("Language Selection Integration", () => {
  it("should use preferred language from settings when no modal selection", () => {
    const settings = {
      preferredLanguage: "es",
    };

    const modalLanguage = null;
    const languageToUse =
      modalLanguage !== null
        ? modalLanguage
        : settings.preferredLanguage && settings.preferredLanguage.trim() !== ""
        ? settings.preferredLanguage
        : null;

    expect(languageToUse).toBe("es");
  });

  it("should prioritize modal selection over settings", () => {
    const settings = {
      preferredLanguage: "es",
    };

    const modalLanguage = "fr";
    const languageToUse =
      modalLanguage !== null
        ? modalLanguage
        : settings.preferredLanguage && settings.preferredLanguage.trim() !== ""
        ? settings.preferredLanguage
        : null;

    expect(languageToUse).toBe("fr");
  });

  it("should use auto-select when both are empty", () => {
    const settings = {
      preferredLanguage: "",
    };

    const modalLanguage = null;
    const languageToUse =
      modalLanguage !== null
        ? modalLanguage
        : settings.preferredLanguage && settings.preferredLanguage.trim() !== ""
        ? settings.preferredLanguage
        : null;

    expect(languageToUse).toBeNull();
  });

  it("should handle empty string as auto-select in modal", () => {
    const modalLanguage = "";
    const languageCode = modalLanguage === "" ? null : modalLanguage;

    expect(languageCode).toBeNull();
  });

  it("should convert empty string to null for language code", () => {
    const testCases = [
      { input: "", expected: null },
      { input: "en", expected: "en" },
      { input: "es", expected: "es" },
      { input: null, expected: null },
    ];

    testCases.forEach(({ input, expected }) => {
      const result = input === "" ? null : input;
      expect(result).toBe(expected);
    });
  });
});

describe("Language Selection Edge Cases", () => {
  it("should handle single language available", () => {
    const captionTracks = [{ languageCode: "en", baseUrl: "url1" }];

    const preferredLanguageCode = "es"; // Not available
    let selectedTrack = captionTracks.find(
      (track) => track.languageCode === preferredLanguageCode,
    );

    if (!selectedTrack) {
      selectedTrack = captionTracks.find(
        (track) => track.languageCode === "en",
      );
    }

    if (!selectedTrack) {
      selectedTrack = captionTracks[0];
    }

    expect(selectedTrack).toBeDefined();
    expect(selectedTrack?.languageCode).toBe("en");
  });

  it("should handle case-insensitive language matching", () => {
    const captionTracks = [
      { languageCode: "en", baseUrl: "url1" },
      { languageCode: "es", baseUrl: "url2" },
    ];

    const preferredLanguageCode = "EN"; // Uppercase
    const normalized = preferredLanguageCode.trim().toLowerCase();
    const selectedTrack = captionTracks.find(
      (track) => track.languageCode === normalized,
    );

    expect(selectedTrack).toBeDefined();
    expect(selectedTrack?.languageCode).toBe("en");
  });

  it("should handle multiple languages with same code (should not happen, but test robustness)", () => {
    const captionTracks = [
      { languageCode: "en", baseUrl: "url1" },
      { languageCode: "en", baseUrl: "url2" }, // Duplicate
      { languageCode: "es", baseUrl: "url3" },
    ];

    const preferredLanguageCode = "en";
    const selectedTrack = captionTracks.find(
      (track) => track.languageCode === preferredLanguageCode,
    );

    expect(selectedTrack).toBeDefined();
    expect(selectedTrack?.languageCode).toBe("en");
    // Should return the first match
    expect(selectedTrack?.baseUrl).toBe("url1");
  });
});

describe("Comma-Separated Language List", () => {
  it("should parse comma-separated language list correctly", () => {
    const preferredLanguageCode = "en,es,fr";
    const preferredLanguages = preferredLanguageCode
      .split(",")
      .map((lang) => lang.trim().toLowerCase())
      .filter((lang) => lang.length > 0);

    expect(preferredLanguages).toEqual(["en", "es", "fr"]);
    expect(preferredLanguages.length).toBe(3);
  });

  it("should handle spaces in comma-separated list", () => {
    const preferredLanguageCode = "en, es , fr";
    const preferredLanguages = preferredLanguageCode
      .split(",")
      .map((lang) => lang.trim().toLowerCase())
      .filter((lang) => lang.length > 0);

    expect(preferredLanguages).toEqual(["en", "es", "fr"]);
  });

  it("should handle uppercase language codes in comma-separated list", () => {
    const preferredLanguageCode = "EN,ES,FR";
    const preferredLanguages = preferredLanguageCode
      .split(",")
      .map((lang) => lang.trim().toLowerCase())
      .filter((lang) => lang.length > 0);

    expect(preferredLanguages).toEqual(["en", "es", "fr"]);
  });

  it("should filter out empty values in comma-separated list", () => {
    const preferredLanguageCode = "en,,es, ,fr";
    const preferredLanguages = preferredLanguageCode
      .split(",")
      .map((lang) => lang.trim().toLowerCase())
      .filter((lang) => lang.length > 0);

    expect(preferredLanguages).toEqual(["en", "es", "fr"]);
    expect(preferredLanguages.length).toBe(3);
  });

  it("should handle single language in comma-separated format", () => {
    const preferredLanguageCode = "en";
    const preferredLanguages = preferredLanguageCode
      .split(",")
      .map((lang) => lang.trim().toLowerCase())
      .filter((lang) => lang.length > 0);

    expect(preferredLanguages).toEqual(["en"]);
    expect(preferredLanguages.length).toBe(1);
  });

  it("should try languages in order until one is found", () => {
    const captionTracks = [
      { languageCode: "en", baseUrl: "url1" },
      { languageCode: "es", baseUrl: "url2" },
      { languageCode: "fr", baseUrl: "url3" },
      { languageCode: "de", baseUrl: "url4" },
    ];

    const preferredLanguageCode = "it,de,es,fr"; // it not available, de is
    const preferredLanguages = preferredLanguageCode
      .split(",")
      .map((lang) => lang.trim().toLowerCase())
      .filter((lang) => lang.length > 0);

    let selectedTrack: typeof captionTracks[0] | undefined;
    for (const langCode of preferredLanguages) {
      selectedTrack = captionTracks.find(
        (track) => track.languageCode === langCode,
      );
      if (selectedTrack) {
        break;
      }
    }

    expect(selectedTrack).toBeDefined();
    expect(selectedTrack?.languageCode).toBe("de"); // Second in list, first available
  });

  it("should use first available language from ordered list", () => {
    const captionTracks = [
      { languageCode: "en", baseUrl: "url1" },
      { languageCode: "fr", baseUrl: "url2" },
    ];

    const preferredLanguageCode = "de,it,fr,es"; // de and it not available, fr is
    const preferredLanguages = preferredLanguageCode
      .split(",")
      .map((lang) => lang.trim().toLowerCase())
      .filter((lang) => lang.length > 0);

    let selectedTrack: typeof captionTracks[0] | undefined;
    for (const langCode of preferredLanguages) {
      selectedTrack = captionTracks.find(
        (track) => track.languageCode === langCode,
      );
      if (selectedTrack) {
        break;
      }
    }

    expect(selectedTrack).toBeDefined();
    expect(selectedTrack?.languageCode).toBe("fr"); // Third in list, first available
  });

  it("should fallback when no languages in list are available", () => {
    const captionTracks = [
      { languageCode: "en", baseUrl: "url1" },
      { languageCode: "es", baseUrl: "url2" },
    ];

    const preferredLanguageCode = "de,it,fr"; // None available
    const preferredLanguages = preferredLanguageCode
      .split(",")
      .map((lang) => lang.trim().toLowerCase())
      .filter((lang) => lang.length > 0);

    let selectedTrack: typeof captionTracks[0] | undefined;
    for (const langCode of preferredLanguages) {
      selectedTrack = captionTracks.find(
        (track) => track.languageCode === langCode,
      );
      if (selectedTrack) {
        break;
      }
    }

    expect(selectedTrack).toBeUndefined();
    // Will fallback to English
    const fallbackTrack = captionTracks.find(
      (track) => track.languageCode === "en",
    );
    expect(fallbackTrack).toBeDefined();
  });

  it("should stop at first match in ordered list", () => {
    const captionTracks = [
      { languageCode: "en", baseUrl: "url1" },
      { languageCode: "es", baseUrl: "url2" },
      { languageCode: "fr", baseUrl: "url3" },
    ];

    const preferredLanguageCode = "en,es,fr"; // All available, should stop at first
    const preferredLanguages = preferredLanguageCode
      .split(",")
      .map((lang) => lang.trim().toLowerCase())
      .filter((lang) => lang.length > 0);

    let selectedTrack: typeof captionTracks[0] | undefined;
    let iterations = 0;
    for (const langCode of preferredLanguages) {
      iterations++;
      selectedTrack = captionTracks.find(
        (track) => track.languageCode === langCode,
      );
      if (selectedTrack) {
        break;
      }
    }

    expect(selectedTrack).toBeDefined();
    expect(selectedTrack?.languageCode).toBe("en");
    expect(iterations).toBe(1); // Should stop after first match
  });

  it("should handle empty comma-separated list", () => {
    const preferredLanguageCode = "";
    const preferredLanguages = preferredLanguageCode
      .split(",")
      .map((lang) => lang.trim().toLowerCase())
      .filter((lang) => lang.length > 0);

    expect(preferredLanguages).toEqual([]);
    expect(preferredLanguages.length).toBe(0);
  });

  it("should handle list with only commas and spaces", () => {
    const preferredLanguageCode = ", , ,";
    const preferredLanguages = preferredLanguageCode
      .split(",")
      .map((lang) => lang.trim().toLowerCase())
      .filter((lang) => lang.length > 0);

    expect(preferredLanguages).toEqual([]);
    expect(preferredLanguages.length).toBe(0);
  });

  it("should normalize mixed case and spacing in comma-separated list", () => {
    const input = "EN, es ,FR, de";
    const normalized = input
      .split(",")
      .map((lang) => lang.trim().toLowerCase())
      .filter((lang) => lang.length > 0)
      .join(",");

    expect(normalized).toBe("en,es,fr,de");
  });

  it("should handle very long comma-separated list", () => {
    const preferredLanguageCode = "en,es,fr,de,it,pt,ru,ja,ko,zh,ar,hi";
    const preferredLanguages = preferredLanguageCode
      .split(",")
      .map((lang) => lang.trim().toLowerCase())
      .filter((lang) => lang.length > 0);

    expect(preferredLanguages.length).toBe(12);
    expect(preferredLanguages[0]).toBe("en");
    expect(preferredLanguages[11]).toBe("hi");
  });

  it("should preserve order in comma-separated list", () => {
    const preferredLanguageCode = "fr,de,es,en";
    const preferredLanguages = preferredLanguageCode
      .split(",")
      .map((lang) => lang.trim().toLowerCase())
      .filter((lang) => lang.length > 0);

    expect(preferredLanguages).toEqual(["fr", "de", "es", "en"]);
    // Order should be preserved
    expect(preferredLanguages[0]).toBe("fr");
    expect(preferredLanguages[1]).toBe("de");
    expect(preferredLanguages[2]).toBe("es");
    expect(preferredLanguages[3]).toBe("en");
  });
});
