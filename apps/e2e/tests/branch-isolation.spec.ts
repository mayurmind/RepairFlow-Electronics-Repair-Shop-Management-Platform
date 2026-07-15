import { test, expect } from "@playwright/test";

test("Phase 2B Branch Isolation E2E test", async ({ page }) => {
  page.on("console", (msg) => console.log("BROWSER LOG:", msg.text()));
  
  // --- 1. Login as Branch A Front Desk ---
  await page.goto("/login");
  await page.fill('input[type="email"]', "front.a@repairflow.com");
  await page.fill('input[type="password"]', "password123");
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/.*dashboard/);

  // --- 2. Create Customer in Branch A ---
  await page.click("text=Customers");
  await expect(page).toHaveURL(/.*customers/);
  await page.click("text=Add Customer");

  const randSuffix = Math.random().toString(36).substring(7);
  const customerName = `Isolation Cust ${randSuffix}`;
  const customerPhone = `+1555${Date.now().toString().slice(-6)}`;

  await page.fill('input[placeholder="e.g. John Doe"]', customerName);
  await page.fill('input[placeholder="e.g. +15551122"]', customerPhone);
  await page.click('button[type="submit"]:has-text("Register")');

  // Verify customer is in the list for Branch A
  const customerItemA = page.locator(
    `.flex-1.overflow-y-auto.divide-y button:has-text("${customerName}")`,
  );
  await expect(customerItemA).toBeVisible();

  // Logout Branch A Front Desk
  await page.click("button:has-text('Logout')");
  await expect(page).toHaveURL(/.*login/);

  // --- 3. Login as Branch B Front Desk ---
  await page.fill('input[type="email"]', "front.b@repairflow.com");
  await page.fill('input[type="password"]', "password123");
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/.*dashboard/);

  // --- 4. Verify Customer is NOT visible in Branch B ---
  await page.click("text=Customers");
  await expect(page).toHaveURL(/.*customers/);

  // Search for the customer
  await page.fill('input[placeholder="Search name, phone, or email..."]', customerName);
  // Wait a moment for debounced search
  await page.waitForTimeout(1000);

  // Verify customer is NOT in the list for Branch B
  const customerItemB = page.locator(
    `.flex-1.overflow-y-auto.divide-y button:has-text("${customerName}")`,
  );
  await expect(customerItemB).not.toBeVisible();
});
