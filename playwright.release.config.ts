import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "v1-release.spec.ts",
  fullyParallel: true,
  forbidOnly: true,
  reporter: "html",
  use: {
    baseURL: "http://127.0.0.1:4174/quakelens-web/",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "release-desktop-chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1000 } },
    },
    {
      name: "release-mobile-chromium",
      use: { ...devices["Pixel 5"] },
    },
  ],
  webServer: {
    command: "node scripts/serve-release.mjs --port 4174 --base /quakelens-web/",
    url: "http://127.0.0.1:4174/quakelens-web/",
    reuseExistingServer: false,
  },
});
