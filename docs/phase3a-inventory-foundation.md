# Phase 3A: Inventory Data Foundation

## Objective
Establish a production-safe, forward-only database foundation for the Phase 3 Inventory module, encompassing the Parts Catalogue, Supplier Management, Branch Inventory Balances, and the Stock Movement Ledger. This phase focuses solely on data structures and database-level constraints. Application logic and REST endpoints are deliberately out of scope for Phase 3A.

## Included Models
* `Part`: The global catalogue of repair parts (SKU, name, manufacturer, unit).
* `Supplier`: Branch-owned entities from which parts are purchased.
* `BranchInventory`: Branch-specific balances (on-hand, reserved, reorder levels).
* `StockMovement`: Immutable ledger recording all inventory delta changes.
* `BranchSequenceCounter`: Sequences used for PO and request numbering.

## Global vs. Branch-Owned Data
* **Global Data:** `Part`. Parts are a universal catalogue shared across all branches to avoid duplicate part definitions.
* **Branch-Owned Data:** `Supplier`, `BranchInventory`, `StockMovement`, `BranchSequenceCounter`. These records belong strictly to one `branchId`.

## Normalization Rules
To prevent inconsistent data and duplication at the application level, future services MUST enforce:
1. **SKU Normalization:** `skuNormalized` must be the `sku` converted to UPPERCASE, with leading/trailing whitespace removed.
2. **Supplier Normalization:** `nameNormalized` must be the `name` converted to UPPERCASE, with leading/trailing whitespace removed.

Database unique constraints rely on these normalized fields.

## Quantity Invariants
Branch inventory is protected by strict PostgreSQL `CHECK` constraints to ensure data integrity, independent of the application layer.
* `onHandQuantity >= 0`
* `reservedQuantity >= 0`
* `reorderLevel >= 0`
* `reservedQuantity <= onHandQuantity`
* `version >= 1` (Used for optimistic concurrency locking).

## Stock Movement Immutability and Consistency
StockMovement immutability is currently application-enforced. The inventory service will expose create/read operations only and will not provide normal update or delete workflows for ledger entries. Database foreign-key restrictions preserve referenced records, but they do not independently prohibit direct SQL updates or deletes to StockMovement.

* Mathematical constraints enforce that `onHandAfter = onHandBefore + onHandDelta` and similarly for `reserved` quantities.
* The before and after values must never drop below 0.
* **Consistency Guarantee:** We use a composite foreign key (`branchId, partId`) directly referencing the `BranchInventory` table. This PostgreSQL constraint structurally guarantees that a stock movement cannot reference an inventory record from one branch and a part from a different branch.

## Foreign Key Deletion Policy
Historical and financial inventory relationships use a `Restrict` deletion policy (`onDelete: Restrict`).
* We do not cascade-delete stock movements, parts referenced in inventory history, or suppliers containing historical business data.
* To "delete" master data, the application layer should prefer setting `isActive` or `status = INACTIVE` (deactivation over destructive deletion).

## Migration Strategy
The Phase 3A migration (`phase3a_inventory_foundation`) is an additive, forward-only migration generated from the updated Prisma schema. `CHECK` constraints were manually appended to the generated SQL before application.

## Concurrency Considerations
* Inventory adjustments should rely on Prisma's atomic operations (e.g. `increment: { onHandQuantity: 5 }`) or optimistic locking via the `version` field.
* `BranchSequenceCounter` updates must occur within serialized transactions to prevent sequence duplication.

## Out of Scope
This phase does NOT include:
* REST API endpoints or controllers.
* UI components or screens.
* Purchase Order or Part Request workflows.

## Validation Commands
```bash
pnpm --filter api exec prisma format
pnpm --filter api exec prisma validate
pnpm --filter api exec prisma generate
pnpm lint
pnpm --filter api test:ci
pnpm --filter api test:e2e
```
