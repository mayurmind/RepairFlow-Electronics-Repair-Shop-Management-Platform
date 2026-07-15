# RepairFlow Phase 2A — Gap Analysis and Implementation Boundary

## Scope decision

Phase 2A establishes API contracts, validation, route-parameter safety, authenticated-user typing, Swagger request/response schemas, and an access-control typing foundation. It does **not** implement Phase 2B customer/device business behavior or Phase 2C ticket workflow changes.

## Existing foundation reused

- Global NestJS `ValidationPipe` with transformation, whitelist enforcement, and rejection of unknown properties.
- JWT authentication, role guard, branch guard, and `@CurrentUser()` decorator.
- Existing customer, device, and repair-ticket controllers/services.
- Existing Zod schemas as defence-in-depth inside services.
- Existing Prisma models and enums for users, branches, customers, devices, tickets, assignments, diagnosis, status history, and audit logs.
- Existing repair-ticket transition map, transaction-based ticket numbering, status history, assignment history, and audit logging.
- Existing Jest, Vitest, Playwright, Swagger, Prisma, and CI foundations.

## Phase 2 gaps found

### API contract gaps

- Customer, device, and ticket controllers accepted untyped request bodies and authenticated actors.
- Query parameters were individually parsed and not validated through typed DTOs.
- UUID route parameters were accepted as unchecked strings.
- Assignment accepted a single unvalidated body property instead of a DTO.
- Swagger documented operation summaries but not typed request and response contracts.
- Response envelopes were repeated manually and lacked reusable OpenAPI models.

### Validation gaps

- Customer phone validation in the service schema only enforced a minimum length.
- Device IMEI had no format validation.
- Pagination conversion used `Number(value) || default`, which silently converted invalid or zero values to defaults.
- Ticket date input was not guaranteed to be ISO-8601.
- Search strings and note fields did not have API-level maximum lengths.

### Access-foundation gaps

- JWT payload, authenticated user, Express request, role guard, and branch guard were untyped.
- Branch guard mapped branch records using `any`.
- Resource branch lookups selected full records where only `branchId` was required.
- Business services still need Phase 2B/2C query-level branch scoping review; guard-level checks alone are not sufficient.

### Business-rule gaps deferred to Phase 2B/2C

- Customer and device branch authorization rules are not yet consistently applied in Prisma queries.
- Customer and device duplicate rules need agreed normalized keys and database constraints.
- Ticket single-record lookup fetches first and authorizes second; Phase 2C should scope the Prisma query itself.
- Front-desk status permissions are incomplete.
- Delivered-ticket write blocking is incomplete outside reopen/delivery paths.
- Delivery currently checks invoice state even though invoices are deferred from Phase 2.
- Automatic diagnosis-to-unrepairable transition needs a matching audit entry for the status change.
- Ticket year generation is hard-coded to 2026.
- Sequence counter initialization/retry behavior needs concurrency and missing-counter tests.
- Internal-note projection must be explicitly removed from every customer-facing response.

## Missing tests on current main

No customer or device service/controller test files are present. Existing ticket tests do not cover the complete required Phase 2 matrix. Phase 2B/2C must add integration/service coverage for branch isolation, ownership, assignment restrictions, lifecycle permissions, audit/status history, delivered-ticket immutability, and delivery-state validation.

## Files in this Phase 2A pack

### Created

- `apps/api/src/common/dto/pagination-query.dto.ts`
- `apps/api/src/common/dto/api-response.dto.ts`
- `apps/api/src/common/dto/core-workflow-dto.spec.ts`
- Typed Swagger response DTOs for customers, devices, tickets, timelines, and diagnoses
- `apps/api/src/common/types/authenticated-request.type.ts`
- `apps/api/src/auth/types/authenticated-user.type.ts`
- Customer DTO files
- Device DTO files
- Repair-ticket DTO files

### Replacements

- `apps/api/src/auth/decorators/current-user.decorator.ts`
- `apps/api/src/auth/strategies/jwt.strategy.ts`
- `apps/api/src/common/guards/role.guard.ts`
- `apps/api/src/common/guards/branch.guard.ts`
- `apps/api/src/customers/customers.controller.ts`
- `apps/api/src/devices/devices.controller.ts`
- `apps/api/src/repair-tickets/repair-tickets.controller.ts`

## Phase 2A acceptance checks

1. No untyped body or actor parameters remain in the three core controllers.
2. Every core UUID route parameter uses `ParseUUIDPipe`.
3. List endpoints use typed query DTOs with page `>= 1` and limit `1..100`.
4. Unknown DTO properties are rejected by the existing global validation pipe.
5. Customer phone/email and device IMEI have API-level validation.
6. Ticket create DTO exposes no status field, preserving service-forced `RECEIVED`.
7. Authenticated user/request and guards are typed.
8. Swagger can infer request bodies and query parameters from DTOs.
9. Phase 2A validation tests cover the contract-level cases.
10. Phase 2B and Phase 2C remain unstarted.
