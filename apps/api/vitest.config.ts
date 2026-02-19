import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    setupFiles: ["./test/setup.ts"],
    coverage: {
      provider: "istanbul",
      // Include all source files so untested files still count against thresholds.
      // This is the primary anti-gaming measure at the config level — you cannot
      // reach 95% by only writing tests for the easy paths.
      all: true,
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/**/*.spec.ts"],
      // Report is generated even when tests fail, so partial runs show gaps.
      reportOnFailure: true,
      thresholds: {
        lines: 95,
        functions: 95,
        // Branches at 95% — every if/else, ternary, and optional-chain arm
        // must be exercised. Unit tests + integration tests together are
        // expected to cover happy paths AND error/edge branches.
        branches: 95,
        statements: 95,
      },
    },
    poolOptions: {
      workers: {
        wranglerConfigPath: "./wrangler.toml",
        main: "./src/index.ts",
        miniflare: {
          compatibilityDate: "2024-12-18",
          compatibilityFlags: ["nodejs_compat"],
          d1Databases: ["DB"],
          kvNamespaces: ["SESSIONS"],
          r2Buckets: ["DOCUMENTS"],
          bindings: {
            GOOGLE_CLIENT_ID: "test-client-id",
            GOOGLE_CLIENT_SECRET: "test-client-secret",
            GOOGLE_REDIRECT_URI: "http://localhost/auth/google/callback",
            APP_URL: "http://localhost",
            ENVIRONMENT: "test",
          },
        },
      },
    },
  },
});
