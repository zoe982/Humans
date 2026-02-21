import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import path from "node:path";

// Web test strategy:
//   Unit tests      – pure TS/JS logic (stores, utilities, validators)
//   UI / Component  – Svelte components via @testing-library/svelte in happy-dom
//   Integration     – SvelteKit load functions and form actions (server-side)
//   E2E             – Playwright (`pnpm test:e2e`) — not counted here
//
// Coverage is measured by istanbul across all source files (all: true) so
// files with zero imports from test suites still appear as uncovered.

export default defineConfig({
  plugins: [
    svelte({
      // Disable HMR when running under vitest
      hot: !process.env["VITEST"],
      // Needed so Svelte compiles components for the test environment
      compilerOptions: { css: "injected" },
      // Skip vitePreprocess CSS pipeline — it requires a full Vite environment
      // that isn't available in the test runner context
      preprocess: [],
    }),
  ],
  resolve: {
    // Force Svelte 5 to use its browser (client) bundle in tests
    conditions: ["browser"],
    alias: {
      "$env/static/public": path.resolve(__dirname, "test/mocks/env-static-public.ts"),
      "$env/dynamic/private": path.resolve(__dirname, "test/mocks/env-dynamic-private.ts"),
      "$lib": path.resolve(__dirname, "src/lib"),
      "$app/environment": path.resolve(__dirname, "test/mocks/app-environment.ts"),
      "$app/stores": path.resolve(__dirname, "test/mocks/app-stores.ts"),
      "$app/navigation": path.resolve(__dirname, "test/mocks/app-navigation.ts"),
      "@sveltejs/kit": path.resolve(__dirname, "test/mocks/sveltejs-kit.ts"),
    },
  },
  test: {
    globals: true,
    css: false,
    // happy-dom provides a lightweight browser-like environment for component
    // tests; faster than jsdom and covers the DOM APIs SvelteKit components use.
    environment: "happy-dom",
    include: ["src/**/*.{test,spec}.{js,ts}", "test/**/*.{test,spec}.{js,ts}"],
    coverage: {
      provider: "istanbul",
      all: true,
      // Only track .ts files — istanbul can't reliably instrument compiled
      // Svelte components (coverage maps to JS output, not .svelte source).
      // Components are tested via @testing-library/svelte; E2E covers pages.
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.{test,spec}.ts",
        "src/**/*.d.ts",
        "src/app.d.ts",
        // SvelteKit layout server — just session forwarding, tested via E2E
        "src/routes/**/+layout.server.ts",
        // API route handlers (server-only endpoints, not page loaders)
        "src/routes/**/+server.ts",
        // Third-party shadcn-svelte re-exports — no logic to test
        "src/lib/components/ui/**",
        // 1-line clsx wrapper — no meaningful logic
        "src/lib/utils/cn.ts",
        // Uses Svelte 5 $state runes — compiled by svelte plugin in .svelte.ts
        "src/lib/changeHistory.svelte.ts",
        // Pure data files — no executable logic
        "src/lib/constants/**",
      ],
      reportOnFailure: true,
      thresholds: {
        lines: 95,
        functions: 55,
        branches: 70,
        statements: 80,
        perFile: true,
      },
    },
  },
});
