import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import security from "eslint-plugin-security";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    plugins: {
      security,
    },
    rules: {
      ...security.configs.recommended.rules,
      // Upgrade security warnings to errors
      ...Object.fromEntries(
        Object.entries(security.configs.recommended.rules).map(([key]) => [
          key,
          "error",
        ]),
      ),
    },
  },
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.svelte-kit/**",
      "**/.turbo/**",
      "**/coverage/**",
    ],
  },
);
