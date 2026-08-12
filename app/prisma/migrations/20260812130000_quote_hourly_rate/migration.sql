-- Ajoute la colonne hourlyRate (taux horaire régie) sur Quote.
-- Migration séparée : la migration régie initiale (20260812120000_regie_billing)
-- avait déjà été appliquée en base sans cette colonne. `IF NOT EXISTS` rend
-- l'opération idempotente (sans effet si la colonne existe déjà, ex. base neuve).
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "hourlyRate" DECIMAL(10,2);
