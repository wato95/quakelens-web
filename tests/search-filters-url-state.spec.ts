import { expect, test } from "@playwright/test";

test("restores a selected event and active filters from a share URL", async ({
  page,
}) => {
  await page.goto("/?range=full&minMag=6&maxDepth=20");
  await expect(page.getByLabel("Minimum magnitude")).toHaveValue("6", {
    timeout: 30_000,
  });
  await expect(page.getByLabel("Maximum depth (km)")).toHaveValue("20");

  const results = page.getByRole("list", { name: /earthquake results/i });
  const event = results.getByRole("button").first();
  await event.click();
  await expect(page).toHaveURL(/event=/);
  const sharedUrl = page.url();

  await page.goto(sharedUrl);
  await expect(page.getByLabel("Minimum magnitude")).toHaveValue("6");
  await expect(page.getByLabel("Maximum depth (km)")).toHaveValue("20");
  await expect(
    page
      .getByRole("list", { name: /earthquake results/i })
      .getByRole("button")
      .first(),
  ).toHaveAttribute("aria-pressed", "true");
});

test("uses browser history to restore filter state", async ({ page }) => {
  await page.goto("/?range=full");
  await expect(page.getByLabel("Minimum magnitude")).toBeVisible({
    timeout: 30_000,
  });
  await page.getByLabel("Minimum magnitude").fill("6");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/minMag=6/);

  await page.goBack();
  await expect(page).not.toHaveURL(/minMag=/);
  await expect(page.getByLabel("Minimum magnitude")).toHaveValue("", {
    timeout: 30_000,
  });

  await page.goForward();
  await expect(page.getByLabel("Minimum magnitude")).toHaveValue("6", {
    timeout: 30_000,
  });
});

test("distinguishes Census place context from global event text search", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByLabel("Find a U.S. Census place")).toBeEnabled({
    timeout: 30_000,
  });
  await expect(
    page.getByText(/not a global gazetteer or population exposure/i),
  ).toBeVisible();
  await page.getByLabel("Find a U.S. Census place").fill("Paris");
  await page.getByRole("button", { name: "Find place" }).click();
  const places = page.getByRole("list", { name: "U.S. Census place results" });
  await expect(places).toBeVisible();
  const place = places.getByRole("button").first();
  await place.click();
  await expect(place).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel(/interactive earthquake map/i)).toBeVisible();
});

test("normalizes invalid and out-of-coverage URL state without crashing", async ({
  page,
}) => {
  await page.goto(
    "/?from=1900-01-01&to=2099-12-31&minMag=invalid&type=unsupported&event=missing",
  );
  await expect(page.getByLabel("Event location text")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByLabel("Start date (UTC)")).toHaveValue("2026-01-01");
  await expect(page.getByLabel("End date (UTC, inclusive)")).toHaveValue("2026-08-31");
  await expect(page).not.toHaveURL(/event=missing|minMag=invalid|type=unsupported/);
});
