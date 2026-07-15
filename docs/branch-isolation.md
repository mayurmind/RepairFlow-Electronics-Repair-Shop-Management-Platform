# Branch Isolation Architecture

RepairFlow implements a multi-tenant-like data isolation strategy using **Branch Isolation**. This ensures that staff members at a particular repair branch can only access and modify data associated with that specific branch.

## How It Works

### 1. User Branch Assignment
When a user is created or updated, they are assigned to one or more branches. This relationship is stored in the `UserBranch` table in Prisma.
When a user authenticates, the JWT payload and the subsequent `AuthenticatedUser` object constructed by the `JwtStrategy` contains a `branches` property. This property holds an array of `AuthenticatedBranch` objects that represent the branches the user is authorized to access.

### 2. Authorization Guards
Access to routes is generally controlled by the `RolesGuard` (checking `actor.role`) and `BranchAccessGuard`. The `BranchAccessGuard` ensures that if a specific `branchId` is passed in a request body or URL parameter, the authenticated user must be a member of that branch (or hold an administrative role like `SYSTEM_ADMIN` or `OWNER`).

### 3. Service-Level Data Isolation
To prevent data leakage in list queries (e.g., fetching repair tickets, devices, customers, estimates, and invoices), all service methods inject a branch filter into the Prisma `where` clause.

For users who are **not** `SYSTEM_ADMIN` or `OWNER`, the services extract the user's branch IDs like so:
```typescript
const assignedBranchIds = actor.branches?.map(b => b.id) || [];
```
And then append a constraint to the database query:
```typescript
where.branchId = { in: assignedBranchIds };
```
For related entities like Customers and Devices that are shared across branches, the query checks whether the customer has tickets in the user's branch.

## Role Exceptions

- **`SYSTEM_ADMIN` & `OWNER`**: Have global visibility. They bypass branch isolation checks in the services and can view/manage data across all branches.
- **`TECHNICIAN`**: Has even stricter access. A technician can only view or interact with tickets explicitly assigned to them (`assignedTechnicianId = actor.id`).
