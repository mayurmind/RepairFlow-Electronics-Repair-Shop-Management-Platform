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
const assignedBranchIds = actor.branches?.map((b) => b.id) || [];
```

And then append a constraint to the database query:

```typescript
where.branchId = { in: assignedBranchIds };
```

For related entities like Customers and Devices, ownership is strictly enforced via a `branchId` column directly on those models. To prevent orphaned or cross-branch data corruption, the `Device` model employs a composite foreign key to the `Customer` model: `@relation(fields: [customerId, branchId], references: [id, branchId])`. This guarantees that a Device and its Customer always belong to the same branch at the database level.

## Role Exceptions

- **`SYSTEM_ADMIN` & `OWNER`**: Have global visibility. They bypass branch isolation checks in the services and can view/manage data across all branches.
- **`TECHNICIAN`**: Has even stricter access. A technician can only view or interact with tickets explicitly assigned to them (`assignedTechnicianId = actor.id`).

---

## Customer Creation: branchId Contract

Customer creation (`POST /customers`) requires a `branchId` field that binds the new record to a branch.

### Design rule

```
branchId is application context — not user input.
```

- **Frontend**: The `branchId` is derived from the authenticated user's active-branch context (`activeBranchId` from `AuthProvider`). It is injected into the request body at submission time and is **never exposed as an editable form field**.
- **Guard**: `BranchAccessGuard` verifies the actor is a member of the supplied `branchId` before the request reaches the service layer. If not, the response is `403 Forbidden`.
- **Service**: `CustomersService` confirms the resolved branch `isActive = true`. An inactive branch returns `400 Bad Request`.
- **Schema**: `createCustomerSchema` requires `branchId` to be a valid UUID. Missing or malformed values return `400 Bad Request`.

### Frontend implementation pattern

```typescript
// In customers/page.tsx
const customerFormSchema = createCustomerSchema.omit({ branchId: true });

const createCustomerMutation = useMutation({
  mutationFn: (data) => {
    if (!activeBranchId) {
      throw new Error("Please select an active branch before registering a customer.");
    }
    return apiClient.post("/customers", { ...data, branchId: activeBranchId });
  },
});
```

The Register button is disabled when `activeBranchId` is null, preventing submission in the no-branch-selected state.
