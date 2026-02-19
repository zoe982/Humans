import { defineConfig } from "vitest/config";

// DB package test strategy:
//   Unit tests  – schema helpers, ID-generation utilities, and any pure
//                 query-builder logic that does not require a live D1 binding.
//   Integration – queries against a real D1 database are tested through the
//                 API worker test suite (apps/api) which has miniflare wired up.
//
// seed.ts is excluded because it is a Node.js script (not a Worker module)
// and is already excluded from the TypeScript project.

export default defineConfig({
  test: {
    globals: true,
    include: ["src/**/*.{test,spec}.ts"],
    coverage: {
      provider: "v8",
      all: true,
      include: ["src/**/*.ts"],
      exclude: ["src/seed.ts", "src/**/*.{test,spec}.ts", "src/**/*.d.ts"],
      reportOnFailure: true,
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 95,
        statements: 95,
      },
    },
  },
});
