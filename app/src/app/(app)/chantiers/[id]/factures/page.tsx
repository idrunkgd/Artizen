import Link from "next/link";
import { Plus, Receipt } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireOrganization } from "@/lib/session";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CreateInvoiceFromMilestonesButton } from "./create-from-milestones";
import { CreateInvoiceFromTimesheetButton } from "./create-from-timesheet";

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
  const project = await prisma.project.findFirst({
    where: { id: params.id, organizationId },
    include: {
      invoices: { orderBy: { issueDate: "desc" } },
      // Tous les devis liés au chantier (acceptés ou autre — mais on filtrera les tranches sur ACCEPTED + non facturé)
      quotes: {
        where: { status: "ACCEPTED" },
        include: { milestones: { orderBy: { position: "asc" } } }
      }
    }
  });
  if (!project) return null;

  // Devis en régie du chantier (on facture ses heures, pas des tranches)
  const regieQuote = project.quotes.find((q) => q.billingType === "REGIE");
  let regieEntries: { date: string; hours: number }[] = [];
  if (regieQuote) {
    const rows = await prisma.timesheetEntry.findMany({
      where: { organizationId, projectId: project.id, invoiceId: null, hours: { gt: 0 } },
      orderBy: { date: "asc" },
      select: { date: true, hours: true }
    });
    regieEntries = rows.map((r) => ({
      date: new Date(r.date).toISOString().slice(0, 10),
      hours: Number(r.hours)
    }));
  }

  // Liste des tranches dispos (acceptées et non encore facturées), groupées par devis
  const availableByQuote = project.quotes
    .map((q) => ({
      quoteId: q.id,
      quoteTitle: q.title,
      quoteReference: q.reference,
      vatRate: Number(q.vatRate),
      milestones: q.milestones
        .filter((m) => m.invoicedAt == null)
        .map((m) => ({
          id: m.id,
          label: m.label,
          percentage: m.percentage ? Number(m.percentage) : null,
          amountHt: Number(m.amountHt)
        }))
    }))
    .filter((q) => q.milestones.length > 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-lg">Factures du chantier ({project.invoices.length})</h2>
      </div>

      {/* Facturation régie : heures prestées */}
      {regieQuote && (
        <div className="card p-4 mb-4 border-2 border-gold bg-gold/5">
          <h3 className="font-semibold mb-2">Heures à facturer (régie)</h3>
          {regieEntries.length > 0 ? (
            <CreateInvoiceFromTimesheetButton
              quoteId={regieQuote.id}
              quoteTitle={regieQuote.title}
              hourlyRate={Number(regieQuote.hourlyRate ?? 0)}
              vatRate={Number(regieQuote.vatRate)}
              entries={regieEntries}
            />
          ) : (
            <p className="text-sm text-ink-300">
              Aucune heure en attente. Saisis des heures dans l'onglet <strong>Heures</strong> — elles apparaîtront ici à facturer.
            </p>
          )}
        </div>
      )}

      {/* Création depuis tranches */}
      {availableByQuote.length > 0 ? (
        <div className="card p-4 mb-4 border-2 border-gold bg-gold/5">
          <h3 className="font-semibold mb-1">Tranches à facturer</h3>
          <p className="text-sm text-ink-300 mb-3">
            Sélectionne une ou plusieurs tranches de tes devis acceptés pour générer une facture.
          </p>
          <CreateInvoiceFromMilestonesButton
            projectId={project.id}
            availableByQuote={availableByQuote}
          />
        </div>
      ) : (
        project.quotes.length > 0 && (
          <div className="card p-3 mb-4 bg-cream-200 text-sm text-ink-300">
            ✓ Toutes les tranches des devis acceptés ont été facturées.
          </div>
        )
      )}

      {/* Liste des factures */}
      {project.invoices.length === 0 ? (
        <div className="card p-6 text-center">
          <Receipt className="w-10 h-10 text-ink-300 mx-auto mb-2" />
          <p className="text-ink-300 text-sm">
            Aucune facture pour ce chantier.
            {availableByQuote.length === 0 && project.quotes.length === 0 && (
              <> Accepte d'abord un devis pour pouvoir facturer.</>
            )}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {project.invoices.map((i) => {
            const st = STATUS_MAP[i.status];
            return (
              <Link key={i.id} href={`/factures/${i.id}`} className="block card p-3 hover:shadow-lift">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="font-medium">{i.title}</div>
                  <span className={st.cls}>{st.label}</span>
                </div>
                <div className="text-sm text-ink-300 flex items-center justify-between">
                  <span>{i.reference} · émise {formatDate(i.issueDate)}{i.dueDate && ` · éch. ${formatDate(i.dueDate)}`}</span>
                  <strong className="text-ink">{formatCurrency(Number(i.totalTvac))} TVAC</strong>
                </div>
              </Link>
            );
          })}
        </ul>
      )}
    </div>
  );
}
