import { expect, test } from "@playwright/test";

test("filters the real preview without reloading activity or revisions", async ({
  page,
}) => {
  test.skip(
    !process.env.QLW_REAL_PREVIEW_SMOKE,
    "Run after data:sync with QLW_REAL_PREVIEW_SMOKE=1",
  );

  await page.goto("/");
  const startDate = page.getByLabel("Start date (UTC)");
  const endDate = page.getByLabel("End date (UTC, inclusive)");
  await expect(startDate).toBeVisible({ timeout: 30_000 });
  const finalPublishedDate = await endDate.getAttribute("max");
  if (!finalPublishedDate) throw new Error("Timeline coverage maximum is missing");

  const rangeRequests: string[] = [];
  page.on("request", (request) => rangeRequests.push(request.url()));
  await startDate.fill(finalPublishedDate);
  await endDate.fill(finalPublishedDate);
  await page.getByRole("button", { name: "Apply UTC range" }).click();

  await expect(page.getByText("Custom", { exact: true })).toHaveAttribute(
    "data-active",
    "true",
  );
  await expect(page.locator(".workspace-map .region-status")).toHaveText(/\d+ events?/);
  expect(rangeRequests.some((url) => url.includes("/activity/"))).toBe(false);
  expect(rangeRequests.some((url) => url.includes("/revisions/"))).toBe(false);
});
