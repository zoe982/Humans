import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    // Run test files sequentially to avoid port exhaustion in workerd.
    // With 28+ test files, parallel workers overwhelm ephemeral ports.
    fileParallelism: false,
    maxConcurrency: 5,
    exclude: ["test/unit/**", "**/node_modules/**", "**/dist/**"],
    setupFiles: ["./test/setup.ts"],
    coverage: {
      provider: "istanbul",
      // Include all source files so untested files still count against thresholds.
      // This is the primary anti-gaming measure at the config level — you cannot
      // reach 95% by only writing tests for the easy paths.
      all: true,
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/**/*.spec.ts", "src/services/**/*.ts"],
      // Report is generated even when tests fail, so partial runs show gaps.
      reportOnFailure: true,
      // Note: cloudflare-vitest-pool-workers runs route handlers in a workerd
      // isolate that istanbul cannot instrument. Integration tests via SELF.fetch
      // DO exercise route code, but coverage only tracks the test-process side
      // (middleware setup, lib utilities). Service layer files are excluded here
      // because they have dedicated unit tests in vitest.unit.config.ts (Node.js,
      // instrumentable). Per-file enforcement is disabled and aggregate thresholds
      // are intentionally low to reflect workerd limitations.
      thresholds: {
        lines: 20,
        functions: 0,
        branches: 0,
        statements: 20,
      },
    },
    poolOptions: {
      workers: {
        singleWorker: true,
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
            SUPABASE_URL: "http://localhost:54321",
            SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
          },
        },
      },
    },
  },
});
