import Link from "next/link";
import { requireOrganization } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Hammer, FileText, Receipt, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { PointageTiles } from "./pointage-tiles";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const { session, organizationId } = await requireOrganization();
  const firstName = (session.user?.name ?? "").split(" ")[0];

  const [activeProjects, draftQuotes, openInvoices, totalOpenAmount] = await Promise.all([
    prisma.project.count({ where: { organizationId, status: { in: ["PROSPECT", "ACTIVE"] } } }),
    prisma.quote.count({ where: { organizationId, status: { in: ["DRAFT", "SENT"] } } }),
    prisma.invoice.count({ where: { organizationId, status: { in: ["SENT", "OVERDUE"] } } }),
    prisma.invoice.aggregate({
      _sum: { totalTvac: true },
      where: { organizationId, status: { in: ["SENT", "OVERDUE"] } }
    })
  ]);

  const recentProjects = await prisma.project.findMany({
    where: { organizationId },
    orderBy: { updatedAt: "desc" },
    take: 5,
    include: { customer: true }
  });

  // Pointage : chantiers actifs + éventuel pointage en cours de l'utilisateur
  const [tileProjects, runningEntry] = await Promise.all([
    prisma.project.findMany({
      where: { organizationId, status: { in: ["ACTIVE", "PROSPECT", "ON_HOLD"] } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, customer: { select: { name: true } } }
    }),
    prisma.timesheetEntry.findFirst({
      where: { organizationId, userId: session.user.id as string, startAt: { not: null }, endAt: null },
      orderBy: { startAt: "desc" },
      select: { projectId: true, startAt: true }
    })
  ]);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold text-ink">Salut {firstName} 👋</h1>
        <p className="text-ink-300 mt-1">Voici ton activité aujourd'hui.</p>
      </header>

      {/* Pointage : dalles chantiers, clic = démarre/arrête le temps de prestation */}
      {tileProjects.length > 0 && (
        <section>
          <h2 className="font-bold text-lg mb-3">Pointage — clique sur un chantier</h2>
          <PointageTiles
            projects={tileProjects.map((p) => ({ id: p.id, name: p.name, customer: p.customer?.name ?? null }))}
            runningProjectId={runningEntry?.projectId ?? null}
            startAt={runningEntry?.startAt ? new Date(runningEntry.startAt).toISOString() : null}
          />
        </section>
      )}

      {/* KPI cards — grosses, lisibles */}
      <div className="grid grid-cols-2 gap-3">
        <KpiCard label="Chantiers actifs" value={activeProjects} href="/chantiers" />
        <KpiCard label="Devis en cours" value={draftQuotes} href="/devis" />
        <KpiCard label="Factures à encaisser" value={openInvoices} href="/factures" />
        <KpiCard
          label="Montant attendu"
          value={formatCurrency(Number(totalOpenAmount._sum.totalTvac ?? 0))}
          href="/factures"
          gold
        />
      </div>

      {/* Actions rapides */}
      <section>
        <h2 className="font-bold text-lg mb-3">Que veux-tu faire ?</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <QuickAction href="/chantiers/new" icon={Hammer} label="Nouveau chantier" />
          <QuickAction href="/devis/new" icon={FileText} label="Nouveau devis" />
          <QuickAction href="/factures/new" icon={Receipt} label="Nouvelle facture" />
        </div>
      </section>

      {/* Chantiers récents */}
      <section>
        <h2 className="font-bold text-lg mb-3">Tes derniers chantiers</h2>
        {recentProjects.length === 0 ? (
          <div className="card p-6 text-center">
            <Hammer className="w-10 h-10 text-ink-300 mx-auto mb-2" />
            <p className="text-ink-300 mb-4">Pas encore de chantier.</p>
            <Link href="/chantiers/new" className="btn-gold">
              <Plus className="w-5 h-5" /> Créer le premier
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {recentProjects.map((p) => (
              <Link key={p.id} href={`/chantiers/${p.id}`} className="block card p-4 hover:shadow-lift transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-sm text-ink-300">
                      {p.customer?.name ?? "Sans client"} · {p.reference}
                    </div>
                  </div>
                  <ProjectStatusBadge status={p.status} />
                </div>
              </Link>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function KpiCard({ label, value, href, gold = false }: { label: string; value: number | string; href: string; gold?: boolean }) {
  return (
    <Link href={href} className={"card p-5 flex flex-col justify-between min-h-[100px] hover:shadow-lift transition-shadow " + (gold ? "bg-gold/10 border-gold-200" : "")}>
      <span className="text-xs uppercase tracking-wider text-ink-300 font-semibold">{label}</span>
      <span className="text-3xl font-black text-ink mt-2">{value}</span>
    </Link>
  );
}

function QuickAction({ href, icon: Icon, label }: { href: string; icon: any; label: string }) {
  return (
    <Link href={href} className="card p-5 flex flex-col items-center gap-2 text-center hover:shadow-lift hover:bg-gold/5 transition-all">
      <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center">
        <Icon className="w-6 h-6 text-gold-700" />
      </div>
      <span className="text-sm font-semibold">{label}</span>
    </Link>
  );
}

function ProjectStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    PROSPECT:  { label: "Prospect",  cls: "badge-ink" },
    ACTIVE:    { label: "En cours",  cls: "badge-gold" },
    ON_HOLD:   { label: "En pause",  cls: "badge-warning" },
    DONE:      { label: "Terminé",   cls: "badge-success" },
    CANCELLED: { label: "Annulé",    cls: "badge-danger" }
  };
  const c = map[status] ?? { label: status, cls: "badge-ink" };
  return <span className={c.cls}>{c.label}</span>;
}
