import { expect, test } from "@playwright/test";

test("expands a cluster and selects an earthquake through MapLibre layers", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/tests/map-smoke.html");

  const map = page.locator('[data-map-state="ready"]');
  await expect(map).toBeVisible();
  await expect(map).toHaveAttribute("data-event-count", "3");
  await expect(page.locator(".maplibregl-ctrl-attrib")).toContainText(
    "Fixture basemap for automated tests",
  );

  const canvas = map.locator("canvas");
  const bounds = await canvas.boundingBox();
  expect(bounds).not.toBeNull();
  const center = {
    x: (bounds?.x ?? 0) + (bounds?.width ?? 0) / 2,
    y: (bounds?.y ?? 0) + (bounds?.height ?? 0) / 2,
  };

  await page.mouse.click(center.x, center.y);
  await page.waitForTimeout(100);
  await page.mouse.click(center.x, center.y);

  await expect(page.getByText(/selected magnitude 6\.2 earthquake/i)).toBeAttached();
  await page.getByLabel("Zoom out").click();
  await expect(page.getByText(/selected magnitude 6\.2 earthquake/i)).toBeAttached();
});

test("keeps the map usable in the mobile shell width", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium", "Mobile-only assertion");
  await page.goto("/tests/map-smoke.html");

  const map = page.locator('[data-map-state="ready"]');
  await expect(map).toBeVisible();
  const bounds = await map.boundingBox();
  expect(bounds?.width).toBeLessThanOrEqual(page.viewportSize()?.width ?? 0);
  await expect(page.getByLabel("Earthquake map legend")).toBeVisible();
});
