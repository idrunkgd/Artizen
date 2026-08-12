"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireOrganization } from "@/lib/session";

async function nextQuoteReference(organizationId: string) {
  const year = new Date().getFullYear();
  const prefix = `DEV-${year}-`;
  const last = await prisma.quote.findFirst({
    where: { organizationId, reference: { startsWith: prefix } },
    orderBy: { reference: "desc" },
    select: { reference: true }
  });
  const lastNum = last ? parseInt(last.reference.slice(prefix.length), 10) || 0 : 0;
  return `${prefix}${String(lastNum + 1).padStart(3, "0")}`;
}

const QuoteSchema = z.object({
  customerId: z.string().min(1),
  /// Adresse de chantier visée. Obligatoire dans le nouveau flow (un devis
  /// concerne TOUJOURS une adresse, plusieurs devis peuvent porter sur la
  /// même adresse, et le chantier est créé/associé à l'acceptation).
  customerAddressId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().optional().nullable().transform((v) => v?.trim() || null),
  billingType: z.enum(["FORFAIT", "REGIE"]).default("FORFAIT"),
  vatRate: z.coerce.number().min(0).max(50).default(21),
  validityDays: z.coerce.number().int().min(1).max(365).default(30),
  notes: z.string().optional().nullable().transform((v) => v?.trim() || null)
});

async function assertAddressBelongsToCustomer(addressId: string, customerId: string, organizationId: string) {
  const addr = await prisma.customerAddress.findUnique({
    where: { id: addressId },
    select: { customerId: true, customer: { select: { organizationId: true } } }
  });
  if (!addr) throw new Error("Adresse introuvable");
  if (addr.customerId !== customerId) throw new Error("Cette adresse n'appartient pas au client sélectionné");
  if (addr.customer.organizationId !== organizationId) throw new Error("Adresse hors de votre boîte");
}

export async function createQuote(formData: FormData) {
  const { organizationId } = await requireOrganization();
  const data = QuoteSchema.parse(Object.fromEntries(formData));
  await assertAddressBelongsToCustomer(data.customerAddressId, data.customerId, organizationId);
  const reference = await nextQuoteReference(organizationId);
  const q = await prisma.quote.create({
    data: { ...data, reference, organizationId, status: "DRAFT", totalHt: 0, totalTvac: 0 }
  });
  revalidatePath("/devis");
  return { ok: true, id: q.id };
}

export async function updateQuote(id: string, formData: FormData) {
  const { organizationId } = await requireOrganization();
  const data = QuoteSchema.parse(Object.fromEntries(formData));
  const existing = await prisma.quote.findFirst({ where: { id, organizationId } });
  if (!existing) throw new Error("Devis introuvable");
  await assertAddressBelongsToCustomer(data.customerAddressId, data.customerId, organizationId);
  await prisma.quote.update({ where: { id }, data });
  await recomputeQuoteTotals(id);
  revalidatePath(`/devis/${id}`);
  return { ok: true };
}

export async function deleteQuote(id: string) {
  const { organizationId } = await requireOrganization();
  const existing = await prisma.quote.findFirst({ where: { id, organizationId } });
  if (!existing) throw new Error("Devis introuvable");
  await prisma.quote.delete({ where: { id } });
  revalidatePath("/devis");
  return { ok: true };
}

async function nextProjectReference(organizationId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `CH-${year}-`;
  const last = await prisma.project.findFirst({
    where: { organizationId, reference: { startsWith: prefix } },
    orderBy: { reference: "desc" }, select: { reference: true }
  });
  const lastNum = last ? parseInt(last.reference.slice(prefix.length), 10) || 0 : 0;
  return `${prefix}${String(lastNum + 1).padStart(3, "0")}`;
}

/**
 * Changement de statut d'un devis.
 *
 * Pour ACCEPTED, on offre deux modes : créer un nouveau chantier (default)
 * ou associer le devis à un chantier existant à la même adresse (par ex.
 * un avenant qui s'ajoute au chantier déjà ouvert).
 *
 *   acceptOptions.mode = "NEW"      → crée un nouveau Project
 *   acceptOptions.mode = "EXISTING" → associe à acceptOptions.existingProjectId
 *                                       (qui doit être à la même adresse)
 *
 * Si options non fourni à l'acceptation et qu'il n'y a aucun projet à
 * l'adresse → mode "NEW" par défaut (pas de choix à faire).
 */
