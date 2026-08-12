"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireOrganization } from "@/lib/session";

const MaterialSchema = z.object({
  name: z.string().min(1).max(150),
  description: z.string().optional().nullable().transform((v) => v?.trim() || null),
  unit: z.string().default("u"),
  stockQty: z.coerce.number().default(0),
  unitCost: z.coerce.number().optional().nullable(),
  defaultSupplierId: z.string().optional().nullable().transform((v) => v || null)
});

export async function upsertMaterial(formData: FormData, id?: string) {
  const { organizationId } = await requireOrganization();
  const data = MaterialSchema.parse(Object.fromEntries(formData));
  if (id) {
    const existing = await prisma.material.findFirst({ where: { id, organizationId } });
    if (!existing) throw new Error("Matériel introuvable");
    await prisma.material.update({ where: { id }, data });
  } else {
    await prisma.material.create({ data: { ...data, organizationId } });
  }
  revalidatePath("/materiel");
  return { ok: true };
}

export async function deleteMaterial(id: string) {
  const { organizationId } = await requireOrganization();
  const existing = await prisma.material.findFirst({ where: { id, organizationId } });
  if (!existing) throw new Error("Introuvable");
  await prisma.material.delete({ where: { id } });
  revalidatePath("/materiel");
  return { ok: true };
}

export async function adjustStock(id: string, delta: number) {
  const { organizationId } = await requireOrganization();
  const m = await prisma.material.findFirst({ where: { id, organizationId } });
  if (!m) throw new Error("Introuvable");
  await prisma.material.update({
    where: { id },
    data: { stockQty: { increment: delta } }
  });
  revalidatePath("/materiel");
  return { ok: true };
}
