# RepairFlow Testing Guide

This document explains the testing setup and strategies for the RepairFlow platform.

## Backend Tests (NestJS)

The API is tested using Jest. We use it for both Unit Tests and Integration Tests.

- **Run unit tests**: `npm run test`
- **Run e2e tests**: `npm run test:e2e` (Uses Supertest to test API routes, controllers, and validation pipes)

Test files are located alongside their respective services (`*.spec.ts`), while E2E tests are located in `apps/api/test/`. Note that while some E2E tests use mocked Prisma, `branch-isolation.e2e-spec.ts` connects to a real database to fully test SQL isolation and composite foreign key integrity.

## Frontend Tests (Next.js)

The frontend is tested using Vitest and React Testing Library.

- **Run tests**: `npm run test`
- **Watch mode**: `npm run test:watch`

Test files are located alongside components (`*.spec.tsx`).

## E2E Tests (Playwright)

Full end-to-end testing across both frontend and backend is handled by Playwright in the `apps/e2e` package.

- **Run tests**: `npm run test`

### Shared utilities

| File | Purpose |
|------|---------|
| `apps/e2e/utils/auth.ts` | `loginAs(page, email, password?)` — shared login helper |
| `apps/e2e/utils/api-assertions.ts` | `waitForApiResponse` / `expectSuccessfulResponse` — assert HTTP status before checking UI |

### Synchronization rules

Tests **must** synchronize on observable events. **Never** use arbitrary delays:

```typescript
// ✅ Correct — synchronize on the API response
const responsePromise = waitForApiResponse(page, "POST", "/customers");
await page.click('button[type="submit"]');
await expectSuccessfulResponse(await responsePromise, 201);

// ✅ Correct — wait for URL change
await expect(page).toHaveURL(/dashboard/);

// ✅ Correct — wait for visible UI state
await expect(page.getByText("Customer registered successfully!")).toBeVisible();

// ❌ PROHIBITED — arbitrary sleep
await page.waitForTimeout(1000);
```

The `loginAs` helper synchronizes on the POST-login `/auth/me` 200 response, not on `networkidle` (which is unreliable when background queries are active).
