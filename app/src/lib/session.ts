import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "./auth";

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  return session;
}

export async function requireOrganization() {
  const session = await requireSession();
  const orgId = (session.user as any).organizationId;
  if (!orgId) redirect("/signup");
  return { session, organizationId: orgId as string };
}
