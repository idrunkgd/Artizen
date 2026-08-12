import Link from "next/link";
import { Clock } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireOrganization } from "@/lib/session";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: { id: string } }) {
  const { organizationId } = await requireOrganization();
  const [project, entries] = await Promise.all([
    prisma.project.findFirst({ where: { id: params.id, organizationId } }),
    prisma.timesheetEntry.findMany({
      where: { organizationId, projectId: params.id },
      orderBy: { date: "desc" },
      include: { user: { select: { firstName: true, lastName: true } } }
    })
  ]);
  if (!project) return null;
  const total = entries.reduce((s, e) => s + Number(e.hours), 0);
  return (
    <div>
      <div className="card p-4 mb-3 text-center">
        <span className="text-sm text-ink-300">Total heures sur ce chantier :</span>{" "}
        <span className="text-2xl font-black text-gold">{total.toFixed(2)} h</span>
      </div>
      {entries.length === 0 ? (
        <div className="card p-6 text-center">
          <Clock className="w-10 h-10 text-ink-300 mx-auto mb-2" />
          <p className="text-ink-300 mb-3">Aucune heure saisie pour ce chantier.</p>
          <Link href="/timesheet" className="btn-gold btn-sm">Saisir mes heures</Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {entries.map((e) => (
            <li key={e.id} className="card p-3 flex justify-between items-start">
              <div>
                <div className="font-medium">{Number(e.hours).toFixed(2)} h</div>
                <div className="text-xs text-ink-300">
                  {formatDate(e.date)} · {e.user.firstName} {e.user.lastName}
                </div>
                {e.description && <div className="text-sm text-ink-600 mt-1">{e.description}</div>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
