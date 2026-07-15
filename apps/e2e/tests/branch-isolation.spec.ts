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

  // --- 3. Update Customer ---
  await page.click("text=Edit Profile");
  await page.fill('input[name="email"]', `test${randSuffix}@test.com`);
  await page.click('button[type="submit"]:has-text("Save")');
  await expect(page.locator(`text=test${randSuffix}@test.com`)).toBeVisible();

  // --- 4. Register Device ---
  await page.click("text=Register Device");
  await page.selectOption('select[name="category"]', "Smartphone");
  await page.fill('input[name="brand"]', "TestBrand");
  await page.fill('input[name="model"]', "TestModel");
  await page.fill('input[name="serialNumber"]', `SN-${randSuffix}`);
  await page.click('button[type="submit"]:has-text("Register")');
  
  // --- 5. Update Device ---
  // The device should be listed under devices tab
  await page.click('button:has-text("Devices (1)")');
  const deviceItem = page.locator('text=TestBrand TestModel');
  await expect(deviceItem).toBeVisible();
  
  // --- 6. Verify Repair History ---
  // We won't create a ticket, but we can verify the history tab is present
  await page.click('button:has-text("Repair History")');
  await expect(page.locator('text=No repair history found')).toBeVisible();

  // Logout Branch A Front Desk
  await page.click("button:has-text('Logout')");
  await expect(page).toHaveURL(/.*login/);

  // --- 7. Login as Branch B Front Desk ---
  await page.fill('input[type="email"]', "front.b@repairflow.com");
  await page.fill('input[type="password"]', "password123");
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/.*dashboard/);

  // --- 8. Verify Customer is NOT visible in Branch B ---
  await page.click("text=Customers");
  await expect(page).toHaveURL(/.*customers/);

  // Search for the customer
  await page.fill('input[placeholder="Search name, phone, or email..."]', customerName);
  await page.waitForTimeout(1000);

  // Verify customer is NOT in the list for Branch B
  const customerItemB = page.locator(`.flex-1.overflow-y-auto.divide-y button:has-text("${customerName}")`);
  await expect(customerItemB).not.toBeVisible();
  
  // Verify device is NOT visible globally
  await page.click("text=Devices");
  await expect(page).toHaveURL(/.*devices/);
  await page.fill('input[placeholder="Search by brand, model, serial, or IMEI..."]', `SN-${randSuffix}`);
  await page.waitForTimeout(1000);
  await expect(page.locator('text=TestBrand')).not.toBeVisible();
});
