import { expect, test } from "@playwright/test";

test("queries all repositories through DuckDB-Wasm in a real browser", async ({
  page,
}) => {
  const manifest = "/tests/fixtures/browser-preview/manifest.json";
  await page.goto(
    `/tests/repository-smoke.html?manifest=${encodeURIComponent(manifest)}`,
  );

  await page.waitForFunction(() => document.body.dataset.status !== "loading", null, {
    timeout: 30_000,
  });
  expect(await page.locator("#status").textContent()).toBe("Repository smoke passed");
  const result = JSON.parse((await page.locator("#result").textContent()) ?? "{}");
  expect(result).toMatchObject({
    buildId: "20260921T204938Z-a14edef9b000",
    eventArtifactRows: 2,
    capturedStates: 2,
    activityDays: 2,
    matchingPlaces: 5,
    exposureCapability: "not_in_preview",
  });
  expect(result.selectedEventId).toMatch(/^(us7000sb7l|us7000srb1)$/);
});
