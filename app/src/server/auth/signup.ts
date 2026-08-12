"use server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";

const SignupSchema = z.object({
  // Boîte
  organizationName: z.string().min(2).max(100),
  // Patron
  firstName: z.string().min(1).max(60),
  lastName: z.string().min(1).max(60),
  email: z.string().email(),
  password: z.string().min(8).max(200)
});

export async function signupAction(formData: FormData) {
  const data = SignupSchema.parse(Object.fromEntries(formData));

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    return { ok: false as const, error: "Cet email a déjà un compte" };
  }

  const hash = await bcrypt.hash(data.password, 10);

  // Transactionnel : Organization + User + Membership ensemble.
  // Si une étape échoue, rien n'est créé.
  const result = await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: { name: data.organizationName }
    });
    const user = await tx.user.create({
      data: {
        email: data.email,
        passwordHash: hash,
        firstName: data.firstName,
        lastName: data.lastName
      }
    });
    await tx.membership.create({
      data: { userId: user.id, organizationId: org.id, role: "PATRON" }
    });
    return { user, org };
  });

  return { ok: true as const, userId: result.user.id };
}
