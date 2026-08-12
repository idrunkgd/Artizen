import Link from "next/link";
import { requireOrganization } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Receipt } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { InvoiceRow } from "./row";

export const dynamic = "force-dynamic";

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: "Brouillon", cls: "badge-ink" },
  SENT: { label: "Envoyée", cls: "badge-gold" },
  PAID: { label: "Payée", cls: "badge-success" },
  OVERDUE: { label: "En retard", cls: "badge-danger" },
  CANCELLED: { label: "Annulée", cls: "badge-ink" }
};

export default async function Page() {
  const { organizationId } = await requireOrganization();
  const invoices = await prisma.invoice.findMany({
    where: { organizationId },
    orderBy: [{ status: "asc" }, { issueDate: "desc" }],
    include: { customer: { select: { name: true } } }
  });
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <header className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold">Factures</h1>
          <p className="text-ink-300 text-sm">{invoices.length} facture(s)</p>
        </div>
        <Link href="/chantiers" className="btn-secondary btn-sm">
          Créer une facture → choisis un chantier
        </Link>
      </header>
      {invoices.length === 0 ? (
        <div className="card p-8 text-center">
          <Receipt className="w-12 h-12 text-ink-300 mx-auto mb-3" />
          <p className="text-ink-300 mb-4">Pas encore de facture.</p>
          <p className="text-sm text-ink-300 mb-4">
            Les factures se créent depuis un chantier, à partir des tranches d'un devis accepté.
          </p>
          <Link href="/chantiers" className="btn-gold">Voir mes chantiers</Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {invoices.map((i) => {
            const st = STATUS_MAP[i.status];
            return (
              <InvoiceRow
                key={i.id}
                invoice={{
                  id: i.id,
                  title: i.title,
                  reference: i.reference,
                  customerName: i.customer.name,
                  issueDate: formatDate(i.issueDate),
                  dueDate: i.dueDate ? formatDate(i.dueDate) : null,
                  totalTvac: formatCurrency(Number(i.totalTvac)),
                  status: i.status,
                  statusLabel: st.label,
                  statusCls: st.cls
                }}
              />
            );
          })}
        </ul>
      )}
    </div>
  );
}