export async function setQuoteStatus(
  id: string,
  status: "DRAFT"|"SENT"|"ACCEPTED"|"REFUSED"|"EXPIRED"|"CANCELLED",
  acceptOptions?: { mode: "NEW" | "EXISTING"; existingProjectId?: string }
) {
  const { organizationId } = await requireOrganization();
  const existing = await prisma.quote.findFirst({
    where: { id, organizationId },
    include: { customerAddress: true }
  });
  if (!existing) throw new Error("Devis introuvable");
  const data: any = { status };
  if (status === "SENT" && !existing.sentAt) data.sentAt = new Date();
  if (status === "ACCEPTED" && !existing.acceptedAt) data.acceptedAt = new Date();

  let newProjectId: string | null = null;
  let linkedProjectId: string | null = null;

  if (status === "ACCEPTED" && !existing.projectId) {
    const mode = acceptOptions?.mode ?? "NEW";
    if (mode === "EXISTING" && acceptOptions?.existingProjectId) {
      // Vérifier que le projet existe, appartient à l'org, et est bien à
      // la même adresse (ou au moins même client) que ce devis.
      const proj = await prisma.project.findFirst({
        where: { id: acceptOptions.existingProjectId, organizationId }
      });
      if (!proj) throw new Error("Chantier existant introuvable");
      if (existing.customerAddressId && proj.customerAddressId &&
          existing.customerAddressId !== proj.customerAddressId) {
        throw new Error("Ce chantier n'est pas à la même adresse que le devis");
      }
      data.projectId = proj.id;
      linkedProjectId = proj.id;
    } else {
      // Crée un nouveau chantier à l'adresse du devis
      const reference = await nextProjectReference(organizationId);
      const project = await prisma.project.create({
        data: {
          organizationId,
          reference,
          name: existing.title,
          customerId: existing.customerId,
          customerAddressId: existing.customerAddressId,
          status: "ACTIVE",
          budgetEstimate: existing.totalHt,
          description: existing.description
        }
      });
      newProjectId = project.id;
      data.projectId = project.id;
    }
  }

  await prisma.quote.update({ where: { id }, data });
  revalidatePath(`/devis/${id}`);
  revalidatePath("/devis");
  if (newProjectId || linkedProjectId) {
    revalidatePath("/chantiers");
    revalidatePath(`/chantiers/${newProjectId ?? linkedProjectId}`);
    revalidatePath("/dashboard");
  }
  return { ok: true, newProjectId, linkedProjectId };
}

/**
 * Liste les chantiers existants à une adresse client donnée. Utilisé par la
 * modal d'acceptation pour proposer le choix d'un chantier existant.
 */
export async function listProjectsAtAddress(customerAddressId: string) {
  const { organizationId } = await requireOrganization();
  return prisma.project.findMany({
    where: {
      organizationId,
      customerAddressId,
      status: { in: ["PROSPECT", "ACTIVE", "ON_HOLD"] }
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, reference: true, name: true, status: true }
  });
}

// ─── Lignes ──
const LineSchema = z.object({
  quoteId: z.string().min(1),
  category: z.string().default("MAIN_OEUVRE"),
  description: z.string().min(1),
  quantity: z.coerce.number().nonnegative().default(1),
  unit: z.string().default("u"),
  unitPrice: z.coerce.number().nonnegative().default(0),
  /// Si l'utilisateur a choisi un article du catalogue fournisseur,
  /// on garde le lien : permet ensuite de générer la commande matériel
  /// groupée par fournisseur. Catégorie forcée à FOURNITURE dans ce cas.
  catalogItemId: z
    .string()
    .optional()
    .nullable()
    .transform((v) => v || null)
});

export async function addQuoteLine(formData: FormData) {
  const { organizationId } = await requireOrganization();
  const data = LineSchema.parse(Object.fromEntries(formData));
  const quote = await prisma.quote.findFirst({ where: { id: data.quoteId, organizationId } });
  if (!quote) throw new Error("Devis introuvable");
  if (data.catalogItemId) {
    const ci = await prisma.catalogItem.findFirst({
      where: { id: data.catalogItemId, organizationId },
      select: { id: true }
    });
    if (!ci) throw new Error("Article catalogue introuvable");
  }
  const last = await prisma.quoteLine.findFirst({ where: { quoteId: quote.id }, orderBy: { position: "desc" } });
  const totalHt = data.quantity * data.unitPrice;
  await prisma.quoteLine.create({
    data: {
      quoteId: quote.id,
      position: (last?.position ?? 0) + 1,
      category: data.catalogItemId ? "FOURNITURE" : data.category,
      description: data.description,
      quantity: data.quantity, unit: data.unit, unitPrice: data.unitPrice,
      totalHt,
      catalogItemId: data.catalogItemId
    }
  });
  await recomputeQuoteTotals(quote.id);
  revalidatePath(`/devis/${quote.id}`);
  return { ok: true };
}

