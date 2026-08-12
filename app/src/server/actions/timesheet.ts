"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireOrganization } from "@/lib/session";

const EntrySchema = z.object({
  projectId: z.string().min(1, "Chantier obligatoire"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hours: z.coerce.number().min(0.25).max(24),
  description: z.string().optional().nullable().transform((v) => v?.trim() || null)
});

export async function addTimesheetEntry(formData: FormData) {
  const { session, organizationId } = await requireOrganization();
  const data = EntrySchema.parse(Object.fromEntries(formData));
  await prisma.timesheetEntry.create({
    data: {
      organizationId,
      userId: session.user.id as string,
      projectId: data.projectId,
      date: new Date(data.date),
      hours: data.hours,
      description: data.description
    }
  });
  revalidatePath("/timesheet");
  return { ok: true };
}

const RangeSchema = z.object({
  projectId: z.string().min(1, "Chantier obligatoire"),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hours: z.coerce.number().min(0.25).max(24),
  description: z.string().optional().nullable().transform((v) => v?.trim() || null),
  includeWeekend: z.preprocess((v) => v === "true" || v === true, z.boolean()).default(false)
});

/**
 * Saisie en série : crée une entrée par jour entre `from` et `to` (inclus),
 * avec le même nombre d'heures. Par défaut on saute les week-ends (samedi /
 * dimanche) et les jours déjà saisis (même utilisateur + chantier) pour éviter
 * les doublons. Retourne le nombre d'entrées réellement créées.
 */
export async function addTimesheetRange(formData: FormData) {
  const { session, organizationId } = await requireOrganization();
  const data = RangeSchema.parse(Object.fromEntries(formData));
  const userId = session.user.id as string;

  const start = new Date(data.from + "T00:00:00Z");
  const end = new Date(data.to + "T00:00:00Z");
  if (end < start) throw new Error("La date de fin est avant la date de début");
  const dayMs = 24 * 3600 * 1000;
  if ((end.getTime() - start.getTime()) / dayMs > 92) {
    throw new Error("Période trop longue (max ~3 mois)");
  }

  // Jours déjà saisis (même chantier) → on ne les double pas.
  const existing = await prisma.timesheetEntry.findMany({
    where: { organizationId, userId, projectId: data.projectId, date: { gte: start, lte: end } },
    select: { date: true }
  });
  const taken = new Set(existing.map((e) => new Date(e.date).toISOString().slice(0, 10)));

  const rows: {
    organizationId: string; userId: string; projectId: string | null;
    date: Date; hours: number; description: string | null;
  }[] = [];
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const dow = d.getUTCDay(); // 0 = dimanche, 6 = samedi
    if (!data.includeWeekend && (dow === 0 || dow === 6)) continue;
    const key = d.toISOString().slice(0, 10);
    if (taken.has(key)) continue;
    rows.push({
      organizationId, userId, projectId: data.projectId,
      date: new Date(d), hours: data.hours, description: data.description
    });
  }
  if (rows.length === 0) {
    throw new Error("Aucun jour à ajouter (week-ends exclus ou jours déjà saisis)");
  }
  await prisma.timesheetEntry.createMany({ data: rows });
  revalidatePath("/timesheet");
  return { ok: true, count: rows.length };
}

export async function deleteTimesheetEntry(id: string) {
  const { organizationId, session } = await requireOrganization();
  const e = await prisma.timesheetEntry.findFirst({
    where: { id, organizationId, userId: session.user.id as string }
  });
  if (!e) throw new Error("Saisie introuvable");
  if (e.invoiceId) {
    throw new Error("Ces heures sont déjà sur une facture. Supprime la facture brouillon (ou fais une note de crédit si elle est envoyée) avant de les modifier.");
  }
  await prisma.timesheetEntry.delete({ where: { id } });
  revalidatePath("/timesheet");
  return { ok: true };
}
