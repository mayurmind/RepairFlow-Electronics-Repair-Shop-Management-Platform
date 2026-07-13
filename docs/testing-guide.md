# RepairFlow Testing Guide

This document explains the testing setup and strategies for the RepairFlow platform.

## Backend Tests (NestJS)

The API is tested using Jest. We use it for both Unit Tests and Integration Tests.

- **Run unit tests**: `pnpm --filter api test`
- **Run e2e tests**: `pnpm --filter api test:e2e`

Test files are located alongside their respective services (`*.spec.ts`).

## Frontend Tests (Next.js)

The frontend is tested using Vitest and React Testing Library.

- **Run tests**: `pnpm --filter web test`
- **Watch mode**: `pnpm --filter web test:watch`

Test files are located alongside components (`*.spec.tsx`).

## E2E Tests (Playwright)

Full end-to-end testing across both frontend and backend is handled by Playwright in the `apps/e2e` package.

- **Run tests**: `pnpm --filter e2e test`
