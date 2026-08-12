import Link from "next/link";
import { requireOrganization } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Plus, FileText } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: "Brouillon", cls: "badge-ink" },
  SENT: { label: "Envoyé", cls: "badge-gold" },
  ACCEPTED: { label: "Accepté", cls: "badge-success" },
  REFUSED: { label: "Refusé", cls: "badge-danger" },
  EXPIRED: { label: "Expiré", cls: "badge-warning" },
  CANCELLED: { label: "Annulé", cls: "badge-ink" }
};

export default async function DevisPage() {
  const { organizationId } = await requireOrganization();
  const quotes = await prisma.quote.findMany({
    where: { organizationId },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { customer: { select: { name: true } }, project: { select: { name: true } } }
  });
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <header className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold">Devis</h1>
          <p className="text-ink-300 text-sm">{quotes.length} devis</p>
        </div>
        <Link href="/devis/new" className="btn-gold"><Plus className="w-5 h-5" /> Nouveau</Link>
      </header>
      {quotes.length === 0 ? (
        <div className="card p-8 text-center">
          <FileText className="w-12 h-12 text-ink-300 mx-auto mb-3" />
          <p className="text-ink-300 mb-4">Aucun devis pour l'instant.</p>
          <Link href="/devis/new" className="btn-gold"><Plus className="w-5 h-5" /> Créer mon premier devis</Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {quotes.map((q) => {
            const st = STATUS_MAP[q.status];
            return (
              <Link key={q.id} href={`/devis/${q.id}`} className="block card p-4 hover:shadow-lift">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="font-semibold">{q.title}</div>
                  <span className={st.cls}>{st.label}</span>
                </div>
                <div className="text-sm text-ink-300">
                  {q.reference} · {q.customer?.name ?? "Sans client"}
                  {q.project?.name && ` · ${q.project.name}`}
                </div>
                <div className="text-sm font-semibold text-ink mt-1">
                  {formatCurrency(Number(q.totalTvac))} TVAC
                  <span className="text-ink-300 font-normal ml-2 text-xs">
                    ({formatCurrency(Number(q.totalHt))} HTVA · {Number(q.vatRate)}%)
                  </span>
                </div>
              </Link>
            );
          })}
        </ul>
      )}
    </div>
  );
}
