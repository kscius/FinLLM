import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("accessibility", () => {
  test("auth shell has no serious axe violations", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    const serious = results.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });

  test("landing visual smoke", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/FinLLM/);
    await expect(page.locator(".auth-card, .app-shell").first()).toBeVisible();
  });
});
