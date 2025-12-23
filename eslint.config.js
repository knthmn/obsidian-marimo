import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";

export default defineConfig([
  ...obsidianmd.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      // handled by TypeScript compiler
      "no-undef": "off",
      "obsidianmd/ui/sentence-case": [
        "error",
        {
          brands: ["Marimo"],
          ignoreWords: ["PYTHONDONTWRITEBYTECODE"],
        },
      ],
    },
  },
  {
    ignores: ["**/*.js", "**/*.mjs"],
  },
]);
