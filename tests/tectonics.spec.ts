import { expect, test, type Page } from "@playwright/test";
import manifest from "./fixtures/tectonic-preview/manifest.json" with { type: "json" };

async function useTectonicFixture(page: Page) {
  await page.route("**/tests/fixtures/browser-preview/**", async (route) => {
    if (new URL(route.request().url()).pathname.endsWith("/manifest.json")) {
      await route.fulfill({ json: manifest });
    } else {
      const response = await route.fetch({
        url: route.request().url().replace("/browser-preview/", "/tectonic-preview/"),
      });
      await route.fulfill({ response });
    }
  });
}

async function closeSheet(page: Page) {
  const close = page
    .locator("#event-detail")
    .getByRole("button", { name: "Close event details" });
  if (await close.isVisible()) await close.click();
}

test("renders classified and completed unknown results, restores sharing, and toggles context independently", async ({
  page,
}) => {
  await useTectonicFixture(page);
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.goto("/?range=full&event=us7000sb7l");
  const detail = page.locator("#event-detail");
  await expect(detail.getByText("Active shallow crust", { exact: true })).toBeVisible({
    timeout: 30_000,
  });
  await expect(detail.getByText("High confidence")).toHaveCount(0);
  await expect(detail.getByText("Not available in this preview")).toHaveCount(2);
  await expect(detail.getByRole("button", { name: "Retry" })).toHaveCount(0);
  await detail.getByRole("button", { name: "View tectonic details" }).click();
  await expect(detail.getByText("High confidence")).toBeVisible();
  await expect(detail.getByText("pf1-tectonic-policy-v1")).toBeVisible();
  await closeSheet(page);
  const map = page.locator('[data-map-state="ready"]');
  await expect(map).toHaveAttribute("data-boundaries-visible", "true");
  const detailTrigger = page.getByRole("button", {
    name: "Event details",
    exact: true,
  });
  if (await detailTrigger.isVisible()) {
    const triggerBounds = await detailTrigger.boundingBox();
    const layerBounds = await page
      .getByRole("group", { name: "Map layers" })
      .boundingBox();
    expect(layerBounds!.y).toBeGreaterThan(triggerBounds!.y + triggerBounds!.height);
  }
  const toggle = page.getByRole("checkbox", { name: "Plate boundaries" });
  await toggle.focus();
  await page.keyboard.press("Space");
  await expect(map).toHaveAttribute("data-boundaries-visible", "false");
  const shared = page.url();
  await page.reload();
  await expect(detail.getByText("Active shallow crust", { exact: true })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page).toHaveURL(shared);
  await closeSheet(page);
  await expect(toggle).not.toBeChecked();
  await toggle.check();
  await expect(map).toHaveAttribute("data-boundaries-visible", "true");
  await expect(map.getByText("PB2002 source and licence")).toHaveCount(0);
  await page
    .getByRole("region", { name: "Data and references" })
    .getByText("PB2002 source and licence")
    .click();
  await expect(page.getByRole("link", { name: "Pinned PB2002 source" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open Data Commons Attribution License 1.0" }),
  ).toBeVisible();
  await page.goto("/?range=full&event=us7000srb1");
  await expect(detail.getByText("Could not be classified confidently")).toBeVisible({
    timeout: 30_000,
  });
  await detail.getByRole("button", { name: "View tectonic details" }).click();
  await expect(detail.getByText(/does not use a simplified fallback/)).toBeVisible();
  await expect(detail.getByRole("alert")).toHaveCount(0);
  expect(requests.some((url) => url.includes("raw.githubusercontent.com"))).toBe(false);
});

test("boundary failure preserves exact-revision detail and the catalogue", async ({
  page,
}) => {
  await useTectonicFixture(page);
  await page.route("**/references/tectonic_plate_boundaries.geojson", (route) =>
    route.fulfill({ status: 404 }),
  );
  await page.goto("/?range=full&event=us7000sb7l");
  await expect(
    page.locator("#event-detail").getByText("Active shallow crust", { exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  await closeSheet(page);
  await expect(page.getByText("Plate boundaries unavailable")).toBeVisible();
  await expect(page.locator('[data-map-state="ready"]')).toHaveAttribute(
    "data-event-count",
    "2",
  );
  await expect(page.getByRole("list", { name: /earthquake results/i })).toBeVisible();
});

test("original preview stays explicitly unavailable and does not request tectonics", async ({
  page,
}) => {
  const scientificRequests: string[] = [];
  page.on("request", (request) => {
    if (/event_tectonics|tectonic_plate_boundaries/.test(request.url()))
      scientificRequests.push(request.url());
  });
  await page.goto("/?range=full&event=us7000sb7l");
  await expect(
    page.locator("#event-detail").getByText("Not available in this preview"),
  ).toHaveCount(3, { timeout: 30_000 });
  expect(scientificRequests).toHaveLength(0);
  await expect(page.getByRole("checkbox", { name: "Plate boundaries" })).toHaveCount(0);
});

test("renders split boundary geometry at world and regional zoom without joins", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/tests/map-smoke.html?tectonics=1");
  const map = page.locator('[data-map-state="ready"]');
  await expect(map).toHaveAttribute("data-boundaries-visible", "true");
  const canvas = map.locator("canvas");

  const screenshotOptions = { mask: [page.locator(".map-overlay-card")] };
  const worldVisible = await canvas.screenshot(screenshotOptions);
  await testInfo.attach("boundaries-world.png", {
    body: worldVisible,
    contentType: "image/png",
  });
  await page.getByRole("checkbox", { name: "Plate boundaries" }).uncheck();
  const worldHidden = await canvas.screenshot(screenshotOptions);
  expect(worldVisible.equals(worldHidden)).toBe(false);
  await page.getByRole("checkbox", { name: "Plate boundaries" }).check();
  await page.getByLabel("Zoom in").click();
  await page.getByLabel("Zoom in").click();
  const regionalVisible = await canvas.screenshot(screenshotOptions);
  await page.getByRole("checkbox", { name: "Plate boundaries" }).uncheck();
  expect(regionalVisible.equals(await canvas.screenshot(screenshotOptions))).toBe(
    false,
  );
  await testInfo.attach("boundaries-regional.png", {
    body: regionalVisible,
    contentType: "image/png",
  });
});
