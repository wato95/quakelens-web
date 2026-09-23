import { expect, test } from "@playwright/test";

test("restores a selected event and active filters from a share URL", async ({
  page,
}) => {
  await page.goto("/?range=full&minMag=0&maxDepth=1000");
  await expect(page.getByLabel("Search earthquake locations")).toBeVisible({
    timeout: 30_000,
  });
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  await expect(page.getByRole("spinbutton", { name: "Minimum magnitude" })).toHaveValue(
    "0",
  );
  await expect(page.getByLabel("Maximum depth (km)")).toHaveValue("1000");
  await page.getByRole("button", { name: "Close filters" }).click();

  const results = page.getByRole("list", { name: /earthquake results/i });
  const event = results.getByRole("button").first();
  await event.click();
  await expect(page).toHaveURL(/event=/);
  const sharedUrl = page.url();

  await page.goto(sharedUrl);
  const closeRestoredDetail = page
    .getByRole("complementary")
    .getByRole("button", { name: "Close event details" });
  if (await closeRestoredDetail.isVisible()) await closeRestoredDetail.click();
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  await expect(page.getByRole("spinbutton", { name: "Minimum magnitude" })).toHaveValue(
    "0",
  );
  await expect(page.getByLabel("Maximum depth (km)")).toHaveValue("1000");
  await expect(
    page
      .getByRole("list", { name: /earthquake results/i })
      .getByRole("button")
      .first(),
  ).toHaveAttribute("aria-pressed", "true");
});

test("uses browser history to restore filter state", async ({ page }) => {
  await page.goto("/?range=full");
  await expect(page.getByLabel("Search earthquake locations")).toBeVisible({
    timeout: 30_000,
  });
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  await page.getByRole("spinbutton", { name: "Minimum magnitude" }).fill("6");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/minMag=6/);

  await page.goBack();
  await expect(page).not.toHaveURL(/minMag=/);
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  await expect(page.getByRole("spinbutton", { name: "Minimum magnitude" })).toHaveValue(
    "",
  );

  await page.goForward();
  await expect(page.getByRole("spinbutton", { name: "Minimum magnitude" })).toHaveValue(
    "6",
  );
});

test("uses event location search without exposing Census place search", async ({
  page,
}) => {
  await page.goto("/?range=full");
  const search = page.getByLabel("Search earthquake locations");
  await expect(search).toBeVisible({ timeout: 30_000 });
  await expect(page.getByLabel("Find a U.S. Census place")).toHaveCount(0);

  await search.fill("Oregon");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page).toHaveURL(/q=Oregon/);
  await expect(
    page.getByRole("list", { name: /earthquake results, 1 event/i }),
  ).toBeVisible();
});

test("searches, filters, sorts, selects, copies, and reloads shared state", async ({
  page,
}) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/?range=full");
  await page.getByLabel("Search earthquake locations").fill("Oregon");
  await page.getByRole("button", { name: "Search" }).click();

  await page.getByRole("button", { name: "Filters", exact: true }).click();
  await page.getByLabel("Minimum depth (km)").fill("0");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await page.getByRole("button", { name: "Place", exact: true }).click();
  await expect(page).toHaveURL(/sort=place/);
  await expect(page).toHaveURL(/dir=asc/);

  const next = page.getByRole("button", { name: "Next" });
  if (await next.isVisible()) {
    await next.click();
    await expect(page).toHaveURL(/page=2/);
  }

  await page
    .getByRole("list", { name: /earthquake results/i })
    .getByRole("button")
    .first()
    .click();
  await expect(page).toHaveURL(/event=/);
  const closeSelectedDetail = page
    .getByRole("complementary")
    .getByRole("button", { name: "Close event details" });
  if (await closeSelectedDetail.isVisible()) await closeSelectedDetail.click();
  await page.getByRole("button", { name: "Copy link" }).click();
  await expect(page.getByText("Share link copied")).toBeAttached();

  const sharedUrl = page.url();
  await page.goto(sharedUrl);
  await expect(page.getByLabel("Search earthquake locations")).toHaveValue("Oregon");
  await expect(page.getByRole("columnheader", { name: /place/i })).toHaveAttribute(
    "aria-sort",
    "ascending",
  );
  await expect(
    page
      .getByRole("list", { name: /earthquake results/i })
      .getByRole("button")
      .first(),
  ).toHaveAttribute("aria-pressed", "true");
});

test("normalizes invalid and out-of-coverage URL state without crashing", async ({
  page,
}) => {
  await page.goto(
    "/?from=1900-01-01&to=2099-12-31&minMag=invalid&type=unsupported&event=missing&sort=unsafe&dir=sideways&page=-2",
  );
  await expect(page.getByLabel("Search earthquake locations")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByLabel("Start date (UTC)")).toHaveValue("2026-01-01");
  await expect(page.getByLabel("End date (UTC, inclusive)")).toHaveValue("2026-08-31");
  await expect(page).not.toHaveURL(
    /event=missing|minMag=invalid|type=unsupported|sort=unsafe|dir=sideways|page=-2/,
  );
});
