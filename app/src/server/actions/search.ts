"use server";
/**
 * Recherche globale (Cmd+K).
 *
 * On cherche en parallèle sur les principales entités du site, on plafonne
 * chaque source à ~5 résultats, et on renvoie une liste applatie typée pour
 * que le client puisse construire l'URL de destination sans rappeler le
 * serveur.
 *
 * Multi-tenant : chaque requête est scopée par organizationId via
 * requireOrganization().
 */
import { prisma } from "@/lib/db";
import { requireOrganization } from "@/lib/session";

export type SearchHit = {
  kind: "customer" | "project" | "quote" | "invoice" | "supplier" | "material" | "tool" | "catalog";
  id: string;
  href: string;
  title: string;
  subtitle?: string | null;
};

const PER_KIND = 5;

export async function globalSearch(query: string): Promise<SearchHit[]> {
  const q = (query ?? "").trim();
  if (q.length < 2) return [];
  const { organizationId } = await requireOrganization();

  // contains insensitive — Prisma propage à ILIKE côté Postgres
  const ic = (s: string) => ({ contains: s, mode: "insensitive" as const });

  const [customers, projects, quotes, invoices, suppliers, materials, tools, catalogItems] =
    await Promise.all([
      prisma.customer.findMany({
        where: {
          organizationId,
          OR: [
            { name: ic(q) },
            { email: ic(q) },
            { phone: ic(q) },
            { addresses: { some: { city: ic(q) } } },
            { addresses: { some: { street: ic(q) } } }
          ]
        },
        select: { id: true, name: true, email: true },
        take: PER_KIND,
        orderBy: { name: "asc" }
      }),
      prisma.project.findMany({
        where: {
          organizationId,
          OR: [
            { name: ic(q) },
            { reference: ic(q) },
            { siteCity: ic(q) },
            { customer: { is: { name: ic(q) } } }
          ]
        },
        select: { id: true, name: true, reference: true, status: true, customer: { select: { name: true } } },
        take: PER_KIND,
        orderBy: { updatedAt: "desc" }
      }),
      prisma.quote.findMany({
        where: {
          organizationId,
          OR: [
            { title: ic(q) },
            { reference: ic(q) },
            { customer: { name: ic(q) } }
          ]
        },
        select: { id: true, title: true, reference: true, status: true, customer: { select: { name: true } } },
        take: PER_KIND,
        orderBy: { updatedAt: "desc" }
      }),
      prisma.invoice.findMany({
        where: {
          organizationId,
          OR: [
            { title: ic(q) },
            { reference: ic(q) },
            { customer: { name: ic(q) } }
          ]
        },
        select: { id: true, title: true, reference: true, status: true, customer: { select: { name: true } } },
        take: PER_KIND,
        orderBy: { issueDate: "desc" }
      }),
      prisma.supplier.findMany({
        where: {
          organizationId,
          OR: [{ name: ic(q) }, { email: ic(q) }, { vatNumber: ic(q) }]
        },
        select: { id: true, name: true, email: true },
        take: PER_KIND,
        orderBy: { name: "asc" }
      }),
      prisma.material.findMany({
        where: {
          organizationId,
          OR: [{ name: ic(q) }, { description: ic(q) }]
        },
        select: { id: true, name: true, unit: true, description: true },
        take: PER_KIND,
        orderBy: { name: "asc" }
      }),
      prisma.tool.findMany({
        where: {
          organizationId,
          OR: [{ name: ic(q) }, { serialNumber: ic(q) }, { brand: ic(q) }]
        },
        select: { id: true, name: true, brand: true, location: true },
        take: PER_KIND,
        orderBy: { name: "asc" }
      }),
      prisma.catalogItem.findMany({
        where: {
          organizationId,
          OR: [
            { reference: ic(q) },
            { label: ic(q) },
            { supplier: { name: ic(q) } }
          ]
        },
        select: {
          id: true, reference: true, label: true, unit: true, isActive: true,
          supplier: { select: { id: true, name: true } }
        },
        take: PER_KIND,
        orderBy: { label: "asc" }
      })
    ]);

  const hits: SearchHit[] = [
    ...customers.map((c): SearchHit => ({
      kind: "customer", id: c.id, href: `/clients/${c.id}`,
      title: c.name, subtitle: c.email
    })),
    ...projects.map((p): SearchHit => ({
      kind: "project", id: p.id, href: `/chantiers/${p.id}`,
      title: p.name,
      subtitle: `${p.reference}${p.customer ? ` · ${p.customer.name}` : ""}`
    })),
    ...quotes.map((q): SearchHit => ({
      kind: "quote", id: q.id, href: `/devis/${q.id}`,
      title: q.title, subtitle: `${q.reference} · ${q.customer.name} · ${q.status}`
    })),
    ...invoices.map((i): SearchHit => ({
      kind: "invoice", id: i.id, href: `/factures/${i.id}`,
      title: i.title, subtitle: `${i.reference} · ${i.customer.name} · ${i.status}`
    })),
    ...suppliers.map((s): SearchHit => ({
      kind: "supplier", id: s.id, href: `/fournisseurs/${s.id}`,
      title: s.name, subtitle: s.email
    })),
    ...materials.map((m): SearchHit => ({
      kind: "material", id: m.id, href: `/materiel/${m.id}`,
      title: m.name,
      subtitle: m.description ? `${m.description} · ${m.unit}` : m.unit
    })),
    ...tools.map((t): SearchHit => ({
      kind: "tool", id: t.id, href: `/outillage/${t.id}`,
      title: t.name,
      subtitle: [t.brand, t.location].filter(Boolean).join(" · ") || null
    })),
    // Pour aller au catalogue, on renvoie sur la fiche fournisseur où
    // l'article est listé (pas de page individuelle pour un CatalogItem).
    ...catalogItems.map((c): SearchHit => ({
      kind: "catalog", id: c.id, href: `/fournisseurs/${c.supplier.id}`,
      title: `${c.reference} — ${c.label}`,
      subtitle: `${c.supplier.name} · /${c.unit}${c.isActive ? "" : " · inactif"}`
    }))
  ];

  return hits;
}
