import { expect, test } from "@playwright/test";

test("consumes the synced real PF1-208 publication", async ({ page }) => {
  test.skip(
    !process.env.QLW_REAL_PREVIEW_SMOKE,
    "Run after data:sync with QLW_REAL_PREVIEW_SMOKE=1",
  );

  await page.goto("/tests/repository-smoke.html");
  await page.waitForFunction(() => document.body.dataset.status !== "loading", null, {
    timeout: 30_000,
  });
  expect(await page.locator("#status").textContent()).toBe("Repository smoke passed");
  const result = JSON.parse((await page.locator("#result").textContent()) ?? "{}");
  expect(result).toMatchObject({
    eventArtifactRows: 19_503,
    activityDays: 243,
    exposureCapability: "not_in_preview",
  });
  expect(result.capturedStates).toBeGreaterThan(0);
  expect(result.matchingPlaces).toBeGreaterThan(0);
  expect(result.selectedEventId).toBeTruthy();
});
