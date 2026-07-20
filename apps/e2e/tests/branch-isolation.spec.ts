import { test, expect } from "@playwright/test";
import { loginAs } from "../utils/auth";
import {
  waitForApiResponse,
  expectSuccessfulResponse,
} from "../utils/api-assertions";

test("Phase 2B Branch Isolation Workflow", async ({ page }) => {
  page.on("console", (msg) => console.log("BROWSER LOG:", msg.text()));

  // --- 1. Login as Branch A Front Desk ---
  await loginAs(page, "front.a@repairflow.com");

  // --- 2. Create Customer in Branch A ---
  await page.click("text=Customers");
  await expect(page).toHaveURL(/.*customers/);
  await page.click("text=Add Customer");

  const randSuffix = Math.random().toString(36).substring(7);
  const customerName = `Isolation Cust ${randSuffix}`;
  const customerPhone = `+1555${Date.now().toString().slice(-6)}`;

  await page.fill('input[placeholder="e.g. John Doe"]', customerName);
  await page.fill('input[placeholder="e.g. +15551122"]', customerPhone);

  // Assert POST response before checking UI.
  const customerResponsePromise = waitForApiResponse(page, "POST", "/customers");
  await page.click('button[type="submit"]:has-text("Register")');
  const customerResponse = await customerResponsePromise;
  await expectSuccessfulResponse(customerResponse, 201);

  await expect(
    page.getByText("Customer registered successfully!"),
  ).toBeVisible();

  // Verify customer appears in Branch A list and open details.
  const customerItemA = page.getByRole("button", {
    name: new RegExp(customerName),
  });
  await expect(customerItemA).toBeVisible();
  await customerItemA.click();
  await expect(page.locator(`text=${customerName}`).first()).toBeVisible();

  // --- 3. Register Device under Customer ---
  await page.click("text=Devices");
  await expect(page).toHaveURL(/.*devices/);
  await page.click("text=Register Device");

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

  const deviceResponsePromise = waitForApiResponse(page, "POST", "/devices");
  await page.click('button[type="submit"]:has-text("Register")');
  await expectSuccessfulResponse(await deviceResponsePromise, 201);

  await expect(page.locator(`text=SN: SN-${randSuffix}`)).toBeVisible();

  // Logout Branch A Front Desk.
  await page.click("button:has-text('Logout')");
  await expect(page).toHaveURL(/.*login/);

  // --- 4. Login as Branch B Front Desk ---
  await loginAs(page, "front.b@repairflow.com");

  // --- 5. Verify Customer is NOT visible in Branch B ---
  await page.click("text=Customers");
  await expect(page).toHaveURL(/.*customers/);

  // Search for the customer — wait for a debounced query to settle.
  await page.fill(
    'input[placeholder="Search by phone, email, name..."]',
    customerName,
  );

  // Wait for the GET /customers response to confirm the query ran.
  await page.waitForResponse(
    (response) =>
      response.url().includes("/customers") &&
      response.request().method() === "GET" &&
      response.status() === 200,
  );

  const customerItemB = page.getByRole("button", {
    name: new RegExp(customerName),
  });
  await expect(customerItemB).not.toBeVisible();

  // Verify device is NOT visible globally.
  await page.click("text=Devices");
  await expect(page).toHaveURL(/.*devices/);
  await page.fill(
    'input[placeholder="Search by model, brand, serial..."]',
    `SN-${randSuffix}`,
  );

  await page.waitForResponse(
    (response) =>
      response.url().includes("/devices") &&
      response.request().method() === "GET" &&
      response.status() === 200,
  );

  await expect(page.locator("text=TestBrand")).not.toBeVisible();
});
