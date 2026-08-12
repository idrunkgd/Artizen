"use server";
/**
 * CRUD du catalogue d'articles fournisseur (CatalogItem).
 *
 * Chaque article appartient à un fournisseur. Multi-tenant strict :
 * on vérifie à chaque opération que le fournisseur appartient bien à
 * l'organisation courante avant toute écriture.
 */
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireOrganization } from "@/lib/session";

const CatalogItemSchema = z.object({
  supplierId: z.string().min(1),
  reference: z.string().min(1, "Référence requise").trim(),
  label: z.string().min(1, "Libellé requis").trim(),
  unit: z.string().default("u"),
  unitPriceHt: z.coerce.number().nonnegative().default(0),
  vatRate: z.coerce.number().min(0).max(50).default(21),
  notes: z.string().optional().nullable(),
  isActive: z
    .union([z.boolean(), z.string()])
    .transform((v) => (typeof v === "string" ? v === "on" || v === "true" : v))
    .default(true)
});

async function assertSupplierBelongsToOrg(supplierId: string, organizationId: string) {
  const exists = await prisma.supplier.findFirst({
    where: { id: supplierId, organizationId },
    select: { id: true }
  });
  if (!exists) throw new Error("Fournisseur introuvable");
}

export async function createCatalogItem(formData: FormData) {
  const { organizationId } = await requireOrganization();
  const data = CatalogItemSchema.parse(Object.fromEntries(formData));
  await assertSupplierBelongsToOrg(data.supplierId, organizationId);
  const item = await prisma.catalogItem.create({
    data: { ...data, organizationId }
  });
  revalidatePath(`/fournisseurs/${data.supplierId}`);
  revalidatePath("/catalogue");
  return { ok: true, id: item.id };
}

export async function updateCatalogItem(id: string, formData: FormData) {
  const { organizationId } = await requireOrganization();
  const existing = await prisma.catalogItem.findFirst({
    where: { id, organizationId },
    select: { id: true, supplierId: true }
  });
  if (!existing) throw new Error("Article introuvable");
  const data = CatalogItemSchema.parse(Object.fromEntries(formData));
  // Refuser de changer de fournisseur via update (créer un nouvel article)
  await prisma.catalogItem.update({
    where: { id },
    data: {
      reference: data.reference,
      label: data.label,
      unit: data.unit,
      unitPriceHt: data.unitPriceHt,
      vatRate: data.vatRate,
      notes: data.notes ?? null,
      isActive: data.isActive
    }
  });
  revalidatePath(`/fournisseurs/${existing.supplierId}`);
  revalidatePath("/catalogue");
  return { ok: true };
}

export async function deleteCatalogItem(id: string) {
  const { organizationId } = await requireOrganization();
  const existing = await prisma.catalogItem.findFirst({
    where: { id, organizationId },
    select: { id: true, supplierId: true, _count: { select: { quoteLines: true, orderLines: true } } }
  });
  if (!existing) throw new Error("Article introuvable");
  // Si l'article est référencé sur un devis ou une commande, on le désactive
  // au lieu de le supprimer (préserver l'historique). Sinon on supprime sec.
  if (existing._count.quoteLines + existing._count.orderLines > 0) {
    await prisma.catalogItem.update({ where: { id }, data: { isActive: false } });
  } else {
    await prisma.catalogItem.delete({ where: { id } });
  }
  revalidatePath(`/fournisseurs/${existing.supplierId}`);
  revalidatePath("/catalogue");
  return { ok: true };
}

/**
 * Recherche d'articles dans le catalogue pour le picker du devis.
 * `q` peut matcher la référence ou le libellé ; on filtre les actifs.
 */
export async function searchCatalogItems(q: string) {
  const { organizationId } = await requireOrganization();
  const query = (q ?? "").trim();
  if (query.length < 1) {
    // Si pas de query, on renvoie les 30 plus récents (utile pour la 1re ouverture)
    return prisma.catalogItem.findMany({
      where: { organizationId, isActive: true },
      include: { supplier: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 30
    });
  }
  return prisma.catalogItem.findMany({
    where: {
      organizationId,
      isActive: true,
      OR: [
        { reference: { contains: query, mode: "insensitive" } },
        { label: { contains: query, mode: "insensitive" } },
        { supplier: { name: { contains: query, mode: "insensitive" } } }
      ]
    },
    include: { supplier: { select: { name: true } } },
    orderBy: [{ supplier: { name: "asc" } }, { label: "asc" }],
    take: 50
  });
}
