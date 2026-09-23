import { chromium, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const BASE_URL = "http://localhost:5173";
const OUTPUT_DIR = "docs/assets";

async function waitForQuakeLens(page: Page) {
  await page
    .locator('.earthquake-map[data-map-state="ready"]')
    .waitFor({ state: 'visible' });

  await page.waitForFunction(() => {
    const map = document.querySelector<HTMLElement>(
      '.earthquake-map[data-map-state="ready"]'
    );

    if (!map) {
      return false;
    }

    const eventCount = Number(map.dataset.eventCount);

    return Number.isFinite(eventCount) && eventCount > 0;
  });

  await page
    .locator('.earthquake-map .maplibregl-canvas')
    .waitFor({ state: 'visible' });

  // Allow the final MapLibre/chart rendering frame to settle.
  await page.waitForTimeout(500);
}

async function capture(
  page: Page,
  {
    name,
    width,
    height,
    url,
  }: {
    name: string;
    width: number;
    height: number;
    url: string;
  },
) {
  await page.setViewportSize({ width, height });
  await page.goto(url);

  await waitForQuakeLens(page);

  await page.screenshot({
    path: `docs/assets/${name}.png`,
  });
}


async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch();

  // ------------------------------------------------------------
  // Desktop screenshots
  // ------------------------------------------------------------

  const desktop = await browser.newContext({
    deviceScaleFactor: 1,
  });

  const page = await desktop.newPage();

  await capture(page, {
    name: "quakelens-hero-small",
    width: 1200,
    height: 900,
    url: `${BASE_URL}/?event=us7000srb1&range=full&sort=magnitude`,
  });

  await browser.close();
}

main();
