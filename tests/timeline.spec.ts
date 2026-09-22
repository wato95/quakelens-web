import { expect, test } from "@playwright/test";

test("uses manifest coverage for the default UTC window and synchronizes results", async ({
  page,
}) => {
  await page.goto("/");

  const rangeControls = page.getByRole("group", { name: "Visible event range" });
  await expect(rangeControls).toBeVisible({ timeout: 30_000 });
  await expect(rangeControls.getByRole("button", { name: "30 days" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const currentRange = page.locator('.workspace-timeline [aria-live="polite"]');
  await expect(currentRange).toHaveText("02 Aug 2026 – 31 Aug 2026 UTC");
  await expect(
    page.getByRole("figure", {
      name: "Daily earthquake activity across published preview coverage",
    }),
  ).toBeVisible();

  await rangeControls.getByRole("button", { name: "Full preview" }).click();
  await expect(
    rangeControls.getByRole("button", { name: "Full preview" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(currentRange).toHaveText("01 Jan 2026 – 31 Aug 2026 UTC");
  await expect(page.locator(".workspace-map .region-status")).toHaveText("2 events");
  await expect(page.locator(".workspace-table .region-status")).toHaveText("2 results");
});

test("clears a selected event when a narrower range excludes it", async ({
  page,
}, testInfo) => {
  await page.goto("/");

  const rangeControls = page.getByRole("group", { name: "Visible event range" });
  await expect(rangeControls).toBeVisible({ timeout: 30_000 });
  await rangeControls.getByRole("button", { name: "Full preview" }).click();
  await expect(page.locator(".workspace-table .region-status")).toHaveText("2 results");

  const results = page.getByRole("list", { name: /earthquake results/i });
  const oldestEvent = results.getByRole("button").last();
  await oldestEvent.click();
  await expect(oldestEvent).toHaveAttribute("aria-pressed", "true");
  if (testInfo.project.name === "mobile-chromium") {
    await page
      .locator("#event-detail")
      .getByRole("button", { name: "Close event details" })
      .click();
  }

  await rangeControls.getByRole("button", { name: "7 days" }).click();
  await expect(rangeControls.getByRole("button", { name: "7 days" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(oldestEvent).toHaveCount(0);
  await expect(page.locator("#event-detail")).toHaveAttribute("data-open", "false");
});
