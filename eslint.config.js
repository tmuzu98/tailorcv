// ESLint flat config for the whole monorepo.
// Shared rules for all TS; React rules apply only to apps/web.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/coverage/**",
      "**/playwright-report/**",
      "**/test-results/**",
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Defaults for all JS/TS files
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
      eqeqeq: ["error", "always"],
    },
  },

  // React frontend
  {
    files: ["apps/web/**/*.{ts,tsx}"],
    languageOptions: {
      globals: { ...globals.browser },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },

  // LLM provider boundary (D-69): only apps/api/src/llm/ may touch an LLM SDK or a concrete
  // client. Everything else depends on the LlmClient interface and createLlmClient(), so
  // switching providers (LLM_PROVIDER) never requires code changes outside src/llm/.
  {
    files: ["**/*.{ts,tsx}"],
    ignores: ["apps/api/src/llm/**", "**/*.test.{ts,tsx}", "**/tests/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@anthropic-ai/sdk",
              message: "Use the LlmClient interface from src/llm (provider boundary, D-69).",
            },
          ],
          patterns: [
            {
              group: ["@anthropic-ai/sdk/*", "openai", "openai/*", "ollama", "ollama/*"],
              message: "LLM SDKs may only be used inside apps/api/src/llm (D-69).",
            },
            {
              group: ["**/llm/AnthropicLlmClient", "**/llm/OllamaLlmClient"],
              message:
                "Don't depend on a concrete client: take an LlmClient, build it with createLlmClient() (D-69).",
            },
          ],
        },
      ],
    },
  },

  // Tests may be looser
  {
    files: ["**/*.test.{ts,tsx}", "**/tests/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "no-console": "off",
    },
  },

  // Must be last: turns off rules that conflict with Prettier
  prettier,
);
