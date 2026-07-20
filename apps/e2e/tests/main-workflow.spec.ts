import { test, expect } from "@playwright/test";

test("main workflow", async ({ page }) => {
  // Go to home page
  await page.goto("/");
  await expect(page).toHaveTitle(/RepairFlow/);

  // Navigate to login (Staff Portal)
  await page.click("text=Staff Portal");
  await expect(page).toHaveURL(/.*login/);
});
