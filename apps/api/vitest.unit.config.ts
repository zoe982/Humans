import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/unit/**/*.test.ts"],
    setupFiles: ["./test/unit/setup.ts"],
    coverage: {
      provider: "istanbul",
      all: true,
      include: ["src/services/**/*.ts", "src/lib/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/**/*.spec.ts", "src/lib/error-logger.ts"],
      reportOnFailure: true,
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 75,
        statements: 85,
      },
    },
  },
});
