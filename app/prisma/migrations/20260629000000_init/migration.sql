-- Schéma initial Artizen — multi-tenant.
-- À jouer via `pnpm prisma migrate deploy` après création du Postgres.
-- Vu la taille (40+ tables), pour rester maintenable on régénère cette
-- migration une fois Postgres branché, en faisant :
--     pnpm prisma migrate dev --name init
-- ce qui produit le SQL exact correspondant au schema.prisma. Ce fichier
-- est un placeholder pour le squelette de répertoire des migrations.

-- Si tu lances pnpm prisma migrate deploy sans avoir d'abord généré ce SQL,
-- Prisma va échouer. Pour le déploiement initial :
-- 1) En local, branche un Postgres temporaire
-- 2) Lance `pnpm prisma migrate dev --name init`
-- 3) Commit le SQL généré ici
-- 4) Push, Coolify pourra appliquer en prod via migrate deploy

-- Alternative rapide : utilise `prisma db push` une seule fois en prod
-- pour synchroniser le schéma sans migration formelle. Pas recommandé
-- en pratique production mais OK pour bootstrap.
