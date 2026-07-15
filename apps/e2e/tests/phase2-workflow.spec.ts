import { test, expect } from "@playwright/test";

test("Phase 2 core workflow E2E test", async ({ page }) => {
  page.on("console", (msg) => console.log("BROWSER LOG:", msg.text()));
  // --- 1. Login as Front Desk ---
  await page.goto("/login");
  await page.fill('input[type="email"]', "front.a@repairflow.com");
  await page.fill('input[type="password"]', "password123");
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/.*dashboard/);

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
  await page.click('button[type="submit"]:has-text("Register")');

  // Verify customer is in the list
  const customerItem = page.locator(
    `.flex-1.overflow-y-auto.divide-y button:has-text("${customerName}")`,
  );
  await expect(customerItem).toBeVisible();

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
  await page.fill('input[placeholder="e.g. Apple, Samsung"]', "Google");
  await page.fill('input[placeholder="e.g. iPhone 15 Pro"]', "Pixel 8");
  await page.fill(
    'input[placeholder="e.g. DX4F82..."]',
    `SN-E2E-${randSuffix}`,
  );
  await page.click('button[type="submit"]:has-text("Register")');

  // Verify device registered
  await expect(page.locator(`text=SN: SN-E2E-${randSuffix}`)).toBeVisible();

  // --- 4. Create Repair Ticket ---
  await page.click("text=Tickets");
  await expect(page).toHaveURL(/.*tickets/);
  await page.click("text=Create Ticket");

  // Select customer and device
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
  await page.click('button[type="submit"]:has-text("Create Ticket")');

  // Wait for ticket creation and verify
  await expect(
    page.locator(`.grid :has-text("${customerName}")`).first(),
  ).toBeVisible();

  // --- 5. Logout Front Desk ---
  await page.click("button:has-text('Logout')");
  await expect(page).toHaveURL(/.*login/);
  await page.waitForLoadState("networkidle");

  // --- 6. Login as Manager ---
  await page.fill('input[type="email"]', "manager.a@repairflow.com");
  await page.fill('input[type="password"]', "password123");
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/.*dashboard/);

  // Navigate to tickets, select the ticket, and assign technician
  await page.click("text=Tickets");
  await expect(page).toHaveURL(/.*tickets/);

  // Click on the created ticket row/card to open detail drawer
  await page.click(`text=${customerName}`);
  await page.click("text=Assign Staff");

  await page.selectOption("#technician-select", { label: "Ted Tech A1" });
  await page.click("#confirm-assign-btn");
  await expect(
    page.locator("text=Technician assigned successfully!"),
  ).toBeVisible();

  // Logout Manager
  await page.click("button:has-text('Logout')");
  await expect(page).toHaveURL(/.*login/);
  await page.waitForLoadState("networkidle");

  // --- 7. Login as Technician ---
  await page.fill('input[type="email"]', "tech.a1@repairflow.com");
  await page.fill('input[type="password"]', "password123");
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/.*tickets/); // Technicians are routed to tickets directly

  // Click on the assigned ticket
  await page.click(`text=${customerName}`);

  // Start diagnosis (status update to DIAGNOSING)
  await page.click("#status-btn-DIAGNOSING");
  await page.fill(
    'input[placeholder="Explain status change to customer..."]',
    "Starting diagnosis",
  );
  await page.fill(
    'input[placeholder="Private internal log comments..."]',
    "Diagnosing board rails",
  );
  await page.click('button:has-text("Confirm Change")');
  await expect(
    page.locator("text=Ticket status updated successfully!"),
  ).toBeVisible();

  // Record diagnosis and transition to WAITING_FOR_APPROVAL
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
  await page.click('button:has-text("Submit findings")');
  await expect(
    page.locator("text=Diagnosis recorded successfully!"),
  ).toBeVisible();

  // Confirm timeline contains the updates
  await page.click("text=Timeline");
  await expect(page.locator(".relative.border-l")).toContainText("DIAGNOSING");
  await expect(page.locator(".relative.border-l")).toContainText(
    "WAITING_FOR_APPROVAL",
  );
});
