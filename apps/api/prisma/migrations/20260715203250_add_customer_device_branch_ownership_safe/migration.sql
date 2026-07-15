-- DropForeignKey
ALTER TABLE "Device" DROP CONSTRAINT "Device_customerId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "Customer_phone_idx";

-- DropIndex
DROP INDEX IF EXISTS "Customer_email_idx";

-- DropIndex
DROP INDEX IF EXISTS "Device_serialNumber_idx";

-- DropIndex
DROP INDEX IF EXISTS "Device_imeiNumber_idx";

-- AlterTable (ADD COLUMNS as NULLABLE first)
ALTER TABLE "Customer" ADD COLUMN "branchId" TEXT;
ALTER TABLE "Device" ADD COLUMN "branchId" TEXT;

-- Safe Migration Backfill Logic
DO $$
DECLARE
  ambiguous_count INT;
  default_branch_id TEXT;
BEGIN
  -- 1. Check for ambiguities (customers with tickets in multiple branches)
  SELECT COUNT(*) INTO ambiguous_count
  FROM (
    SELECT "customerId"
    FROM "RepairTicket"
    GROUP BY "customerId"
    HAVING COUNT(DISTINCT "branchId") > 1
  ) as subq;

  IF ambiguous_count > 0 THEN
    RAISE EXCEPTION 'Cannot migrate automatically: % customers belong to multiple branches.', ambiguous_count;
  END IF;

  -- 2. Get a fallback branch for customers without tickets
  SELECT id INTO default_branch_id FROM "Branch" ORDER BY "createdAt" ASC LIMIT 1;

  -- 3. Update Customer branchId based on existing tickets
  UPDATE "Customer" c
  SET "branchId" = COALESCE(
    (SELECT "branchId" FROM "RepairTicket" rt WHERE rt."customerId" = c.id LIMIT 1),
    default_branch_id
  );

  -- 4. Update Device branchId to match its Customer's branchId
  UPDATE "Device" d
  SET "branchId" = (SELECT "branchId" FROM "Customer" c WHERE c.id = d."customerId");

END $$;

-- Make columns NOT NULL
ALTER TABLE "Customer" ALTER COLUMN "branchId" SET NOT NULL;
ALTER TABLE "Device" ALTER COLUMN "branchId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Customer_branchId_idx" ON "Customer"("branchId");
CREATE UNIQUE INDEX "Customer_id_branchId_key" ON "Customer"("id", "branchId");
CREATE UNIQUE INDEX "Customer_branchId_phone_key" ON "Customer"("branchId", "phone");
CREATE UNIQUE INDEX "Customer_branchId_email_key" ON "Customer"("branchId", "email");

-- CreateIndex
CREATE INDEX "Device_branchId_idx" ON "Device"("branchId");
CREATE INDEX "Device_branchId_customerId_idx" ON "Device"("branchId", "customerId");
CREATE UNIQUE INDEX "Device_branchId_serialNumber_key" ON "Device"("branchId", "serialNumber");
CREATE UNIQUE INDEX "Device_branchId_imeiNumber_key" ON "Device"("branchId", "imeiNumber");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_customerId_branchId_fkey" FOREIGN KEY ("customerId", "branchId") REFERENCES "Customer"("id", "branchId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
