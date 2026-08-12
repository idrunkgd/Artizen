import Link from "next/link";
import { Plus, FileText, Receipt, Camera } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireOrganization } from "@/lib/session";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ApercuPage({ params }: { params: { id: string } }) {
  const { organizationId } = await requireOrganization();
  const project = await prisma.project.findFirst({
    where: { id: params.id, organizationId },
    include: {
      quotes: { take: 3, orderBy: { createdAt: "desc" } },
      invoices: { take: 3, orderBy: { issueDate: "desc" } },
      photos: { take: 4, orderBy: { takenAt: "desc" }, select: { id: true } }
    }
  });
  if (!project) return null;

  const totalAcceptedQuotes = project.quotes.filter((q) => q.status === "ACCEPTED").reduce((s, q) => s + Number(q.totalTvac), 0);
  const totalInvoiced = project.invoices.filter((i) => i.status !== "CANCELLED" && i.status !== "DRAFT").reduce((s, i) => s + Number(i.totalTvac), 0);
  const totalPaid = project.invoices.filter((i) => i.status === "PAID").reduce((s, i) => s + Number(i.totalTvac), 0);
  const remainingToInvoice = totalAcceptedQuotes - totalInvoiced;

  return (
    <div className="space-y-4">
      {/* KPIs financiers */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <KpiCard label="Devis acceptés" value={formatCurrency(totalAcceptedQuotes)} />
        <KpiCard label="Facturé" value={formatCurrency(totalInvoiced)} />
        <KpiCard label="Encaissé" value={formatCurrency(totalPaid)} gold />
        <KpiCard label="Reste à facturer" value={formatCurrency(remainingToInvoice)} warning={remainingToInvoice > 0} />
      </div>

      {/* Description */}
      {project.description && (
        <div className="card p-4">
          <h3 className="font-semibold text-sm mb-1">Description</h3>
          <p className="text-sm text-ink-600 whitespace-pre-wrap">{project.description}</p>
        </div>
      )}

      {/* Derniers devis */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold flex items-center gap-2"><FileText className="w-4 h-4" /> Derniers devis</h2>
          <Link href={`/chantiers/${project.id}/devis`} className="text-sm text-gold-700 hover:underline">Tout voir →</Link>
        </div>
        {project.quotes.length === 0 ? (
          <p className="text-sm text-ink-300">Pas encore de devis.</p>
        ) : (
          <ul className="space-y-1">
            {project.quotes.map((q) => (
              <Link key={q.id} href={`/devis/${q.id}`} className="block card p-3 hover:shadow-lift text-sm">
                <div className="flex justify-between"><span className="font-medium">{q.title}</span><strong>{formatCurrency(Number(q.totalTvac))}</strong></div>
                <div className="text-xs text-ink-300">{q.reference} · {formatDate(q.createdAt)}</div>
              </Link>
            ))}
          </ul>
        )}
      </section>

      {/* Photos miniatures */}
      {project.photos.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold flex items-center gap-2"><Camera className="w-4 h-4" /> Photos récentes</h2>
            <Link href={`/chantiers/${project.id}/photos`} className="text-sm text-gold-700 hover:underline">Tout voir →</Link>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {project.photos.map((p) => (
              <Link key={p.id} href={`/chantiers/${project.id}/photos`} className="aspect-square rounded-lg overflow-hidden">
                <img src={`/api/photos/${p.id}`} alt="" className="w-full h-full object-cover" />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function KpiCard({ label, value, gold = false, warning = false }: { label: string; value: string; gold?: boolean; warning?: boolean }) {
  return (
    <div className={"card p-3 " + (gold ? "bg-gold/10 border-gold-200" : warning ? "bg-amber-50 border-amber-300" : "")}>
      <div className="text-[10px] uppercase tracking-wider text-ink-300 font-semibold">{label}</div>
      <div className={"text-lg font-black mt-1 " + (gold ? "text-gold-800" : warning ? "text-amber-800" : "text-ink")}>{value}</div>
    </div>
  );
}
