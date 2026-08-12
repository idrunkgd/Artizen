"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireOrganization } from "@/lib/session";

const CustomerSchema = z.object({
  name: z.string().min(1).max(150),
  type: z.enum(["PARTICULIER", "PRO"]).default("PARTICULIER"),
  vatNumber: z.string().optional().nullable().transform((v) => v?.trim() || null),
  email: z.string().email().optional().or(z.literal("")).transform((v) => v || null),
  phone: z.string().optional().nullable().transform((v) => v?.trim() || null),
  street: z.string().optional().nullable().transform((v) => v?.trim() || null),
  postalCode: z.string().optional().nullable().transform((v) => v?.trim() || null),
  city: z.string().optional().nullable().transform((v) => v?.trim() || null),
  notes: z.string().optional().nullable().transform((v) => v?.trim() || null)
});

export async function createCustomer(formData: FormData) {
  const { organizationId } = await requireOrganization();
  const data = CustomerSchema.parse(Object.fromEntries(formData));
  const c = await prisma.customer.create({
    data: { ...data, organizationId }
  });
  revalidatePath("/clients");
  return { ok: true, id: c.id };
}

export async function updateCustomer(id: string, formData: FormData) {
  const { organizationId } = await requireOrganization();
  const data = CustomerSchema.parse(Object.fromEntries(formData));
  // Sécurité multi-tenant : on s'assure que ce customer appartient bien à l'org
  const existing = await prisma.customer.findFirst({ where: { id, organizationId } });
  if (!existing) throw new Error("Client introuvable");
  await prisma.customer.update({ where: { id }, data });
  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  return { ok: true };
}

export async function deleteCustomer(id: string) {
  const { organizationId } = await requireOrganization();
  const existing = await prisma.customer.findFirst({ where: { id, organizationId } });
  if (!existing) throw new Error("Client introuvable");
  await prisma.customer.delete({ where: { id } });
  revalidatePath("/clients");
  return { ok: true };
}
