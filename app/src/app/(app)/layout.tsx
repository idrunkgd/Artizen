import { requireOrganization } from "@/lib/session";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { session, organizationId } = await requireOrganization();
  return (
    <AppShell
      userName={session.user?.name ?? ""}
      organizationName={(session.user as any).organizationName ?? ""}
      role={(session.user as any).role}
    >
      {children}
    </AppShell>
  );
}
