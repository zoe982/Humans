import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import security from "eslint-plugin-security";
import vitest from "@vitest/eslint-plugin";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    plugins: { security },
    rules: {
      // Security – all rules as errors
      ...Object.fromEntries(
        Object.entries(security.configs.recommended.rules).map(([key]) => [key, "error"]),
      ),

      // ── Anti-Gaming: Block coverage-suppression comments everywhere ────────
      // Prevents `/* istanbul ignore next */`, `/* c8 ignore */`, etc.
      // Every line must be reachable by real tests – no escape hatches.
      "no-warning-comments": [
        "error",
        { terms: ["istanbul ignore", "c8 ignore", "vitest ignore"], location: "anywhere" },
      ],

      // ── Type-Import / Export Discipline ──────────────────────────────────
      // Enforce `import type` wherever possible
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      // Enforce `export type` for type-only exports
      "@typescript-eslint/consistent-type-exports": [
        "error",
        { fixMixedExportsWithInlineTypeSpecifier: true },
      ],
      // Prevent `import type` that would emit a runtime side-effect
      "@typescript-eslint/no-import-type-side-effects": "error",

      // ── Strict Boolean / Condition Safety ────────────────────────────────
      // Disallow all implicit truthy/falsy coercions in boolean positions
      "@typescript-eslint/strict-boolean-expressions": [
        "error",
        {
          allowString: false,
          allowNumber: false,
          allowNullableObject: false,
          allowNullableBoolean: false,
          allowNullableString: false,
          allowNullableNumber: false,
          allowNullableEnum: false,
          allowAny: false,
        },
      ],

      // ── Exhaustiveness ───────────────────────────────────────────────────
      // Require all branches of a union/enum to be handled in switches
      "@typescript-eslint/switch-exhaustiveness-check": [
        "error",
        { requireDefaultForNonUnion: true },
      ],

      // ── Promise / Async Safety ───────────────────────────────────────────
      // Every function that returns a Promise must be declared async
      "@typescript-eslint/promise-function-async": "error",

      // ── Type-Assertion Safety ────────────────────────────────────────────
      // Disallow `value as T` when the cast cannot be verified by the type system
      "@typescript-eslint/no-unsafe-type-assertion": "error",

      // ── Immutability ─────────────────────────────────────────────────────
      // Class fields never reassigned after construction should be readonly
      "@typescript-eslint/prefer-readonly": "error",

      // ── Array Sort ───────────────────────────────────────────────────────
      // .sort() without a comparator is locale-dependent – always require one
      "@typescript-eslint/require-array-sort-compare": ["error", { ignoreStringArrays: false }],

      // ── Explicit Return Types ─────────────────────────────────────────────
      // Require explicit return types on all exported / named functions.
      // allowExpressions lets inline callbacks stay unannotated (Hono handlers, etc.)
      "@typescript-eslint/explicit-function-return-type": [
        "error",
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
          allowDirectConstAssertionInArrowFunctions: true,
        },
      ],
      // All exported function signatures must have explicit return types
      "@typescript-eslint/explicit-module-boundary-types": "error",

      // ── Misc Cleanups ─────────────────────────────────────────────────────
      // Use @ts-expect-error (self-documenting) instead of @ts-ignore
      "@typescript-eslint/prefer-ts-expect-error": "error",
      // Remove redundant namespace qualifiers
      "@typescript-eslint/no-unnecessary-qualifier": "error",
      // Avoid assigning parameter properties when the value is already set
      "@typescript-eslint/no-unnecessary-parameter-property-assignment": "error",
      // Empty module exports have no purpose
      "@typescript-eslint/no-useless-empty-export": "error",
      // void-returning functions must not return non-void values
      "@typescript-eslint/strict-void-return": "error",
    },
  },

  // ── Test files: vitest anti-gaming rules ─────────────────────────────────
  // These rules make it impossible to inflate coverage numbers through test tricks.
  {
    files: ["**/*.test.ts", "**/*.spec.ts", "**/test/**/*.ts", "**/__tests__/**/*.ts"],
    plugins: { vitest },
    rules: {
      // Anti-gaming: no .skip() / .todo() — every test must run
      "vitest/no-disabled-tests": "error",
      // Anti-gaming: no .only() — tests must not be selectively focused in CI
      "vitest/no-focused-tests": ["error", { fixable: false }],
      // Anti-gaming: every test must contain at least one expect() assertion
      "vitest/expect-expect": "error",
      // Anti-gaming: no assertions hidden inside if/else or try/catch
      "vitest/no-conditional-expect": "error",
      // Anti-gaming: no commented-out test blocks masking coverage gaps
      "vitest/no-commented-out-tests": "error",
      // Correctness: expect() must not appear outside a test / it / describe
      "vitest/no-standalone-expect": "error",
      // Correctness: no return statement in a test (silently swallows failures)
      "vitest/no-test-return-statement": "error",
      // Correctness: valid expect() call structure
      "vitest/valid-expect": "error",
      // Correctness: no duplicate test titles within a describe block
      "vitest/no-identical-title": "error",
      // Correctness: no duplicate beforeEach / afterEach hooks in the same block
      "vitest/no-duplicate-hooks": "error",
      // Anti-gaming: forces toStrictEqual over toEqual (catches type mismatches)
      "vitest/prefer-strict-equal": "error",
      // Anti-gaming: forces toBe for primitives (clearer intent)
      "vitest/prefer-to-be": "error",
      // Anti-gaming: prevents deprecated test method aliases
      "vitest/no-alias-methods": "error",
      // Structure: every test must be inside a describe block
      "vitest/require-top-level-describe": "error",
      // Structure: prevents excessive nesting (max 3 levels)
      "vitest/max-nested-describe": ["error", { max: 3 }],
    },
    languageOptions: {
      globals: {
        ...vitest.environments.env.globals,
      },
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
      // seed.ts is a Node.js script excluded from Workers tsconfig
      "**/seed.ts",
    ],
  },
);
