# Artizen

Outil de gestion pour artisans indépendants du bâtiment. Multi-tenant (chaque boîte a son espace isolé), mobile-first, charte OR / NOIR.

## Stack

- **Frontend** : Next.js 14 App Router + React 18 + Tailwind CSS
- **Backend** : Server Actions + Prisma 5 + PostgreSQL
- **Auth** : NextAuth.js multi-tenant (Organization scoping)
- **PDF** : @react-pdf/renderer pour devis et factures
- **Hébergement** : Coolify + Docker (compatible Scaleway)

## Charte graphique

- Crème `#FAF8F1` (fond)
- Noir profond `#0a0a0a` (titres, boutons sombres)
- Or `#C9A227` (accent, boutons primaires)
- Or clair `#E5C46A` (highlights)

## Modules

| Module | Statut |
|--------|--------|
| Multi-tenant (boîte / équipe) | ✓ Schéma + auth |
| Auth + signup | ✓ MVP |
| Dashboard | ✓ MVP |
| Clients | ✓ MVP |
| Chantiers + photos | ✓ MVP |
| Devis | ⏳ Schéma seul |
| Factures + tranches | ⏳ Schéma seul |
| Timesheet | ⏳ Schéma seul |
| Matériel (stock) | ⏳ Schéma seul |
| Outillage | ⏳ Schéma seul |
| Commandes fournisseurs | ⏳ Schéma seul |

## Démarrage local

```bash
cd app
pnpm install
cp .env.example .env  # remplir DATABASE_URL et NEXTAUTH_SECRET
pnpm prisma migrate dev
pnpm dev
```

Ouvre http://localhost:3000.

## Déploiement Coolify

Cf. `app/Dockerfile`. Variables d'env requises :
- `DATABASE_URL` (PostgreSQL)
- `NEXTAUTH_SECRET` (random 32+ chars, générer via `openssl rand -hex 32`)
- `NEXTAUTH_URL` (URL publique, ex. https://artizen.dasolabs.be)
- `UPLOAD_STORAGE_PATH` (chemin volume pour photos chantier, ex. `/data/photos`)

Volume Docker requis :
- `/data/photos` (uid 1001 pour le user nextjs) — photos de chantier
