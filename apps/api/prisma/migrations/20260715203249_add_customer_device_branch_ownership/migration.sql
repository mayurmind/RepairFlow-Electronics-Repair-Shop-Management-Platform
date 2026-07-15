-- DropForeignKey
ALTER TABLE "Attachment" DROP CONSTRAINT "Attachment_repairTicketId_fkey";

-- DropForeignKey
ALTER TABLE "Diagnosis" DROP CONSTRAINT "Diagnosis_repairTicketId_fkey";

-- DropForeignKey
ALTER TABLE "Estimate" DROP CONSTRAINT "Estimate_repairTicketId_fkey";

-- DropForeignKey
ALTER TABLE "EstimateDecision" DROP CONSTRAINT "EstimateDecision_estimateId_fkey";

-- DropForeignKey
ALTER TABLE "EstimateItem" DROP CONSTRAINT "EstimateItem_estimateId_fkey";

-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_repairTicketId_fkey";

-- DropForeignKey
ALTER TABLE "InvoiceItem" DROP CONSTRAINT "InvoiceItem_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentRecord" DROP CONSTRAINT "PaymentRecord_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "TechnicianAssignmentHistory" DROP CONSTRAINT "TechnicianAssignmentHistory_repairTicketId_fkey";

-- DropForeignKey
ALTER TABLE "TicketStatusHistory" DROP CONSTRAINT "TicketStatusHistory_repairTicketId_fkey";

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN "branchId" TEXT;

UPDATE "Customer" SET "branchId" = (SELECT id FROM "Branch" LIMIT 1) WHERE "branchId" IS NULL;

ALTER TABLE "Customer" ALTER COLUMN "branchId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Device" ADD COLUMN "branchId" TEXT;

UPDATE "Device" SET "branchId" = (SELECT id FROM "Branch" LIMIT 1) WHERE "branchId" IS NULL;

ALTER TABLE "Device" ALTER COLUMN "branchId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Estimate" ALTER COLUMN "currency" SET DEFAULT 'INR';

-- CreateIndex
CREATE INDEX "Customer_branchId_idx" ON "Customer"("branchId");

-- CreateIndex
CREATE INDEX "Customer_branchId_phone_idx" ON "Customer"("branchId", "phone");

-- CreateIndex
CREATE INDEX "Customer_branchId_email_idx" ON "Customer"("branchId", "email");

-- CreateIndex
CREATE INDEX "Device_branchId_idx" ON "Device"("branchId");

-- CreateIndex
CREATE INDEX "Device_branchId_customerId_idx" ON "Device"("branchId", "customerId");

-- CreateIndex
CREATE INDEX "Device_branchId_serialNumber_idx" ON "Device"("branchId", "serialNumber");

-- CreateIndex
CREATE INDEX "Device_branchId_imeiNumber_idx" ON "Device"("branchId", "imeiNumber");

-- CreateIndex
CREATE UNIQUE INDEX "EstimateDecision_estimateId_key" ON "EstimateDecision"("estimateId");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketStatusHistory" ADD CONSTRAINT "TicketStatusHistory_repairTicketId_fkey" FOREIGN KEY ("repairTicketId") REFERENCES "RepairTicket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicianAssignmentHistory" ADD CONSTRAINT "TechnicianAssignmentHistory_repairTicketId_fkey" FOREIGN KEY ("repairTicketId") REFERENCES "RepairTicket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Diagnosis" ADD CONSTRAINT "Diagnosis_repairTicketId_fkey" FOREIGN KEY ("repairTicketId") REFERENCES "RepairTicket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estimate" ADD CONSTRAINT "Estimate_repairTicketId_fkey" FOREIGN KEY ("repairTicketId") REFERENCES "RepairTicket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateItem" ADD CONSTRAINT "EstimateItem_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "Estimate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateDecision" ADD CONSTRAINT "EstimateDecision_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "Estimate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_repairTicketId_fkey" FOREIGN KEY ("repairTicketId") REFERENCES "RepairTicket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_repairTicketId_fkey" FOREIGN KEY ("repairTicketId") REFERENCES "RepairTicket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

