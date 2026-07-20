import { test, expect } from "@playwright/test";
import { loginAs } from "../utils/auth";
import {
  waitForApiResponse,
  expectSuccessfulResponse,
} from "../utils/api-assertions";

test("Phase 2 core workflow E2E test", async ({ page }) => {
  page.on("console", (msg) => console.log("BROWSER LOG:", msg.text()));

  // --- 1. Login as Front Desk ---
  await loginAs(page, "front.a@repairflow.com");

  // --- 2. Create Customer ---
  await page.click("text=Customers");
  await expect(page).toHaveURL(/.*customers/);
  await page.click("text=Add Customer");

  const randSuffix = Math.random().toString(36).substring(7);
  const customerName = `E2E Customer ${randSuffix}`;
  const customerPhone = `+1555${Date.now().toString().slice(-6)}`;

  await page.fill('input[placeholder="e.g. John Doe"]', customerName);
  await page.fill('input[placeholder="e.g. +15551122"]', customerPhone);
  await page.fill(
    'input[placeholder="e.g. customer@gmail.com"]',
    `e2e_${randSuffix}@gmail.com`,
  );
  await page.fill(
    'input[placeholder="Street details, city, postal code"]',
    "123 E2E Lane",
  );

  // Register interceptor BEFORE clicking — avoids race conditions.
  const customerResponsePromise = waitForApiResponse(page, "POST", "/customers");
  await page.click('button[type="submit"]:has-text("Register")');
  const customerResponse = await customerResponsePromise;

  // Assert actual HTTP status — surfaces backend validation errors immediately.
  await expectSuccessfulResponse(customerResponse, 201);

  await expect(
    page.getByText("Customer registered successfully!"),
  ).toBeVisible();

  await expect(
    page.getByRole("button", { name: new RegExp(customerName) }),
  ).toBeVisible();

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
  await page.fill('input[placeholder="e.g. Apple, Samsung"]', "Google");
  await page.fill('input[placeholder="e.g. iPhone 15 Pro"]', "Pixel 8");
  await page.fill(
    'input[placeholder="e.g. DX4F82..."]',
    `SN-E2E-${randSuffix}`,
  );

  const deviceResponsePromise = waitForApiResponse(page, "POST", "/devices");
  await page.click('button[type="submit"]:has-text("Register")');
  await expectSuccessfulResponse(await deviceResponsePromise, 201);

  await expect(page.locator(`text=SN: SN-E2E-${randSuffix}`)).toBeVisible();

  // --- 4. Create Repair Ticket ---
  await page.click("text=Tickets");
  await expect(page).toHaveURL(/.*tickets/);
  await page.click("text=Create Ticket");

  await page.selectOption('select:has-text("Choose Customer")', {
    label: `${customerName} (${customerPhone})`,
  });
  await page.selectOption('select:has-text("Choose Device")', {
    label: `Google Pixel 8 (SN: SN-E2E-${randSuffix})`,
  });
  await page.fill(
    'textarea[placeholder="Describe issues in detail..."]',
    "Screen cracked and completely black",
  );

  const ticketResponsePromise = waitForApiResponse(page, "POST", "/repair-tickets");
  await page.click('button[type="submit"]:has-text("Create Ticket")');
  await expectSuccessfulResponse(await ticketResponsePromise, 201);

  await expect(
    page.locator(`.grid :has-text("${customerName}")`).first(),
  ).toBeVisible();

  // --- 5. Logout Front Desk ---
  await page.click("button:has-text('Logout')");
  await expect(page).toHaveURL(/.*login/);

  // --- 6. Login as Manager ---
  await loginAs(page, "manager.a@repairflow.com");

  await page.click("text=Tickets");
  await expect(page).toHaveURL(/.*tickets/);

  await page.click(`text=${customerName}`);
  await page.click("text=Assign Staff");

  await page.selectOption("#technician-select", { label: "Ted Tech A1" });

  const assignResponsePromise = waitForApiResponse(page, "POST", "/assign");
  await page.click("#confirm-assign-btn");
  await expectSuccessfulResponse(await assignResponsePromise, 201);

  await expect(
    page.locator("text=Technician assigned successfully!"),
  ).toBeVisible();

  // Logout Manager
  await page.click("button:has-text('Logout')");
  await expect(page).toHaveURL(/.*login/);

  // --- 7. Login as Technician ---
  await loginAs(page, "tech.a1@repairflow.com", "password123", /tickets/);

  await page.click(`text=${customerName}`);

  await page.click("#status-btn-DIAGNOSING");
  await page.fill(
    'input[placeholder="Explain status change to customer..."]',
    "Starting diagnosis",
  );
  await page.fill(
    'input[placeholder="Private internal log comments..."]',
    "Diagnosing board rails",
  );

  const diagnosingResponsePromise = waitForApiResponse(page, "POST", "/status");
  await page.click('button:has-text("Confirm Change")');
  await expectSuccessfulResponse(await diagnosingResponsePromise, 201);

  await expect(
    page.locator("text=Ticket status updated successfully!"),
  ).toBeVisible();

  await page.click("#status-btn-WAITING_FOR_APPROVAL");
  await page.fill(
    'input[placeholder="e.g. Screen Replacement, Battery Degradation"]',
    "Screen Damage",
  );
  await page.fill(
    'textarea[placeholder="What is wrong with the device?"]',
    "Primary display digitizer is shattered",
  );
  await page.fill(
    'textarea[placeholder="What steps are required to resolve?"]',
    "Replace full front glass and OLED module",
  );
  await page.selectOption('select:has-text("Choose Feasibility")', {
    label: "Repairable",
  });

  const diagnosisResponsePromise = waitForApiResponse(page, "POST", "/diagnosis");
  await page.click('button:has-text("Submit findings")');
  await expectSuccessfulResponse(await diagnosisResponsePromise, 201);

  await expect(
    page.locator("text=Diagnosis recorded successfully!"),
  ).toBeVisible();

  await page.click("text=Timeline");
  await expect(page.locator(".relative.border-l")).toContainText("DIAGNOSING");
  await expect(page.locator(".relative.border-l")).toContainText(
    "WAITING_FOR_APPROVAL",
  );
});
