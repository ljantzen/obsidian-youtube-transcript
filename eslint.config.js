// eslint.config.js
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig(
  {
    ignores: ["coverage/"],
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