export async function updateQuoteLine(lineId: string, formData: FormData) {
  const { organizationId } = await requireOrganization();
  const line = await prisma.quoteLine.findUnique({
    where: { id: lineId },
    include: { quote: { select: { organizationId: true, id: true } } }
  });
  if (!line || line.quote.organizationId !== organizationId) throw new Error("Ligne introuvable");
  const data = LineSchema.omit({ quoteId: true }).parse(Object.fromEntries(formData));
  if (data.catalogItemId) {
    const ci = await prisma.catalogItem.findFirst({
      where: { id: data.catalogItemId, organizationId },
      select: { id: true }
    });
    if (!ci) throw new Error("Article catalogue introuvable");
  }
  const totalHt = data.quantity * data.unitPrice;
  await prisma.quoteLine.update({
    where: { id: lineId },
    data: {
      category: data.catalogItemId ? "FOURNITURE" : data.category,
      description: data.description,
      quantity: data.quantity, unit: data.unit, unitPrice: data.unitPrice,
      totalHt,
      catalogItemId: data.catalogItemId
    }
  });
  await recomputeQuoteTotals(line.quote.id);
  revalidatePath(`/devis/${line.quote.id}`);
  return { ok: true };
}

export async function deleteQuoteLine(lineId: string) {
  const { organizationId } = await requireOrganization();
  const line = await prisma.quoteLine.findUnique({
    where: { id: lineId },
    include: { quote: { select: { organizationId: true, id: true } } }
  });
  if (!line || line.quote.organizationId !== organizationId) throw new Error("Ligne introuvable");
  await prisma.quoteLine.delete({ where: { id: lineId } });
  await recomputeQuoteTotals(line.quote.id);
  revalidatePath(`/devis/${line.quote.id}`);
  return { ok: true };
}

// ─── Tranches (en POURCENTAGE uniquement, le montant est dérivé du total devis) ──
// Choix de design : un artisan définit ses tranches en % du devis (ex.
// acompte 30 %, mi-chantier 40 %, solde 30 %). Le montant se recalcule
// automatiquement quand le total du devis change (ajout/modif d'une ligne).
const MilestoneSchema = z.object({
  quoteId: z.string().min(1),
  label: z.string().min(1).max(150),
  percentage: z.coerce.number().min(0.01).max(100),
  expectedAt: z.string().optional().nullable().transform((v) => v || null)
});

export async function addQuoteMilestone(formData: FormData) {
  const { organizationId } = await requireOrganization();
  const data = MilestoneSchema.parse(Object.fromEntries(formData));
  const quote = await prisma.quote.findFirst({
    where: { id: data.quoteId, organizationId },
    include: { milestones: { select: { percentage: true } } }
  });
  if (!quote) throw new Error("Devis introuvable");
  // Validation : la somme des % (existants + nouveau) ne doit pas dépasser 100
  const sumExisting = quote.milestones.reduce((s, m) => s + Number(m.percentage ?? 0), 0);
  if (sumExisting + data.percentage > 100.01) {
    throw new Error(`Total des tranches dépasserait 100 % (déjà ${sumExisting.toFixed(2)} %, +${data.percentage} %)`);
  }
  const last = await prisma.quoteMilestone.findFirst({
    where: { quoteId: quote.id }, orderBy: { position: "desc" }
  });
  const amountHt = Math.round(Number(quote.totalHt) * (data.percentage / 100) * 100) / 100;
  await prisma.quoteMilestone.create({
    data: {
      quoteId: quote.id,
      position: (last?.position ?? 0) + 1,
      label: data.label,
      percentage: data.percentage,
      amountHt,
      expectedAt: data.expectedAt ? new Date(data.expectedAt) : null
    }
  });
  revalidatePath(`/devis/${quote.id}`);
  return { ok: true };
}

export async function deleteQuoteMilestone(milestoneId: string) {
  const { organizationId } = await requireOrganization();
  const m = await prisma.quoteMilestone.findUnique({
    where: { id: milestoneId },
    include: { quote: { select: { organizationId: true, id: true } } }
  });
  if (!m || m.quote.organizationId !== organizationId) throw new Error("Tranche introuvable");
  await prisma.quoteMilestone.delete({ where: { id: milestoneId } });
  revalidatePath(`/devis/${m.quote.id}`);
  return { ok: true };
}

// ─── Recompute totaux ──
async function recomputeQuoteTotals(quoteId: string) {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { lines: true, milestones: true }
  });
  if (!quote) return;
  const totalHt = quote.lines.reduce((s, l) => s + Number(l.totalHt), 0);
  const totalTvac = totalHt * (1 + Number(quote.vatRate) / 100);
  await prisma.quote.update({
    where: { id: quoteId },
    data: { totalHt, totalTvac: Math.round(totalTvac * 100) / 100 }
  });
  // Important : on recalcule aussi le montant de chaque tranche puisque
  // le total du devis a peut-être bougé. Le % reste figé, seul l'amount HT
  // est mis à jour.
  for (const m of quote.milestones) {
    const pct = Number(m.percentage ?? 0);
    if (pct > 0) {
      const newAmount = Math.round(totalHt * (pct / 100) * 100) / 100;
      if (newAmount !== Number(m.amountHt)) {
        await prisma.quoteMilestone.update({
          where: { id: m.id }, data: { amountHt: newAmount }
        });
      }
    }
  }
}
