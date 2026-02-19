import { defineConfig } from "vitest/config";

// Shared package test strategy:
//   Unit tests  – Zod validators, type guards, and any pure utility functions
//
// All source files are included in coverage (all: true) so schema files with
// no test coverage show up as gaps rather than being silently omitted.

export default defineConfig({
  test: {
    globals: true,
    include: ["src/**/*.{test,spec}.ts"],
    coverage: {
      provider: "v8",
      all: true,
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.{test,spec}.ts", "src/**/*.d.ts"],
      reportOnFailure: true,
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 95,
        statements: 95,
        perFile: true,
      },
    },
  },
});
