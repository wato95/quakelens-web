import { expect, test } from "@playwright/test";

const millisecondsPerDay = 24 * 60 * 60 * 1_000;

function formatUtcDay(date: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

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

test("applies an accessible custom UTC range and can return to a preset", async ({
  page,
}) => {
  await page.goto("/");

  const rangeControls = page.getByRole("group", { name: "Visible event range" });
  await expect(rangeControls).toBeVisible({ timeout: 30_000 });
  await rangeControls.getByRole("button", { name: "Full preview" }).click();
  await expect(page.locator(".workspace-table .region-status")).toHaveText("2 results");
  const eventInstant = await page
    .locator(".workspace-table time")
    .first()
    .getAttribute("datetime");
  if (!eventInstant) throw new Error("Fixture event time is missing");
  const eventDate = eventInstant.slice(0, 10);
  await rangeControls.getByRole("button", { name: "Custom" }).click();
  await page.getByLabel("Start date (UTC)").fill(eventDate);
  await page.getByLabel("End date (UTC, inclusive)").fill(eventDate);
  await page.getByRole("button", { name: "Apply UTC range" }).click();

  await expect(page.locator('.workspace-timeline [aria-live="polite"]')).toHaveText(
    `${formatUtcDay(eventDate)} – ${formatUtcDay(eventDate)} UTC`,
  );
  await expect(rangeControls.getByRole("button", { name: "Custom" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator(".workspace-map .region-status")).toHaveText("1 event");
  await expect(page.locator(".workspace-table .region-status")).toHaveText("1 result");

  await rangeControls.getByRole("button", { name: "Full preview" }).click();
  await expect(
    rangeControls.getByRole("button", { name: "Full preview" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".workspace-table .region-status")).toHaveText("2 results");
});

test("supports click and reverse drag selection on the activity plot", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name === "mobile-chromium",
    "Mobile range equivalence is covered by the touch-accessible explicit controls",
  );
  await page.goto("/");

  const chart = page.getByLabel("Pointer-selectable UTC activity timeline");
  await expect(chart).toBeVisible({ timeout: 30_000 });
  await page
    .getByRole("group", { name: "Visible event range" })
    .getByRole("button", { name: "Full preview" })
    .click();
  await expect(page.locator(".workspace-table .region-status")).toHaveText("2 results");
  await page.getByRole("button", { name: "Custom" }).click();
  const bounds = await chart.boundingBox();
  if (!bounds) throw new Error("Timeline chart has no layout bounds");
  const eventInstant = await page
    .locator(".workspace-table time")
    .first()
    .getAttribute("datetime");
  const coverageStart = await page.getByLabel("Start date (UTC)").getAttribute("min");
  const coverageEnd = await page
    .getByLabel("End date (UTC, inclusive)")
    .getAttribute("max");
  if (!eventInstant || !coverageStart || !coverageEnd) {
    throw new Error("Timeline fixture dates are missing");
  }
  const eventDate = eventInstant.slice(0, 10);
  const dayIndex =
    (Date.parse(`${eventDate}T00:00:00Z`) - Date.parse(`${coverageStart}T00:00:00Z`)) /
    millisecondsPerDay;
  const dayCount =
    (Date.parse(`${coverageEnd}T00:00:00Z`) -
      Date.parse(`${coverageStart}T00:00:00Z`)) /
      millisecondsPerDay +
    1;
  const eventDayX = bounds.x + ((dayIndex + 0.5) / dayCount) * bounds.width;

  await page.mouse.click(eventDayX, bounds.y + bounds.height / 2);
  await expect(page.locator('.workspace-timeline [aria-live="polite"]')).toHaveText(
    `${formatUtcDay(eventDate)} – ${formatUtcDay(eventDate)} UTC`,
  );
  await expect(page.locator(".workspace-table .region-status")).toHaveText("1 result");

  const dragBounds = await chart.boundingBox();
  if (!dragBounds)
    throw new Error("Timeline chart has no layout bounds after filtering");
  await page.mouse.move(
    dragBounds.x + dragBounds.width - 1,
    dragBounds.y + dragBounds.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(dragBounds.x + 1, dragBounds.y + dragBounds.height / 2, {
    steps: 4,
  });
  await page.mouse.up();
  await expect(page.locator('.workspace-timeline [aria-live="polite"]')).toHaveText(
    "01 Jan 2026 – 31 Aug 2026 UTC",
  );
  await expect(page.locator(".workspace-table .region-status")).toHaveText("2 results");
});
