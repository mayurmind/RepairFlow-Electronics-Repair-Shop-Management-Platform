# RepairFlow Testing Guide

This document explains the testing setup and strategies for the RepairFlow platform.

## Backend Tests (NestJS)

The API is tested using Jest. We use it for both Unit Tests and Integration Tests.

- **Run unit tests**: `npm run test`
- **Run e2e tests**: `npm run test:e2e` (Uses Supertest to test API routes, controllers, and validation pipes)

Test files are located alongside their respective services (`*.spec.ts`), while E2E tests are located in `apps/api/test/`.

## Frontend Tests (Next.js)

The frontend is tested using Vitest and React Testing Library.

- **Run tests**: `npm run test`
- **Watch mode**: `npm run test:watch`

Test files are located alongside components (`*.spec.tsx`).

## E2E Tests (Playwright)

Full end-to-end testing across both frontend and backend is handled by Playwright in the `apps/e2e` package.

- **Run tests**: `npm run test`
