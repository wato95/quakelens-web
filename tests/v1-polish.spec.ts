import { expect, test } from "@playwright/test";

test("distinguishes full-preview statistics from filtered results", async ({
  page,
}) => {
  await page.goto("/");

  const summary = page.getByTestId("preview-summary");
  await expect(summary).toBeVisible({ timeout: 30_000 });
  await expect(summary).toContainText("2");
  await expect(summary).toContainText("2026 preview");
  await expect(page.locator(".workspace-map .region-status")).toHaveText("0 events");

  await page
    .getByRole("group", { name: "Visible event range" })
    .getByRole("button", { name: "Full preview" })
    .click();
  await expect(page.locator(".workspace-map .region-status")).toHaveText("2 events");
  await expect(summary).toContainText("2");
});

test("applies four numeric filters and restores focus to the trigger", async ({
  page,
}) => {
  await page.goto("/?range=full");
  const trigger = page.getByRole("button", { name: "Filters", exact: true });
  await trigger.click();

  const minimumMagnitude = page.getByRole("spinbutton", {
    name: "Minimum magnitude",
  });
  await expect(minimumMagnitude).toBeFocused();
  await minimumMagnitude.fill("0");
  await page.getByLabel("Maximum magnitude").fill("10");
  await page.getByLabel("Minimum depth (km)").fill("0");
  await page.getByLabel("Maximum depth (km)").fill("1000");
  await page.getByRole("button", { name: "Apply filters" }).click();

  await expect(page).toHaveURL(/minMag=0/);
  await expect(page).toHaveURL(/maxMag=10/);
  await expect(page).toHaveURL(/minDepth=0/);
  await expect(page).toHaveURL(/maxDepth=1000/);
  await expect(trigger).toBeFocused();
});

test("keeps unavailable science selection-specific and exposes compact controls", async ({
  page,
}) => {
  await page.goto("/?range=full");
  await expect(page.getByText("Not available in this preview")).toHaveCount(0);
  await expect(page.getByLabel("Start date (UTC)")).toHaveCount(0);

  await page.getByRole("button", { name: "Custom" }).click();
  await expect(page.getByLabel("Start date (UTC)")).toBeVisible();

  const quickFilters = page.getByRole("group", {
    name: "Minimum magnitude quick filter",
  });
  for (const name of ["M5+", "M6+", "M7+", "All"]) {
    await quickFilters.getByRole("button", { name }).click();
    await expect(quickFilters.getByRole("button", { name })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  }

  await page
    .getByRole("list", { name: /earthquake results/i })
    .getByRole("button")
    .first()
    .click();
  await expect(page.getByText("Not available in this preview")).toHaveCount(3);
});

test("preserves map-first layout at desktop and tablet widths", async ({ page }) => {
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 900, height: 1000 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    const map = page.locator(".workspace-map");
    await expect(map).toBeVisible({ timeout: 30_000 });
    const bounds = await map.boundingBox();
    expect(bounds?.height).toBeGreaterThanOrEqual(420);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
  }
});
