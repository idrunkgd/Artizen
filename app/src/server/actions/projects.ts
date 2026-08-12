"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireOrganization } from "@/lib/session";

const ProjectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional().nullable().transform((v) => v?.trim() || null),
  customerId: z.string().optional().nullable().transform((v) => v || null),
  /// Adresse pré-enregistrée du client (depuis CustomerAddress)
  customerAddressId: z.string().optional().nullable().transform((v) => v || null),
  status: z.enum(["PROSPECT", "ACTIVE", "ON_HOLD", "DONE", "CANCELLED"]).default("PROSPECT"),
  // Override / adresse libre (utilisée si customerAddressId vide)
  siteStreet: z.string().optional().nullable().transform((v) => v?.trim() || null),
  sitePostalCode: z.string().optional().nullable().transform((v) => v?.trim() || null),
  siteCity: z.string().optional().nullable().transform((v) => v?.trim() || null),
  startDate: z.string().optional().nullable().transform((v) => v || null),
  endDate: z.string().optional().nullable().transform((v) => v || null),
  budgetEstimate: z.coerce.number().optional().nullable()
});

/** Génère une référence CH-YYYY-NNN unique au sein de l'organisation */
async function nextProjectReference(organizationId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `CH-${year}-`;
  const last = await prisma.project.findFirst({
    where: { organizationId, reference: { startsWith: prefix } },
    orderBy: { reference: "desc" },
    select: { reference: true }
  });
  const lastNum = last ? parseInt(last.reference.slice(prefix.length), 10) || 0 : 0;
  return `${prefix}${String(lastNum + 1).padStart(3, "0")}`;
}

export async function createProject(formData: FormData) {
  const { organizationId } = await requireOrganization();
  const data = ProjectSchema.parse(Object.fromEntries(formData));
  const reference = await nextProjectReference(organizationId);
  const project = await prisma.project.create({
    data: {
      ...data,
      reference,
      organizationId,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null
    }
  });
  revalidatePath("/chantiers");
  revalidatePath("/dashboard");
  return { ok: true, id: project.id };
}

export async function updateProject(id: string, formData: FormData) {
  const { organizationId } = await requireOrganization();
  const data = ProjectSchema.parse(Object.fromEntries(formData));
  const existing = await prisma.project.findFirst({ where: { id, organizationId } });
  if (!existing) throw new Error("Chantier introuvable");
  await prisma.project.update({
    where: { id },
    data: {
      ...data,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null
    }
  });
  revalidatePath("/chantiers");
  revalidatePath(`/chantiers/${id}`);
  return { ok: true };
}

export async function deleteProject(id: string) {
  const { organizationId } = await requireOrganization();
  const existing = await prisma.project.findFirst({ where: { id, organizationId } });
  if (!existing) throw new Error("Chantier introuvable");
  await prisma.project.delete({ where: { id } });
  revalidatePath("/chantiers");
  return { ok: true };
}
