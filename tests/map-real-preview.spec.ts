import { expect, test } from "@playwright/test";

test("renders the synced PF1-208 event catalogue at real preview scale", async ({
  page,
}, testInfo) => {
  test.skip(
    !process.env.QLW_REAL_PREVIEW_SMOKE,
    "Run after data:sync with QLW_REAL_PREVIEW_SMOKE=1",
  );

  const startedAt = Date.now();
  await page.goto("/");
  await page.getByRole("button", { name: "Full preview" }).click();
  const map = page.locator('[data-map-state="ready"]');
  await expect(map).toHaveAttribute("data-event-count", "19503", { timeout: 30_000 });
  await expect(
    page.getByRole("list", { name: "Earthquake results, 19,503 events" }),
  ).toBeVisible();
  await expect(page.getByText(/Page 1 of 196/)).toBeVisible();
  const mapReadyMilliseconds = Date.now() - startedAt;
  console.info(
    `PF1-208 map ready: 19,503 events in ${mapReadyMilliseconds.toLocaleString()} ms`,
  );

  await testInfo.attach("map-performance.json", {
    body: JSON.stringify({ eventCount: 19_503, mapReadyMilliseconds }, null, 2),
    contentType: "application/json",
  });
  expect(mapReadyMilliseconds).toBeLessThan(30_000);
});
