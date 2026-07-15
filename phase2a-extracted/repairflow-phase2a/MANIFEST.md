# Phase 2A implementation manifest

## New contract and response files

- `apps/api/src/auth/types/authenticated-user.type.ts`
- `apps/api/src/common/types/authenticated-request.type.ts`
- `apps/api/src/common/dto/pagination-query.dto.ts`
- `apps/api/src/common/dto/api-response.dto.ts`
- `apps/api/src/common/dto/core-workflow-dto.spec.ts`
- `apps/api/src/customers/dto/create-customer.dto.ts`
- `apps/api/src/customers/dto/update-customer.dto.ts`
- `apps/api/src/customers/dto/find-customers-query.dto.ts`
- `apps/api/src/customers/dto/customer-response.dto.ts`
- `apps/api/src/devices/dto/create-device.dto.ts`
- `apps/api/src/devices/dto/update-device.dto.ts`
- `apps/api/src/devices/dto/find-devices-query.dto.ts`
- `apps/api/src/devices/dto/device-response.dto.ts`
- `apps/api/src/repair-tickets/dto/create-repair-ticket.dto.ts`
- `apps/api/src/repair-tickets/dto/find-repair-tickets-query.dto.ts`
- `apps/api/src/repair-tickets/dto/assign-technician.dto.ts`
- `apps/api/src/repair-tickets/dto/update-ticket-status.dto.ts`
- `apps/api/src/repair-tickets/dto/upsert-diagnosis.dto.ts`
- `apps/api/src/repair-tickets/dto/deliver-ticket.dto.ts`
- `apps/api/src/repair-tickets/dto/repair-ticket-response.dto.ts`
- `apps/api/src/repair-tickets/dto/diagnosis-response.dto.ts`

## Replacement files

- `apps/api/src/auth/decorators/current-user.decorator.ts`
- `apps/api/src/auth/strategies/jwt.strategy.ts`
- `apps/api/src/common/guards/branch.guard.ts`
- `apps/api/src/common/guards/role.guard.ts`
- `apps/api/src/customers/customers.controller.ts`
- `apps/api/src/devices/devices.controller.ts`
- `apps/api/src/repair-tickets/repair-tickets.controller.ts`

## Documentation

- `docs/phase2a-gap-analysis.md`
- `APPLY.md`
- `VALIDATION_REPORT.md`
