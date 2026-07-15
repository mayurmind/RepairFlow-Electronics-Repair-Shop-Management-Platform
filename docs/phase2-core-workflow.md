# Phase 2 Core Workflow: Branch Isolation, Customers, Devices, and Repair Tickets

## Overview

Phase 2 establishes the core operational pipeline of RepairFlow. It introduces database-enforced multi-tenant branch isolation, customer and device registry, and the full state machine for Repair Tickets. This phase guarantees that no customer, device, or repair ticket can bleed across branches, and that only authorized personnel can execute specific business processes.

## Branch Isolation Security Model

### Data Level
- **Composite Ownership**: `Customer`, `Device`, and `RepairTicket` all enforce `branchId` at the database level.
- **Constraints**: Constraints like `@@unique([branchId, email])`, `@@unique([branchId, phone])`, `@@unique([branchId, serialNumber])`, and `@@unique([branchId, imeiNumber])` ensure unique entities per branch.
- **Foreign Keys**: The schema leverages a composite foreign key on `RepairTicket` pointing to `Customer` and `Device` to prevent a ticket in Branch A from referencing a customer/device in Branch B.

### Application Level
- **Intake Consistency**: `RepairTicketsService.create()` validates that the given `customerId` and `deviceId` explicitly belong to the ticket's target `branchId`.
- **Duplicate Handling**: `CustomersService` and `DevicesService` wrap writes in a transaction and trap Prisma `P2002` (Unique Constraint Violation) errors. They safely translate these into `409 Conflict` exceptions without revealing data from other branches.
- **Scoped Histories**: Endpoints fetching a customer or device's repair history enforce `branchId` directly within the `findMany` Prisma query to guarantee zero leakage.

## Repair Ticket State Machine

Repair Tickets progress through an explicit state machine. Each state transition is validated against a Role-Based Access Control (RBAC) matrix and a valid transition path.

### Valid Status Transitions
- `RECEIVED` -> `DIAGNOSING`, `CANCELLED`
- `DIAGNOSING` -> `WAITING_FOR_APPROVAL`, `UNREPAIRABLE`, `CANCELLED`
- `WAITING_FOR_APPROVAL` -> `APPROVED`, `REJECTED`, `CANCELLED`
- `APPROVED` -> `REPAIR_IN_PROGRESS`
- `REPAIR_IN_PROGRESS` -> `READY_FOR_COLLECTION`, `PARTS_REQUIRED`
- `PARTS_REQUIRED` -> `REPAIR_IN_PROGRESS`
- `READY_FOR_COLLECTION` -> `DELIVERED`
- `REJECTED`, `UNREPAIRABLE` -> `READY_FOR_COLLECTION`
- `DELIVERED`, `CANCELLED` -> Terminal states (no further transitions)

### Role Permissions Matrix
Transitions are strictly governed by the `STATUS_TRANSITION_ROLES` mapping:
- `DIAGNOSING`: TECHNICIAN, BRANCH_MANAGER, OWNER, SYSTEM_ADMIN
- `WAITING_FOR_APPROVAL`: TECHNICIAN, BRANCH_MANAGER, OWNER, SYSTEM_ADMIN
- `APPROVED`: FRONT_DESK, BRANCH_MANAGER, OWNER, SYSTEM_ADMIN
- `REJECTED`: FRONT_DESK, BRANCH_MANAGER, OWNER, SYSTEM_ADMIN
- `CANCELLED`: FRONT_DESK, BRANCH_MANAGER, OWNER, SYSTEM_ADMIN
- `REPAIR_IN_PROGRESS`: TECHNICIAN, BRANCH_MANAGER, OWNER, SYSTEM_ADMIN
- `PARTS_REQUIRED`: TECHNICIAN, BRANCH_MANAGER, OWNER, SYSTEM_ADMIN
- `UNREPAIRABLE`: TECHNICIAN, BRANCH_MANAGER, OWNER, SYSTEM_ADMIN
- `READY_FOR_COLLECTION`: TECHNICIAN, BRANCH_MANAGER, OWNER, SYSTEM_ADMIN
- `DELIVERED`: FRONT_DESK, BRANCH_MANAGER, OWNER, SYSTEM_ADMIN

### Delivery Pipeline
Delivery is considered a financially and legally binding event.
- **Generic Bypass Prevention**: The generic `/status` endpoint strictly blocks `DELIVERED`.
- **Dedicated Endpoint**: Delivery must occur through `/deliver` to ensure capture of public delivery notes, actor identity, and delivery timestamps.
- **Immutability**: Once a ticket is `DELIVERED` or `CANCELLED`, all further modifications (including diagnostic changes) are universally rejected.

## Diagnostic Access
The `/diagnosis` endpoint enforces a strict security bound:
- **Assigned Technician**: The technician actively assigned to the ticket can submit diagnosis. Unassigned technicians are rejected.
- **System Admin**: Can act on behalf of anyone for support.
- **Managers/Owners**: Can view, but cannot inherently submit diagnostic findings on a technician's behalf.

## Known Limitations & Future Work
- **Estimates and Invoices**: Phase 2 does not include integrated billing or part usage estimations. Currently, tickets transition from `WAITING_FOR_APPROVAL` directly to `APPROVED`. Invoices will be added in Phase 4.
- **Part Inventory Deductions**: `PARTS_REQUIRED` indicates stock is needed, but the actual deduction logic will follow in Phase 3.
