import { expect, Page } from "@playwright/test";

/**
 * Log in as a user and wait for the session to be fully established.
 *
 * Synchronization strategy:
 *   1. Submit the login form.
 *   2. Await the first POST-login GET /auth/me that returns HTTP 200.
 *   3. Assert the URL matches the expected post-login path.
 *
 * Do NOT use page.waitForTimeout() — synchronize on network events only.
 *
 * @param page      Playwright Page object.
 * @param email     Staff email address.
 * @param password  Password (defaults to "password123").
 * @param expectedPath  RegExp for the URL the app navigates to after login.
 */
export async function loginAs(
  page: Page,
  email: string,
  password = "password123",
  expectedPath: RegExp = /dashboard|customers|tickets/,
): Promise<void> {
  await page.goto("/login");

  // Use accessible label selectors where possible; fall back to type selectors.
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);

  // Register the response interceptor BEFORE clicking so we don't miss it.
  const sessionResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/auth/me") &&
      response.status() === 200,
  );

  await page.getByRole("button", { name: /sign in|login/i }).click();

  // Wait for the confirmed-authenticated session call.
  await sessionResponse;

  // The app should have navigated to the appropriate dashboard path.
  await expect(page).toHaveURL(expectedPath);
}
