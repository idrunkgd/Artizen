"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireOrganization } from "@/lib/session";

const EntrySchema = z.object({
  projectId: z.string().min(1, "Chantier obligatoire"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hours: z.coerce.number().min(0.25).max(24).optional(),
  startAt: z.string().optional().transform((v) => v || null),
  endAt: z.string().optional().transform((v) => v || null),
  description: z.string().optional().transform((v) => v?.trim() || null)
});

// Durée en heures (2 décimales) entre deux instants ISO.
function hoursBetween(start: Date, end: Date): number {
  return Math.round(((end.getTime() - start.getTime()) / 3600000) * 100) / 100;
}

// Clôture d'un pointage chrono : on ne valide que par tranches de 15 min,
// arrondi À L'INFÉRIEUR. Moins de 15 min => non compté (la saisie est supprimée).
async function settleRunning(id: string, startAt: Date, now: Date) {
  const raw = Math.max(0, hoursBetween(startAt, now));
  const quarters = Math.floor(raw / 0.25) * 0.25;
  if (quarters < 0.25) {
    await prisma.timesheetEntry.delete({ where: { id } });
  } else {
    await prisma.timesheetEntry.update({ where: { id }, data: { endAt: now, hours: quarters } });
  }
}

export async function addTimesheetEntry(formData: FormData) {
  const { session, organizationId } = await requireOrganization();
  const data = EntrySchema.parse(Object.fromEntries(formData));
  let hours = data.hours ?? 0;
  let startAt: Date | null = null;
  let endAt: Date | null = null;
  if (data.startAt && data.endAt) {
    startAt = new Date(data.startAt);
    endAt = new Date(data.endAt);
    if (isNaN(startAt.getTime()) || isNaN(endAt.getTime())) throw new Error("Horaires invalides");
    const h = hoursBetween(startAt, endAt);
    if (!(h > 0)) throw new Error("L'heure de fin doit être après le début");
    if (h > 24) throw new Error("Durée supérieure à 24 h");
    hours = h;
  }
  if (!(hours > 0)) throw new Error("Indique les heures (ou l'heure de début et de fin)");
  await prisma.timesheetEntry.create({
    data: {
      organizationId,
      userId: session.user.id as string,
      projectId: data.projectId,
      date: new Date(data.date),
      hours, startAt, endAt,
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
 * dimanche) et les jours déjà saisis (même utilisateur + chantier).
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
    const dow = d.getUTCDay();
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

/**
 * POINTAGE chrono : démarre ou arrête le temps de prestation sur un chantier.
 *  - clic sur le chantier déjà en cours  -> arrête (calcule les heures)
 *  - clic sur un autre chantier          -> arrête l'en-cours puis démarre le nouveau
 *  - aucun en-cours                       -> démarre
 * Un seul pointage peut tourner à la fois (par utilisateur).
 */
export async function toggleTimer(projectId: string) {
  const { session, organizationId } = await requireOrganization();
  const userId = session.user.id as string;
  if (!projectId) throw new Error("Chantier manquant");

  const running = await prisma.timesheetEntry.findFirst({
    where: { organizationId, userId, startAt: { not: null }, endAt: null },
    orderBy: { startAt: "desc" }
  });
  const now = new Date();

  if (running) {
    await settleRunning(running.id, running.startAt as Date, now);
    if (running.projectId === projectId) {
      revalidatePath("/dashboard"); revalidatePath("/timesheet");
      return { ok: true, running: false };
    }
  }

  const created = await prisma.timesheetEntry.create({
    data: {
      organizationId, userId, projectId,
      date: new Date(now.toISOString().slice(0, 10)),
      hours: 0, startAt: now, endAt: null
    }
  });
  revalidatePath("/dashboard"); revalidatePath("/timesheet");
  return { ok: true, running: true, id: created.id };
}

export async function stopRunningTimer() {
  const { session, organizationId } = await requireOrganization();
  const userId = session.user.id as string;
  const running = await prisma.timesheetEntry.findFirst({
    where: { organizationId, userId, startAt: { not: null }, endAt: null },
    orderBy: { startAt: "desc" }
  });
  if (!running) return { ok: true, running: false };
  const now = new Date();
  await settleRunning(running.id, running.startAt as Date, now);
  revalidatePath("/dashboard"); revalidatePath("/timesheet");
  return { ok: true, running: false };
}

/**
 * Édition d'une saisie (date, horaires début/fin, ou heures). Permet de
 * corriger un pointage démarré trop tôt / arrêté trop tard.
 */
export async function updateTimesheetEntry(id: string, formData: FormData) {
  const { session, organizationId } = await requireOrganization();
  const userId = session.user.id as string;
  const e = await prisma.timesheetEntry.findFirst({ where: { id, organizationId, userId } });
  if (!e) throw new Error("Saisie introuvable");
  if (e.invoiceId) throw new Error("Ces heures sont déjà sur une facture — modifie d'abord la facture (ou fais une note de crédit).");

  const raw = Object.fromEntries(formData);
  const date = String(raw.date || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Date invalide");
  const startStr = String(raw.startAt || "");
  const endStr = String(raw.endAt || "");
  const startAt: Date | null = startStr ? new Date(startStr) : null;
  const endAt: Date | null = endStr ? new Date(endStr) : null;

  let hours: number;
  if (startAt && endAt) {
    const h = hoursBetween(startAt, endAt);
    if (!(h > 0)) throw new Error("L'heure de fin doit être après le début");
    if (h > 24) throw new Error("Durée supérieure à 24 h");
    hours = h;
  } else {
    hours = Number(raw.hours);
    if (!(hours > 0)) throw new Error("Indique les heures (ou l'heure de début et de fin)");
  }
  const description = String(raw.description || "").trim() || null;

  await prisma.timesheetEntry.update({
    where: { id },
    data: { date: new Date(date), startAt, endAt, hours, description }
  });
  revalidatePath("/timesheet"); revalidatePath("/dashboard");
  return { ok: true };
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
  revalidatePath("/timesheet"); revalidatePath("/dashboard");
  return { ok: true };
}
