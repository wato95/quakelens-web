import { expect, test } from "@playwright/test";

test("queries the pinned PF1-307 event revision and loads the published PB2002 reference", async ({
  page,
}, testInfo) => {
  test.skip(
    !process.env.QLW_REAL_PREVIEW_SMOKE,
    "Requires the synced real PF1-307 preview",
  );
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  const started = Date.now();
  await page.goto("/?range=full&event=us7000rlt7");
  const detail = page.locator("#event-detail");
  await expect(detail.getByText("Subduction", { exact: true })).toBeVisible({
    timeout: 60_000,
  });
  await detail.getByRole("button", { name: "View tectonic details" }).click();
  await expect(detail.getByText("Confidence not established")).toBeVisible();
  await expect(detail.getByText("pf1-tectonic-policy-v1")).toBeVisible();
  const close = detail.getByRole("button", { name: "Close event details" });
  if (await close.isVisible()) await close.click();
  const map = page.locator('[data-map-state="ready"]');
  await expect(map).toHaveAttribute("data-event-count", "19503");
  await expect(map).toHaveAttribute("data-boundaries-visible", "true");
  await page.getByText("PB2002 source and licence").click();
  await expect(page.getByRole("link", { name: "Pinned PB2002 source" })).toBeVisible();
  expect(
    requests.filter((url) => url.includes("tectonic_plate_boundaries.geojson")),
  ).toHaveLength(1);
  const elapsedMilliseconds = Date.now() - started;
  console.info(
    `PF1-307 tectonic detail and boundary layer ready in ${elapsedMilliseconds} ms`,
  );
  await testInfo.attach("tectonic-performance.json", {
    body: JSON.stringify({
      eventCount: 19503,
      elapsedMilliseconds,
      boundaryBytes: 162684,
      tectonicBytes: 2165888,
    }),
    contentType: "application/json",
  });
  await testInfo.attach("tectonic-real-preview.png", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
  expect(elapsedMilliseconds).toBeLessThan(60_000);
});

test("preserves a real completed unknown outcome through refresh", async ({ page }) => {
  test.skip(
    !process.env.QLW_REAL_PREVIEW_SMOKE,
    "Requires the synced real PF1-307 preview",
  );
  await page.goto("/?range=full&event=ak2026abhbyg");
  const detail = page.locator("#event-detail");
  await expect(detail.getByText("Could not be classified confidently")).toBeVisible({
    timeout: 60_000,
  });
  await expect(detail.getByRole("alert")).toHaveCount(0);
  await detail.getByRole("button", { name: "View tectonic details" }).click();
  await expect(detail.getByText("Published oceanic source domain")).toBeVisible();
  await page.reload();
  await expect(detail.getByText("Could not be classified confidently")).toBeVisible({
    timeout: 60_000,
  });
  await expect(detail.getByRole("alert")).toHaveCount(0);
});
