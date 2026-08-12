import Link from "next/link";
import { Plus, FileText } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireOrganization } from "@/lib/session";
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

export default async function Page({ params }: { params: { id: string } }) {
  const { organizationId } = await requireOrganization();
  const project = await prisma.project.findFirst({
    where: { id: params.id, organizationId },
    include: { quotes: { orderBy: { createdAt: "desc" } } }
  });
  if (!project) return null;
  const newQuoteUrl = `/devis/new?customerId=${project.customerId ?? ""}&customerAddressId=${project.customerAddressId ?? ""}`;
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-lg">Devis du chantier ({project.quotes.length})</h2>
        <Link href={newQuoteUrl} className="btn-gold btn-sm"><Plus className="w-4 h-4" /> Nouveau devis</Link>
      </div>
      {project.quotes.length === 0 ? (
        <div className="card p-6 text-center">
          <FileText className="w-10 h-10 text-ink-300 mx-auto mb-2" />
          <p className="text-ink-300 mb-3">Aucun devis lié à ce chantier.</p>
          <Link href={newQuoteUrl} className="btn-gold btn-sm"><Plus className="w-4 h-4" /> Créer le premier</Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {project.quotes.map((q) => {
            const st = STATUS_MAP[q.status];
            return (
              <Link key={q.id} href={`/devis/${q.id}`} className="block card p-3 hover:shadow-lift">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="font-medium">{q.title}</div>
                  <span className={st.cls}>{st.label}</span>
                </div>
                <div className="text-sm text-ink-300 flex items-center justify-between">
                  <span>{q.reference} · {formatDate(q.createdAt)}</span>
                  <strong className="text-ink">{formatCurrency(Number(q.totalTvac))} TVAC</strong>
                </div>
              </Link>
            );
          })}
        </ul>
      )}
    </div>
  );
}
