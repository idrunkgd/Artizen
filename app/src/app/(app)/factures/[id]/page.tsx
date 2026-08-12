import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Hammer, User as UserIcon } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireOrganization } from "@/lib/session";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PdfPreviewButton } from "@/components/pdf-preview";
import { InvoiceLines } from "./lines";
import { InvoiceStatusActions } from "./status-actions";
import { MinimalInvoiceEditor } from "./minimal-editor";

export const dynamic = "force-dynamic";

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: "Brouillon", cls: "badge-ink" },
  SENT: { label: "Envoyée", cls: "badge-gold" },
  PAID: { label: "Payée", cls: "badge-success" },
  OVERDUE: { label: "En retard", cls: "badge-danger" },
  CANCELLED: { label: "Annulée", cls: "badge-ink" }
};

export default async function Page({ params }: { params: { id: string } }) {
  const { organizationId } = await requireOrganization();
  const invoice = await prisma.invoice.findFirst({
    where: { id: params.id, organizationId },
    include: {
      customer: true, project: true, quote: true,
      lines: { orderBy: { position: "asc" } },
      // Tranches couvertes par cette facture (pour navigation devis ← tranche → facture)
      coveredMilestones: {
        include: { quote: { select: { id: true, title: true, reference: true } } }
      }
    }
  });
  if (!invoice) notFound();
  const st = STATUS_MAP[invoice.status];
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <Link href="/factures" className="text-sm text-ink-300 inline-flex items-center gap-1 mb-3">
        <ArrowLeft className="w-4 h-4" /> Retour aux factures
      </Link>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{invoice.title}</h1>
          <p className="text-ink-300 text-sm mt-1">
            {invoice.reference} · émise {formatDate(invoice.issueDate)}
          </p>
        </div>
        <span className={st.cls}>{st.label}</span>
      </div>

      {/* Liens client + chantier */}
      <div className="flex flex-wrap gap-3 text-sm mb-4 text-ink-600">
        <Link href={`/clients/${invoice.customer.id}`} className="hover:text-gold-700 flex items-center gap-1">
          <UserIcon className="w-4 h-4" /> {invoice.customer.name}
        </Link>
        {invoice.project && (
          <Link href={`/chantiers/${invoice.project.id}`} className="hover:text-gold-700 flex items-center gap-1">
            <Hammer className="w-4 h-4" /> {invoice.project.name} ({invoice.project.reference})
          </Link>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        <PdfPreviewButton url={`/api/facture-pdf?id=${invoice.id}`} filename={`Facture-${invoice.reference}.pdf`} />
        <InvoiceStatusActions invoiceId={invoice.id} currentStatus={invoice.status} />
      </div>

      {/* Totaux */}
      <div className="card p-5 mb-4 bg-ink text-cream">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div><div className="text-xs text-cream/60 uppercase">HTVA</div><div className="text-xl font-bold mt-1">{formatCurrency(Number(invoice.totalHt))}</div></div>
          <div className="border-x border-cream/20"><div className="text-xs text-cream/60 uppercase">TVA {Number(invoice.vatRate)}%</div><div className="text-xl font-bold mt-1">{formatCurrency(Number(invoice.totalTvac) - Number(invoice.totalHt))}</div></div>
          <div><div className="text-xs text-cream/60 uppercase">TVAC</div><div className="text-2xl font-black text-gold mt-1">{formatCurrency(Number(invoice.totalTvac))}</div></div>
        </div>
      </div>

      {/* Lignes (read-only avec lien vers tranche source) */}
      <section className="mb-5">
        <h2 className="font-bold text-lg mb-3">Détail de la facture</h2>
        <InvoiceLines lines={invoice.lines as any} coveredMilestones={invoice.coveredMilestones as any} />
      </section>

      {/* Éditeur minimal : date d'échéance + notes uniquement */}
      <section>
        <h2 className="font-bold text-lg mb-3">Échéance et notes</h2>
        <div className="card p-5">
          <MinimalInvoiceEditor
            invoiceId={invoice.id}
            initial={{
              dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().slice(0, 10) : "",
              notes: invoice.notes ?? ""
            }}
            editable={invoice.status === "DRAFT"}
          />
        </div>
      </section>
    </div>
  );
}
