"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireOrganization } from "@/lib/session";

async function nextInvoiceReference(organizationId: string) {
  const year = new Date().getFullYear();
  const prefix = `FAC-${year}-`;
  const last = await prisma.invoice.findFirst({
    where: { organizationId, reference: { startsWith: prefix } },
    orderBy: { reference: "desc" }, select: { reference: true }
  });
  const lastNum = last ? parseInt(last.reference.slice(prefix.length), 10) || 0 : 0;
  return `${prefix}${String(lastNum + 1).padStart(3, "0")}`;
}

function fmtDateShort(d: Date) {
  return new Intl.DateTimeFormat("fr-BE", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}

const InvoiceSchema = z.object({
  customerId: z.string().min(1),
  projectId: z.string().optional().nullable().transform((v) => v || null),
  quoteId: z.string().optional().nullable().transform((v) => v || null),
  title: z.string().min(1).max(200),
  vatRate: z.coerce.number().min(0).max(50).default(21),
  dueDate: z.string().optional().nullable().transform((v) => v || null),
  notes: z.string().optional().nullable().transform((v) => v?.trim() || null)
});

export async function createInvoice(formData: FormData) {
  const { organizationId } = await requireOrganization();
  const data = InvoiceSchema.parse(Object.fromEntries(formData));
  const reference = await nextInvoiceReference(organizationId);
  const inv = await prisma.invoice.create({
    data: {
      ...data, reference, organizationId, status: "DRAFT",
      issueDate: new Date(),
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      totalHt: 0, totalTvac: 0
    }
  });
  revalidatePath("/factures");
  return { ok: true, id: inv.id };
}

/**
 * Crée une facture depuis une ou plusieurs tranches devis sélectionnées.
 * Contraintes :
 *   - Toutes les tranches doivent appartenir à des devis du même chantier
 *   - Toutes doivent porter le même taux TVA (sinon ambigu)
 *   - Les tranches déjà facturées (invoicedAt != null) sont refusées
 * Au succès : marque les tranches comme invoicées et lie leur invoiceId.
 */
export async function createInvoiceFromMilestones(projectId: string, milestoneIds: string[]) {
  const { organizationId } = await requireOrganization();
  if (milestoneIds.length === 0) throw new Error("Sélectionne au moins une tranche");

  const project = await prisma.project.findFirst({ where: { id: projectId, organizationId } });
  if (!project) throw new Error("Chantier introuvable");

  const milestones = await prisma.quoteMilestone.findMany({
    where: { id: { in: milestoneIds } },
    include: { quote: true }
  });
  if (milestones.length !== milestoneIds.length) throw new Error("Tranche(s) introuvable(s)");

  // Validation : appartiennent toutes au chantier
  for (const m of milestones) {
    if (m.quote.organizationId !== organizationId) throw new Error("Tranche hors de votre boîte");
    if (m.quote.projectId !== projectId) throw new Error(`La tranche "${m.label}" n'est pas liée à ce chantier`);
    if (m.invoicedAt) throw new Error(`La tranche "${m.label}" est déjà facturée`);
  }

  // Validation : même taux TVA pour toutes les tranches
  const vatRates = Array.from(new Set(milestones.map((m) => Number(m.quote.vatRate))));
  if (vatRates.length > 1) throw new Error("Toutes les tranches doivent avoir le même taux TVA");
  const vatRate = vatRates[0];

  const reference = await nextInvoiceReference(organizationId);
  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  const dueDate = org?.paymentTermsDays
    ? new Date(Date.now() + org.paymentTermsDays * 24 * 3600 * 1000)
    : null;

  const totalHt = milestones.reduce((s, m) => s + Number(m.amountHt), 0);
  const totalTvac = Math.round(totalHt * (1 + vatRate / 100) * 100) / 100;

  const customerId = milestones[0].quote.customerId;
  // Titre auto : si une seule tranche, son label, sinon nom chantier + nb tranches
  const title = milestones.length === 1
    ? `${milestones[0].quote.title} — ${milestones[0].label}`
    : `${project.name} — ${milestones.length} tranches`;

  const result = await prisma.$transaction(async (tx) => {
    const inv = await tx.invoice.create({
      data: {
        organizationId, reference, customerId,
        projectId,
        quoteId: milestones[0].quoteId,  // référence le devis principal (le premier)
        title,
        vatRate,
        totalHt, totalTvac,
        issueDate: new Date(), dueDate,
        status: "DRAFT",
        lines: {
          create: milestones.map((m, i) => ({
            position: i + 1,
            description: `${m.quote.title} — ${m.label}${m.percentage ? ` (${Number(m.percentage)} %)` : ""}`,
            quantity: 1, unit: "forfait",
            unitPrice: Number(m.amountHt),
            totalHt: Number(m.amountHt)
          }))
        }
      }
    });
    // Marque les tranches comme facturées
    await tx.quoteMilestone.updateMany({
      where: { id: { in: milestoneIds } },
      data: { invoicedAt: new Date(), invoiceId: inv.id }
    });
    return inv;
  });

  revalidatePath(`/factures`);
  revalidatePath(`/factures/${result.id}`);
  revalidatePath(`/chantiers/${projectId}/factures`);
  revalidatePath(`/chantiers/${projectId}`);
  return { ok: true, id: result.id };
}

// Compat : on garde l'ancien nom pour les anciens appels (1 tranche → array de 1)
export async function createInvoiceFromMilestone(milestoneId: string) {
  const m = await prisma.quoteMilestone.findUnique({
    where: { id: milestoneId },
    include: { quote: true }
  });
  if (!m || !m.quote.projectId) throw new Error("Tranche sans chantier — accepte d'abord le devis");
  return createInvoiceFromMilestones(m.quote.projectId, [milestoneId]);
}

/**
 * Facture RÉGIE : génère une facture à partir des heures réellement prestées
 * (Timesheet du chantier lié au devis) et non encore facturées. Les heures
 * sont valorisées au taux horaire fourni (pré-rempli depuis le devis côté UI).
 * Les entries couvertes sont marquées (invoiceId) pour ne jamais être
 * refacturées ; la suppression de la facture les redevient facturables.
 */
export async function createInvoiceFromTimesheet(
  quoteId: string,
  hourlyRate?: number,
  entryIds?: string[]
) {
  const { organizationId } = await requireOrganization();

  const quote = await prisma.quote.findFirst({
    where: { id: quoteId, organizationId },
    include: { project: true }
  });
  if (!quote) throw new Error("Devis introuvable");
  if (quote.billingType !== "REGIE") throw new Error("Ce devis n'est pas en régie");
  if (!quote.projectId) throw new Error("Accepte d'abord le devis (le chantier n'existe pas encore)");
  // Taux : celui passé explicitement, sinon celui défini sur le devis.
  const rate = hourlyRate != null ? hourlyRate : Number(quote.hourlyRate ?? 0);
  if (!(rate > 0)) throw new Error("Définis d'abord un taux horaire sur le devis en régie");

  const entries = await prisma.timesheetEntry.findMany({
    where: {
      organizationId,
      projectId: quote.projectId,
      invoiceId: null,
      ...(entryIds && entryIds.length ? { id: { in: entryIds } } : {})
    },
    orderBy: { date: "asc" }
  });
  if (entries.length === 0) {
    throw new Error("Aucune heure à facturer (les heures prestées sont déjà toutes facturées)");
  }

  // Une ligne de facture par JOUR presté (tableau des heures par jour).
  const byDay = new Map<string, { hours: number; descs: string[] }>();
  for (const e of entries) {
    const key = fmtDateShort(e.date);
    const g = byDay.get(key) ?? { hours: 0, descs: [] };
    g.hours += Number(e.hours);
    if (e.description) g.descs.push(e.description);
    byDay.set(key, g);
  }
  const dayLines = Array.from(byDay.entries()).map(([day, g], i) => {
    const uniq = Array.from(new Set(g.descs));
    return {
      position: i + 1,
      description: `Régie ${day}${uniq.length ? " — " + uniq.join(", ") : ""}`,
      quantity: g.hours,
      unit: "h",
      unitPrice: rate,
      totalHt: Math.round(g.hours * rate * 100) / 100
    };
  });
  const lineTotal = dayLines.reduce((s, l) => s + l.totalHt, 0);
  const vatRate = Number(quote.vatRate);
  const totalTvac = Math.round(lineTotal * (1 + vatRate / 100) * 100) / 100;

  const reference = await nextInvoiceReference(organizationId);
  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  const dueDate = org?.paymentTermsDays
    ? new Date(Date.now() + org.paymentTermsDays * 24 * 3600 * 1000)
    : null;

  const from = entries[0].date;
  const to = entries[entries.length - 1].date;
  const period = from.getTime() === to.getTime()
    ? fmtDateShort(from)
    : `${fmtDateShort(from)} → ${fmtDateShort(to)}`;

  const result = await prisma.$transaction(async (tx) => {
    const inv = await tx.invoice.create({
      data: {
        organizationId, reference,
        customerId: quote.customerId,
        projectId: quote.projectId,
        quoteId: quote.id,
        title: `${quote.title} — régie (${period})`,
        vatRate,
        totalHt: lineTotal, totalTvac,
        issueDate: new Date(), dueDate,
        status: "DRAFT",
        lines: { create: dayLines }
      }
    });
    await tx.timesheetEntry.updateMany({
      where: { id: { in: entries.map((e: (typeof entries)[number]) => e.id) } },
      data: { invoiceId: inv.id }
    });
    return inv;
  });

  revalidatePath("/factures");
  revalidatePath(`/factures/${result.id}`);
  revalidatePath(`/devis/${quoteId}`);
  if (quote.projectId) revalidatePath(`/chantiers/${quote.projectId}`);
  return { ok: true, id: result.id };
}

export async function updateInvoice(id: string, formData: FormData) {
  const { organizationId } = await requireOrganization();
  const data = InvoiceSchema.parse(Object.fromEntries(formData));
  const existing = await prisma.invoice.findFirst({ where: { id, organizationId } });
  if (!existing) throw new Error("Facture introuvable");
  await prisma.invoice.update({
    where: { id },
    data: { ...data, dueDate: data.dueDate ? new Date(data.dueDate) : null }
  });
  await recomputeInvoiceTotals(id);
  revalidatePath(`/factures/${id}`);
  return { ok: true };
}

export async function deleteInvoice(id: string) {
  const { organizationId } = await requireOrganization();
  const existing = await prisma.invoice.findFirst({ where: { id, organizationId } });
  if (!existing) throw new Error("Facture introuvable");
  if (existing.status !== "DRAFT" && existing.status !== "CANCELLED") {
    throw new Error("Tu ne peux supprimer qu'une facture brouillon ou annulée (séquentiel légal)");
  }
  // Déverrouille les tranches qui étaient couvertes par cette facture
  // pour qu'elles puissent être refacturées ailleurs.
  await prisma.quoteMilestone.updateMany({
    where: { invoiceId: id },
    data: { invoicedAt: null, invoiceId: null }
  });
  // Déverrouille aussi les heures de régie couvertes par cette facture.
  await prisma.timesheetEntry.updateMany({
    where: { invoiceId: id },
    data: { invoiceId: null }
  });
  await prisma.invoice.delete({ where: { id } });
  revalidatePath("/factures");
  return { ok: true };
}

export async function setInvoiceStatus(id: string, status: "DRAFT"|"SENT"|"PAID"|"OVERDUE"|"CANCELLED") {
  const { organizationId } = await requireOrganization();
  const existing = await prisma.invoice.findFirst({ where: { id, organizationId } });
  if (!existing) throw new Error("Facture introuvable");
  const data: any = { status };
  if (status === "PAID" && !existing.paidAt) data.paidAt = new Date();
  if (status !== "PAID") data.paidAt = null;
  await prisma.invoice.update({ where: { id }, data });
  revalidatePath(`/factures/${id}`);
  revalidatePath("/factures");
  return { ok: true };
}

// Lignes (mêmes patterns que devis)
const LineSchema = z.object({
  invoiceId: z.string().min(1),
  description: z.string().min(1),
  quantity: z.coerce.number().nonnegative().default(1),
  unit: z.string().default("u"),
  unitPrice: z.coerce.number().nonnegative().default(0)
});

export async function addInvoiceLine(formData: FormData) {
  const { organizationId } = await requireOrganization();
  const data = LineSchema.parse(Object.fromEntries(formData));
  const inv = await prisma.invoice.findFirst({ where: { id: data.invoiceId, organizationId } });
  if (!inv) throw new Error("Facture introuvable");
  const last = await prisma.invoiceLine.findFirst({ where: { invoiceId: inv.id }, orderBy: { position: "desc" } });
  await prisma.invoiceLine.create({
    data: {
      invoiceId: inv.id,
      position: (last?.position ?? 0) + 1,
      description: data.description,
      quantity: data.quantity, unit: data.unit, unitPrice: data.unitPrice,
      totalHt: data.quantity * data.unitPrice
    }
  });
  await recomputeInvoiceTotals(inv.id);
  revalidatePath(`/factures/${inv.id}`);
  return { ok: true };
}

export async function deleteInvoiceLine(lineId: string) {
  const { organizationId } = await requireOrganization();
  const line = await prisma.invoiceLine.findUnique({
    where: { id: lineId }, include: { invoice: { select: { organizationId: true, id: true } } }
  });
  if (!line || line.invoice.organizationId !== organizationId) throw new Error("Ligne introuvable");
  await prisma.invoiceLine.delete({ where: { id: lineId } });
  await recomputeInvoiceTotals(line.invoice.id);
  revalidatePath(`/factures/${line.invoice.id}`);
  return { ok: true };
}

async function recomputeInvoiceTotals(id: string) {
  const inv = await prisma.invoice.findUnique({ where: { id }, include: { lines: true } });
  if (!inv) return;
  const totalHt = inv.lines.reduce((s, l) => s + Number(l.totalHt), 0);
  const totalTvac = Math.round(totalHt * (1 + Number(inv.vatRate) / 100) * 100) / 100;
  await prisma.invoice.update({ where: { id }, data: { totalHt, totalTvac } });
}

// ─── Édition minimale : dueDate + notes uniquement ─────────────────
// L'utilisateur ne doit pas modifier les lignes / le client / le titre :
// tout est dérivé des tranches sélectionnées dans le chantier. Si besoin
// de changer, on supprime la facture brouillon (les tranches sont
// déverrouillées) et on en recrée une nouvelle depuis le chantier.

export async function updateInvoiceDueDateAndNotes(id: string, formData: FormData) {
  const { organizationId } = await requireOrganization();
  const existing = await prisma.invoice.findFirst({ where: { id, organizationId } });
  if (!existing) throw new Error("Facture introuvable");
  if (existing.status !== "DRAFT") {
    throw new Error("Cette facture n'est plus modifiable");
  }
  const dueDate = (formData.get("dueDate") as string) || null;
  const notes = ((formData.get("notes") as string) || "").trim() || null;
  await prisma.invoice.update({
    where: { id },
    data: { dueDate: dueDate ? new Date(dueDate) : null, notes }
  });
  revalidatePath(`/factures/${id}`);
  return { ok: true };
}
