import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/unit/**/*.test.ts"],
    setupFiles: ["./test/unit/setup.ts"],
    coverage: {
      provider: "istanbul",
      all: true,
      include: ["src/services/**/*.ts", "src/lib/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.spec.ts",
        "src/lib/error-logger.ts",
        "src/services/front-sync.ts",
      ],
      reportOnFailure: true,
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 85,
        statements: 95,
      },
    },
  },
});
