"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireOrganization } from "@/lib/session";

const AddrSchema = z.object({
  customerId: z.string().min(1),
  label: z.string().optional().nullable().transform((v) => v?.trim() || null),
  street: z.string().min(1),
  postalCode: z.string().optional().nullable().transform((v) => v?.trim() || null),
  city: z.string().min(1),
  country: z.string().optional().nullable().transform((v) => v?.trim() || "Belgique"),
  isPrimary: z.coerce.boolean().default(false),
  notes: z.string().optional().nullable().transform((v) => v?.trim() || null)
});

async function ensureCustomerBelongsToOrg(customerId: string, organizationId: string) {
  const c = await prisma.customer.findFirst({ where: { id: customerId, organizationId } });
  if (!c) throw new Error("Client introuvable");
  return c;
}

export async function addCustomerAddress(formData: FormData) {
  const { organizationId } = await requireOrganization();
  const data = AddrSchema.parse(Object.fromEntries(formData));
  await ensureCustomerBelongsToOrg(data.customerId, organizationId);
  // Si on marque celle-ci principale, on déprime l'ancienne (1 seule principale)
  if (data.isPrimary) {
    await prisma.customerAddress.updateMany({
      where: { customerId: data.customerId, isPrimary: true },
      data: { isPrimary: false }
    });
  }
  const created = await prisma.customerAddress.create({ data });
  revalidatePath(`/clients/${data.customerId}`);
  return { ok: true, id: created.id };
}

export async function updateCustomerAddress(id: string, formData: FormData) {
  const { organizationId } = await requireOrganization();
  const existing = await prisma.customerAddress.findUnique({
    where: { id }, include: { customer: { select: { organizationId: true, id: true } } }
  });
  if (!existing || existing.customer.organizationId !== organizationId) throw new Error("Adresse introuvable");
  const data = AddrSchema.omit({ customerId: true }).parse(Object.fromEntries(formData));
  if (data.isPrimary) {
    await prisma.customerAddress.updateMany({
      where: { customerId: existing.customerId, isPrimary: true, id: { not: id } },
      data: { isPrimary: false }
    });
  }
  await prisma.customerAddress.update({ where: { id }, data });
  revalidatePath(`/clients/${existing.customer.id}`);
  return { ok: true };
}

export async function deleteCustomerAddress(id: string) {
  const { organizationId } = await requireOrganization();
  const existing = await prisma.customerAddress.findUnique({
    where: { id }, include: { customer: { select: { organizationId: true, id: true } } }
  });
  if (!existing || existing.customer.organizationId !== organizationId) throw new Error("Adresse introuvable");
  await prisma.customerAddress.delete({ where: { id } });
  revalidatePath(`/clients/${existing.customer.id}`);
  return { ok: true };
}
