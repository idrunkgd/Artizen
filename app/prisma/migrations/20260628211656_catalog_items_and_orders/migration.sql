-- AlterTable
ALTER TABLE "MaterialOrder" ADD COLUMN     "emailError" TEXT,
ADD COLUMN     "emailedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "MaterialOrderLine" ADD COLUMN     "catalogItemId" TEXT,
ADD COLUMN     "reference" TEXT,
ADD COLUMN     "sourceQuoteLineId" TEXT;

-- AlterTable
ALTER TABLE "QuoteLine" ADD COLUMN     "catalogItemId" TEXT;

-- CreateTable
CREATE TABLE "CatalogItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'u',
    "unitPriceHt" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "vatRate" DECIMAL(5,2) NOT NULL DEFAULT 21,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CatalogItem_organizationId_supplierId_idx" ON "CatalogItem"("organizationId", "supplierId");

-- CreateIndex
CREATE INDEX "CatalogItem_organizationId_reference_idx" ON "CatalogItem"("organizationId", "reference");

-- CreateIndex
CREATE INDEX "CatalogItem_organizationId_label_idx" ON "CatalogItem"("organizationId", "label");

-- CreateIndex
CREATE INDEX "MaterialOrder_organizationId_projectId_idx" ON "MaterialOrder"("organizationId", "projectId");

-- CreateIndex
CREATE INDEX "MaterialOrderLine_sourceQuoteLineId_idx" ON "MaterialOrderLine"("sourceQuoteLineId");

-- CreateIndex
CREATE INDEX "QuoteLine_catalogItemId_idx" ON "QuoteLine"("catalogItemId");

-- AddForeignKey
ALTER TABLE "CatalogItem" ADD CONSTRAINT "CatalogItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogItem" ADD CONSTRAINT "CatalogItem_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteLine" ADD CONSTRAINT "QuoteLine_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "CatalogItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialOrderLine" ADD CONSTRAINT "MaterialOrderLine_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "CatalogItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialOrderLine" ADD CONSTRAINT "MaterialOrderLine_sourceQuoteLineId_fkey" FOREIGN KEY ("sourceQuoteLineId") REFERENCES "QuoteLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;
