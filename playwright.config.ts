import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./apps/web/tests",
  fullyParallel: true,
  forbidOnly: !!process.env["CI"],
  retries: process.env["CI"] ? 2 : 0,
  workers: process.env["CI"] ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "npx tsx apps/web/tests/mock-api.ts",
      port: 4799,
      reuseExistingServer: !process.env["CI"],
    },
    {
      command: "pnpm --filter @humans/web dev",
      url: "http://localhost:5173",
      reuseExistingServer: !process.env["CI"],
      env: {
        PUBLIC_API_URL: "http://localhost:4799",
        TEST_BYPASS_AUTH: "1",
      },
    },
  ],
});
