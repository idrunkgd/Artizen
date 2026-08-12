"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireOrganization } from "@/lib/session";

const SupplierSchema = z.object({
  name: z.string().min(1).max(150),
  vatNumber: z.string().optional().nullable().transform((v) => v?.trim() || null),
  email: z.string().email().optional().or(z.literal("")).transform((v) => v || null),
  phone: z.string().optional().nullable().transform((v) => v?.trim() || null),
  notes: z.string().optional().nullable().transform((v) => v?.trim() || null)
});

export async function createSupplier(formData: FormData) {
  const { organizationId } = await requireOrganization();
  const data = SupplierSchema.parse(Object.fromEntries(formData));
  const s = await prisma.supplier.create({ data: { ...data, organizationId } });
  revalidatePath("/fournisseurs");
  return { ok: true, id: s.id };
}

export async function updateSupplier(id: string, formData: FormData) {
  const { organizationId } = await requireOrganization();
  const data = SupplierSchema.parse(Object.fromEntries(formData));
  const existing = await prisma.supplier.findFirst({ where: { id, organizationId } });
  if (!existing) throw new Error("Fournisseur introuvable");
  await prisma.supplier.update({ where: { id }, data });
  revalidatePath("/fournisseurs");
  revalidatePath(`/fournisseurs/${id}`);
  return { ok: true };
}

export async function deleteSupplier(id: string) {
  const { organizationId } = await requireOrganization();
  const existing = await prisma.supplier.findFirst({ where: { id, organizationId } });
  if (!existing) throw new Error("Fournisseur introuvable");
  await prisma.supplier.delete({ where: { id } });
  revalidatePath("/fournisseurs");
  return { ok: true };
}
