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
  await expect(page.getByText("Not available in this preview")).toHaveCount(2);
  await expect(
    page.locator('[data-tectonic-state="classified"], [data-tectonic-state="unknown"]'),
  ).toBeVisible({ timeout: 30_000 });
  await expect(page).toHaveURL(/event=/);
  await page
    .locator("#event-detail")
    .locator('button[aria-controls$="-content"]')
    .click();
  await expect.poll(() => revisionRequests.length).toBeGreaterThan(0);
});

test("restores a tectonic result through a static Pages share URL", async ({
  page,
}) => {
  await page.goto("./?range=full&event=us7000rlt7");
  const details = page.locator("#event-detail");
  await expect(details.getByText("Subduction", { exact: true })).toBeVisible({
    timeout: 60_000,
  });
  const close = details.getByRole("button", { name: "Close event details" });
  if (await close.isVisible()) await close.click();
  await expect(page.locator('[data-boundaries-visible="true"]')).toBeVisible();
  await page.getByRole("checkbox", { name: "Plate boundaries" }).uncheck();
  const url = page.url();
  await page.reload();
  await expect(details.getByText("Subduction", { exact: true })).toBeVisible({
    timeout: 60_000,
  });
  await expect(page).toHaveURL(url);
  if (await close.isVisible()) await close.click();
  await expect(
    page.getByRole("checkbox", { name: "Plate boundaries" }),
  ).not.toBeChecked();
  await page.getByRole("checkbox", { name: "Plate boundaries" }).check();
  await page.getByText("PB2002 source and licence").click();
  await expect(page.getByRole("link", { name: "Pinned PB2002 source" })).toBeVisible();
});
