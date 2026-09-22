import { expect, test } from "@playwright/test";

test("selects an event from textual results and shows V1 detail", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Full preview" }).click();

  const results = page.getByRole("list", { name: /earthquake results/i });
  await expect(results).toBeVisible({ timeout: 30_000 });
  const event = results.getByRole("button").first();
  await event.focus();
  await page.keyboard.press("Enter");

  await expect(event).toHaveAttribute("aria-pressed", "true");
  const details = page.locator("#event-detail");
  await expect(details.getByText(/captured state/)).toBeVisible();
  await expect(details.getByText("Not available in this preview")).toHaveCount(3);
  await expect(details.getByText("Source updated")).toBeVisible();
  await expect(details.getByText("Event ID")).toBeVisible();
});

test("uses a persistent desktop panel and reachable mobile bottom sheet", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Full preview" }).click();
  const results = page.getByRole("list", { name: /earthquake results/i });
  await expect(results).toBeVisible({ timeout: 30_000 });
  await results.getByRole("button").first().click();

  const details = page.locator("#event-detail");
  await expect(details).toBeVisible();
  if (testInfo.project.name === "mobile-chromium") {
    await expect(
      details.getByRole("button", { name: "Close event details" }),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(details).toBeHidden();
    await expect(results.getByRole("button").first()).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  } else {
    await expect(details.getByText("Published event properties")).toBeVisible();
  }
});
