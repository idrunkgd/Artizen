-- Horaires début/fin sur les saisies d'heures (saisie manuelle + pointage chrono).
ALTER TABLE "TimesheetEntry" ADD COLUMN IF NOT EXISTS "startAt" TIMESTAMP(3);
ALTER TABLE "TimesheetEntry" ADD COLUMN IF NOT EXISTS "endAt" TIMESTAMP(3);
