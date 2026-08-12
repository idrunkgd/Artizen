"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireOrganization } from "@/lib/session";

const OrgSchema = z.object({
  name: z.string().min(1).max(150),
  vatNumber: z.string().optional().nullable().transform((v) => v?.trim() || null),
  street: z.string().optional().nullable().transform((v) => v?.trim() || null),
  postalCode: z.string().optional().nullable().transform((v) => v?.trim() || null),
  city: z.string().optional().nullable().transform((v) => v?.trim() || null),
  country: z.string().optional().nullable().transform((v) => v?.trim() || null),
  phone: z.string().optional().nullable().transform((v) => v?.trim() || null),
  email: z.string().email().optional().or(z.literal("")).transform((v) => v || null),
  iban: z.string().optional().nullable().transform((v) => v?.trim() || null),
  paymentTermsDays: z.coerce.number().int().min(0).max(180).default(30),
  logoUrl: z.string().optional().nullable().transform((v) => v || null)
});

export async function updateOrganization(formData: FormData) {
  const { organizationId } = await requireOrganization();
  const data = OrgSchema.parse(Object.fromEntries(formData));
  await prisma.organization.update({ where: { id: organizationId }, data });
  revalidatePath("/settings");
  return { ok: true };
}
