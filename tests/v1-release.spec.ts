import { expect, test } from "@playwright/test";

test("loads the packaged immutable preview from the Pages base path", async ({
  page,
}) => {
  const revisionRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/revisions/") && request.url().includes(".parquet")) {
      revisionRequests.push(request.url());
    }
  });
  await page.goto("./");

  const summary = page.getByTestId("preview-summary");
  await expect(summary).toBeVisible({ timeout: 60_000 });
  await expect(summary).toContainText("19,503");
  await expect(page.getByText("2026-01-01 → 2026-08-31")).toBeVisible();
  await expect(page.locator('[data-map-state="ready"]')).toBeVisible({
    timeout: 60_000,
  });
  expect(revisionRequests).toHaveLength(0);

  const results = page.getByRole("list", { name: /earthquake results/i });
  await results.getByRole("button").first().click();
  await expect(page.getByText("Not available in this preview")).toHaveCount(3);
  await expect(page).toHaveURL(/event=/);
  await page
    .locator("#event-detail")
    .locator('button[aria-controls$="-content"]')
    .click();
  await expect.poll(() => revisionRequests.length).toBeGreaterThan(0);
});
