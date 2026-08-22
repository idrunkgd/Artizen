-- Sous-titre configurable affiché sous le nom de la boîte sur les PDF.
-- Valeur par défaut = comportement actuel (« Artisan du bâtiment »).
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "tagline" TEXT DEFAULT 'Artisan du bâtiment';
