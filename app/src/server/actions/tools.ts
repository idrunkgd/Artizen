"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireOrganization } from "@/lib/session";

const ToolSchema = z.object({
  name: z.string().min(1).max(150),
  serialNumber: z.string().optional().nullable().transform((v) => v?.trim() || null),
  brand: z.string().optional().nullable().transform((v) => v?.trim() || null),
  purchaseDate: z.string().optional().nullable().transform((v) => v || null),
  purchasePrice: z.coerce.number().optional().nullable(),
  location: z.string().optional().nullable().transform((v) => v?.trim() || null),
  notes: z.string().optional().nullable().transform((v) => v?.trim() || null)
});

export async function upsertTool(formData: FormData, id?: string) {
  const { organizationId } = await requireOrganization();
  const data = ToolSchema.parse(Object.fromEntries(formData));
  const payload = {
    ...data,
    purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null
  };
  if (id) {
    const existing = await prisma.tool.findFirst({ where: { id, organizationId } });
    if (!existing) throw new Error("Outil introuvable");
    await prisma.tool.update({ where: { id }, data: payload });
  } else {
    await prisma.tool.create({ data: { ...payload, organizationId } });
  }
  revalidatePath("/outillage");
  return { ok: true };
}

export async function deleteTool(id: string) {
  const { organizationId } = await requireOrganization();
  const existing = await prisma.tool.findFirst({ where: { id, organizationId } });
  if (!existing) throw new Error("Introuvable");
  await prisma.tool.delete({ where: { id } });
  revalidatePath("/outillage");
  return { ok: true };
}
