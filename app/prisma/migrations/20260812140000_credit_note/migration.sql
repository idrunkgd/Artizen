-- Note de crédit : auto-relation Invoice -> Invoice (l'avoir annule une facture).
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "creditNoteOfId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Invoice_creditNoteOfId_idx" ON "Invoice"("creditNoteOfId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Invoice_creditNoteOfId_fkey') THEN
    ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_creditNoteOfId_fkey"
      FOREIGN KEY ("creditNoteOfId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
