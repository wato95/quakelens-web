import { expect, test } from "@playwright/test";

test("opens selected-event captured history on demand with keyboard controls", async ({
  page,
}) => {
  const revisionRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/revisions/") && request.url().includes(".parquet")) {
      revisionRequests.push(request.url());
    }
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Full preview" }).click();

  const results = page.getByRole("list", { name: /earthquake results/i });
  await expect(results).toBeVisible({ timeout: 30_000 });
  await results.getByRole("button").first().click();

  const details = page.locator("#event-detail");
  const historyTrigger = details.locator('button[aria-controls$="-content"]');
  expect(revisionRequests).toHaveLength(0);
  await expect(historyTrigger).toHaveAccessibleName(
    /view captured history \(\d+ states?\)/i,
  );
  await historyTrigger.focus();
  await page.keyboard.press("Enter");

  await expect(historyTrigger).toHaveAttribute("aria-expanded", "true");
  await expect.poll(() => revisionRequests.length).toBeGreaterThan(0);
  await expect(
    details.getByRole("heading", { name: "Initial captured state" }),
  ).toBeVisible({ timeout: 30_000 });
  const capturedStates = details.getByRole("list", {
    name: "Captured event states",
  });
  await expect(capturedStates).toBeVisible();
  if ((await capturedStates.locator(":scope > li").count()) > 1) {
    await expect(
      details.getByText(/changed .+ → .+|source update observed/i).first(),
    ).toBeVisible();
  } else {
    await expect(
      details.getByText("Only the initial captured state is published for this event."),
    ).toBeVisible();
  }

  await page.keyboard.press("Enter");
  await expect(historyTrigger).toBeFocused();
  await expect(historyTrigger).toHaveAttribute("aria-expanded", "false");
  await expect(
    details.getByRole("list", { name: "Captured event states" }),
  ).toHaveCount(0);
});
