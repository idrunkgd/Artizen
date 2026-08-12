import { requireOrganization } from "@/lib/session";
import { prisma } from "@/lib/db";
import { TimesheetClient } from "./client";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { session, organizationId } = await requireOrganization();
  const [projects, entries] = await Promise.all([
    prisma.project.findMany({
      where: { organizationId, status: { in: ["ACTIVE", "PROSPECT", "ON_HOLD"] } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, reference: true, customer: { select: { name: true } } }
    }),
    // Tout l'historique de l'utilisateur (l'onglet Historique filtre côté client)
    prisma.timesheetEntry.findMany({
      where: {
        organizationId,
        userId: session.user.id as string
      },
      orderBy: { date: "desc" },
      include: { project: { select: { id: true, name: true, reference: true, customer: { select: { name: true } } } } }
    })
  ]);
  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Heures</h1>
      <p className="text-ink-300 text-sm mb-4">Saisis tes heures du jour en 10 secondes.</p>
      <TimesheetClient projects={projects} entries={entries as any} />
    </div>
  );
}
