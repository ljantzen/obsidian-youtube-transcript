// eslint.config.js
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import obsidianmd from "eslint-plugin-obsidianmd";

// obsidianmd's recommended config (and the type-checked TS strictness it
// pulls in) is only meaningful for the code that actually ships in the
// plugin bundle. Scope every sub-config to src/ so it doesn't also light up
// test files and build scripts.
const obsidianRecommendedForSrc = obsidianmd.configs.recommended.map((cfg) =>
  cfg.files?.includes("package.json")
    ? cfg
    : { ...cfg, files: ["src/**/*.ts"] },
);

export default defineConfig(
  {
    ignores: ["coverage/"],
  },
  ...obsidianRecommendedForSrc,
  {
    // The rule replaces (not merges) its default brand/acronym lists when
    // given options, so the defaults are copied here alongside our additions.
    // Keep in sync with eslint-plugin-obsidianmd's brands.js/acronyms.js.
    files: ["src/**/*.ts"],
    rules: {
      "obsidianmd/ui/sentence-case": ["warn", {
        brands: [
          "iOS", "iPadOS", "macOS", "Windows", "Android", "Linux",
          "Obsidian", "Obsidian Sync", "Obsidian Publish",
          "Google", "Gemini", "Vertex AI", "OpenAI", "GPT", "Anthropic", "Claude", "Cursor", "Microsoft",
          "Google Drive", "Dropbox", "OneDrive", "iCloud Drive",
          "YouTube", "Slack", "Discord", "Telegram", "WhatsApp", "Twitter", "X",
          "Readwise", "Zotero",
          "Excalidraw", "Mermaid",
          "Markdown", "LaTeX", "JavaScript", "TypeScript", "Node.js",
          "npm", "pnpm", "Yarn", "Git", "GitHub", "GitLab",
          "Anki", "CalDAV", "CardDAV", "Evernote", "IntelliJ IDEA", "Jekyll", "Logseq", "Notion",
          "PyCharm", "React", "Reddit", "Roam Research", "Svelte", "VS Code", "Visual Studio Code",
          "WebDAV", "WebStorm",
          // Project-specific additions
          "OpenRouter", "Ollama",
        ],
        acronyms: [
          "API", "HTTP", "HTTPS", "URL", "DNS", "TCP", "IP", "SSH", "TLS", "SSL", "FTP", "SFTP", "SMTP",
          "JSON", "XML", "HTML", "CSS", "PDF", "CSV", "YAML", "SQL", "PNG", "JPG", "JPEG", "GIF", "SVG",
          "2FA", "MFA", "OAuth", "JWT", "LDAP", "SAML",
          "SDK", "IDE", "CLI", "GUI", "CRUD", "SOAP",
          "CPU", "GPU", "RAM", "SSD", "USB",
          "UI", "OK",
          "RSS", "S3",
          "ID",
          "UUID", "GUID", "SHA", "MD5", "ASCII", "UTF-8", "UTF-16", "DOM", "CDN", "FAQ", "AI", "ML", "LLM",
          // Project-specific additions
          "SRT",
        ],
        // Literal example values (URLs, API key prefixes, model IDs, HTTP
        // header names, a pluralized acronym) that must keep their exact
        // casing rather than be treated as prose.
        ignoreRegex: [
          "https?://",
          "^sk-",
          "openai/gpt-4o-mini",
          "HTTP-Referer",
          "Transcripts or Notes/YouTube",
          "\\bURLs\\b",
        ],
      }],
    },
  },
  {
    files: ["**/*.ts"],
    extends: tseslint.configs.recommended,
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", {
        argsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
        destructuredArrayIgnorePattern: "^_",
        varsIgnorePattern: "^_",
      }],
    },
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
        ecmaVersion: 2018,
        sourceType: "module",
      },
    },
  },
);
