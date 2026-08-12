"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireOrganization } from "@/lib/session";

const EntrySchema = z.object({
  projectId: z.string().optional().nullable().transform((v) => v || null),
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

export async function deleteTimesheetEntry(id: string) {
  const { organizationId, session } = await requireOrganization();
  const e = await prisma.timesheetEntry.findFirst({
    where: { id, organizationId, userId: session.user.id as string }
  });
  if (!e) throw new Error("Saisie introuvable");
  await prisma.timesheetEntry.delete({ where: { id } });
  revalidatePath("/timesheet");
  return { ok: true };
}
