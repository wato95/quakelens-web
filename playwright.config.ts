import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1000 } },
    },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 5"] },
    },
  ],
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    env: process.env.QLW_REAL_PREVIEW_SMOKE
      ? { VITE_QUAKELENS_MAP_STYLE_URL: "/tests/fixtures/map/style.json" }
      : {
          VITE_QUAKELENS_MANIFEST_URL: "/tests/fixtures/browser-preview/manifest.json",
          VITE_QUAKELENS_MAP_STYLE_URL: "/tests/fixtures/map/style.json",
        },
  },
});
