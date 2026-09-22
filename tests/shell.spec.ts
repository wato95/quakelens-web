import { expect, test } from "@playwright/test";

test("renders the shell without horizontal overflow", async ({ page }, testInfo) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "2026 earthquakes" })).toBeVisible();
  await expect(page.getByText("Coverage: 2026 preview")).toBeVisible();

  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflows).toBe(false);

  const details = page.locator("#event-detail");
  if (testInfo.project.name === "mobile-chromium") {
    await expect(details).toBeHidden();
    await page.getByRole("button", { name: "Event details", exact: true }).click();
    await expect(details).toBeVisible();
    await expect(
      details.getByRole("button", { name: "Close event details" }),
    ).toBeFocused();

    const bounds = await details.boundingBox();
    expect(bounds).not.toBeNull();
    expect(Math.round((bounds?.y ?? 0) + (bounds?.height ?? 0))).toBeGreaterThanOrEqual(
      page.viewportSize()?.height ?? 0,
    );

    await details.getByRole("button", { name: "Close event details" }).click();
    await expect(details).toBeHidden();
    await expect(
      page.getByRole("button", { name: "Event details", exact: true }),
    ).toBeFocused();
  } else {
    await expect(details).toBeVisible();
  }
});

test("provides visible keyboard focus and reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: "Skip to earthquake browser" });
  await expect(skipLink).toBeFocused();

  const outlineStyle = await skipLink.evaluate(
    (element) => getComputedStyle(element).outlineStyle,
  );
  expect(outlineStyle).toBe("solid");

  const reducedDuration = await page
    .locator("button.detail-trigger")
    .evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).transitionDuration),
    );
  expect(reducedDuration).toBeLessThanOrEqual(0.001);
});
