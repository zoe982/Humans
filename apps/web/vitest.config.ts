import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";

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
      compilerOptions: { hydratable: false },
    }),
  ],
  test: {
    globals: true,
    // happy-dom provides a lightweight browser-like environment for component
    // tests; faster than jsdom and covers the DOM APIs SvelteKit components use.
    environment: "happy-dom",
    include: ["src/**/*.{test,spec}.{js,ts}"],
    coverage: {
      provider: "istanbul",
      all: true,
      include: ["src/**/*.{ts,svelte}"],
      exclude: [
        "src/**/*.{test,spec}.{ts,svelte}",
        "src/**/*.d.ts",
        // SvelteKit auto-generated files
        "src/app.d.ts",
      ],
      reportOnFailure: true,
      thresholds: {
        lines: 0,
        functions: 0,
        branches: 0,
        statements: 0,
      },
    },
  },
});
