-- CreateEnum
CREATE TYPE "BillingType" AS ENUM ('FORFAIT', 'REGIE');

-- AlterTable : type de facturation du devis (forfait par défaut = comportement actuel)
ALTER TABLE "Quote" ADD COLUMN "billingType" "BillingType" NOT NULL DEFAULT 'FORFAIT';

-- AlterTable : lien heure de régie -> facture qui l'a couverte
ALTER TABLE "TimesheetEntry" ADD COLUMN "invoiceId" TEXT;

-- CreateIndex
CREATE INDEX "TimesheetEntry_invoiceId_idx" ON "TimesheetEntry"("invoiceId");

-- AddForeignKey
ALTER TABLE "TimesheetEntry" ADD CONSTRAINT "TimesheetEntry_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
