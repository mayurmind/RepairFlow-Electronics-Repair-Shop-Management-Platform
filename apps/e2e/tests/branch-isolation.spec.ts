import { test, expect } from "@playwright/test";

test("Phase 2B Branch Isolation Workflow", async ({ page }) => {
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

  // Verify customer is in the list for Branch A and open details
  const customerItemA = page.locator(`.flex-1.overflow-y-auto.divide-y button:has-text("${customerName}")`);
  await expect(customerItemA).toBeVisible();
  
  // Click on customer to see details
  await customerItemA.click();
  await expect(page.locator(`text=${customerName}`).first()).toBeVisible();

  // --- 3. Register Device under Customer ---
  await page.click("text=Devices");
  await expect(page).toHaveURL(/.*devices/);
  await page.click("text=Register Device");

  // Select the newly created customer
  await page.selectOption('select:has-text("Choose Customer")', {
    label: `${customerName} (${customerPhone})`,
  });
  await page.fill(
    'input[placeholder="e.g. Phone, Tablet, Laptop, Console"]',
    "Mobile phone",
  );
  await page.fill('input[placeholder="e.g. Apple, Samsung"]', "TestBrand");
  await page.fill('input[placeholder="e.g. iPhone 15 Pro"]', "TestModel");
  await page.fill(
    'input[placeholder="e.g. DX4F82..."]',
    `SN-${randSuffix}`,
  );
  await page.click('button[type="submit"]:has-text("Register")');

  // Verify device registered
  await expect(page.locator(`text=SN: SN-${randSuffix}`)).toBeVisible();

  // Logout Branch A Front Desk
  await page.click("button:has-text('Logout')");
  await expect(page).toHaveURL(/.*login/);
  await page.waitForLoadState("networkidle");

  // --- 7. Login as Branch B Front Desk ---
  await page.fill('input[type="email"]', "front.b@repairflow.com");
  await page.fill('input[type="password"]', "password123");
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/.*dashboard/);

  // --- 8. Verify Customer is NOT visible in Branch B ---
  await page.click("text=Customers");
  await expect(page).toHaveURL(/.*customers/);

  // Search for the customer
  await page.fill('input[placeholder="Search by phone, email, name..."]', customerName);
  await page.waitForTimeout(1000);

  // Verify customer is NOT in the list for Branch B
  const customerItemB = page.locator(`.flex-1.overflow-y-auto.divide-y button:has-text("${customerName}")`);
  await expect(customerItemB).not.toBeVisible();
  
  // Verify device is NOT visible globally
  await page.click("text=Devices");
  await expect(page).toHaveURL(/.*devices/);
  await page.fill('input[placeholder="Search by model, brand, serial..."]', `SN-${randSuffix}`);
  await page.waitForTimeout(1000);
  await expect(page.locator('text=TestBrand')).not.toBeVisible();
});
