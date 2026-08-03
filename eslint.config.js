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
