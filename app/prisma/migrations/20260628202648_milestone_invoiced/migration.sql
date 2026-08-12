-- AlterTable
ALTER TABLE "QuoteMilestone" ADD COLUMN     "invoiceId" TEXT,
ADD COLUMN     "invoicedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "QuoteMilestone_invoiceId_idx" ON "QuoteMilestone"("invoiceId");

-- AddForeignKey
ALTER TABLE "QuoteMilestone" ADD CONSTRAINT "QuoteMilestone_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
