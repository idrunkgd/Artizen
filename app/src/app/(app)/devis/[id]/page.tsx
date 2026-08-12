import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, Send, Check, X } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireOrganization } from "@/lib/session";
import { formatCurrency, formatDate } from "@/lib/utils";
import { QuoteHeaderForm } from "../quote-header-form";
import { LinesEditor } from "./lines-editor";
import { MilestonesEditor } from "./milestones-editor";
import { StatusActions } from "./status-actions";

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
  const [quote, customers] = await Promise.all([
    prisma.quote.findFirst({
      where: { id: params.id, organizationId },
      include: {
        customer: true, project: true, customerAddress: true,
        // include catalogItem + supplier pour afficher la pastille
        // "Référence X · Fournisseur Y" sur chaque ligne du devis
        lines: {
          orderBy: { position: "asc" },
          include: { catalogItem: { include: { supplier: { select: { name: true } } } } }
        },
        milestones: { orderBy: { position: "asc" } }
      }
    }),
    prisma.customer.findMany({
      where: { organizationId }, orderBy: { name: "asc" },
      select: {
        id: true, name: true,
        addresses: {
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
          select: { id: true, label: true, street: true, postalCode: true, city: true, isPrimary: true }
        }
      }
    })
  ]);
  if (!quote) notFound();
  const st = STATUS_MAP[quote.status];
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <Link href="/devis" className="text-sm text-ink-300 inline-flex items-center gap-1 mb-3"><ArrowLeft className="w-4 h-4" /> Retour aux devis</Link>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{quote.title}</h1>
          <p className="text-ink-300 text-sm mt-1">
            {quote.reference} · {quote.customer.name}{quote.project && ` · ${quote.project.name}`}
          </p>
        </div>
        <span className={st.cls}>{st.label}</span>
      </div>

      {/* Actions principales */}
      <div className="flex flex-wrap gap-2 mb-5">
        <a href={`/api/devis-pdf?id=${quote.id}`} target="_blank" className="btn-primary">
          <Download className="w-5 h-5" /> Télécharger le PDF
        </a>
        <StatusActions quoteId={quote.id} currentStatus={quote.status} customerAddressId={quote.customerAddressId} quoteTitle={quote.title} />
      </div>

      {/* Total */}
      <div className="card p-5 mb-4 bg-ink text-cream">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-xs text-cream/60 uppercase tracking-wider">Total HTVA</div>
            <div className="text-xl font-bold mt-1">{formatCurrency(Number(quote.totalHt))}</div>
          </div>
          <div className="border-x border-cream/20">
            <div className="text-xs text-cream/60 uppercase tracking-wider">TVA {Number(quote.vatRate)}%</div>
            <div className="text-xl font-bold mt-1">{formatCurrency(Number(quote.totalTvac) - Number(quote.totalHt))}</div>
          </div>
          <div>
            <div className="text-xs text-cream/60 uppercase tracking-wider">Total TVAC</div>
            <div className="text-2xl font-black text-gold mt-1">{formatCurrency(Number(quote.totalTvac))}</div>
          </div>
        </div>
      </div>

      {/* Lignes */}
      <section className="mb-5">
        <h2 className="font-bold text-lg mb-3">Lignes du devis ({quote.lines.length})</h2>
        <LinesEditor quoteId={quote.id} lines={quote.lines as any} />
      </section>

      {/* Tranches */}
      <section className="mb-5">
        <h2 className="font-bold text-lg mb-3">Tranches de facturation ({quote.milestones.length})</h2>
        <MilestonesEditor quoteId={quote.id} milestones={quote.milestones as any} totalHt={Number(quote.totalHt)} />
      </section>

      {/* Édition header */}
      <section>
        <h2 className="font-bold text-lg mb-3">Modifier les infos du devis</h2>
        <div className="card p-5">
          <QuoteHeaderForm initial={quote as any} customers={customers} />
        </div>
      </section>
    </div>
  );
}
