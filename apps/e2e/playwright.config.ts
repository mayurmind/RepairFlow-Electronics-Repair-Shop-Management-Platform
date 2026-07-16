import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command:
        "cd ../../ && pnpm build:packages && npx turbo run dev --filter=api",
      url: "http://localhost:4000/api/v1/health",
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      command: "cd ../../ && pnpm --filter web start",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ],
});
