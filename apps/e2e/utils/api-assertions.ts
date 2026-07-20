import { expect, Page, Response } from "@playwright/test";

/**
 * Register a response interceptor for a specific API call BEFORE triggering
 * the action that sends the request, then return the Promise.
 *
 * Usage:
 *   const p = waitForApiResponse(page, "POST", "/customers");
 *   await page.click('button[type="submit"]');
 *   const res = await p;
 *   await expectSuccessfulResponse(res, 201);
 *
 * @param page    Playwright Page object.
 * @param method  HTTP method (uppercase), e.g. "POST", "GET".
 * @param path    URL path fragment to match, e.g. "/customers".
 */
export function waitForApiResponse(
  page: Page,
  method: string,
  path: string,
): Promise<Response> {
  return page.waitForResponse(
    (response) =>
      response.request().method() === method.toUpperCase() &&
      response.url().includes(path),
  );
}

/**
 * Assert that an API response has the expected HTTP status code.
 * Includes the full response body in the failure message so you can see
 * the actual validation error without digging through logs.
 *
 * @param response       Playwright Response object.
 * @param expectedStatus Expected HTTP status code.
 */
export async function expectSuccessfulResponse(
  response: Response,
  expectedStatus: number,
): Promise<void> {
  const body = await response.text();
  expect(
    response.status(),
    `Unexpected API response (${response.url()}): ${body}`,
  ).toBe(expectedStatus);
}
