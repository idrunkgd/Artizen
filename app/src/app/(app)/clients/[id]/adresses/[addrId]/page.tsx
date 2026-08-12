import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Star, FileText, Hammer, Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireOrganization } from "@/lib/session";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const QUOTE_STATUS_MAP: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: "Brouillon", cls: "badge-ink" },
  SENT: { label: "Envoyé", cls: "badge-gold" },
  ACCEPTED: { label: "Accepté", cls: "badge-success" },
  REFUSED: { label: "Refusé", cls: "badge-danger" },
  EXPIRED: { label: "Expiré", cls: "badge-warning" },
  CANCELLED: { label: "Annulé", cls: "badge-ink" }
};
const PROJECT_STATUS_MAP: Record<string, { label: string; cls: string }> = {
  PROSPECT: { label: "Prospect", cls: "badge-ink" },
  ACTIVE: { label: "En cours", cls: "badge-gold" },
  ON_HOLD: { label: "En pause", cls: "badge-warning" },
  DONE: { label: "Terminé", cls: "badge-success" },
  CANCELLED: { label: "Annulé", cls: "badge-ink" }
};

export default async function Page({ params }: { params: { id: string; addrId: string } }) {
  const { organizationId } = await requireOrganization();
  const address = await prisma.customerAddress.findFirst({
    where: { id: params.addrId, customerId: params.id, customer: { organizationId } },
    include: {
      customer: true,
      quotes: { orderBy: { createdAt: "desc" } },
      projects: { orderBy: { createdAt: "desc" } }
    }
  });
  if (!address) notFound();

  const newQuoteUrl = `/devis/new?customerId=${address.customerId}&customerAddressId=${address.id}`;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <Link href={`/clients/${address.customerId}`} className="text-sm text-ink-300 inline-flex items-center gap-1 mb-3">
        <ArrowLeft className="w-4 h-4" /> Retour à {address.customer.name}
      </Link>

      <div className="card p-5 mb-4">
        <div className="flex items-start gap-3">
          <MapPin className={"w-8 h-8 mt-1 " + (address.isPrimary ? "text-gold" : "text-ink-300")} />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold">{address.label || "Adresse"}</h1>
              {address.isPrimary && <span className="badge-gold"><Star className="w-3 h-3" /> Principale</span>}
            </div>
            <p className="text-ink-600">
              {address.street}<br />
              {address.postalCode} {address.city}
              {address.country && address.country !== "Belgique" && `, ${address.country}`}
            </p>
            {address.notes && <p className="text-sm text-ink-300 mt-2">{address.notes}</p>}
          </div>
        </div>
      </div>

      {/* Devis à cette adresse */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <FileText className="w-5 h-5" /> Devis à cette adresse ({address.quotes.length})
          </h2>
          <Link href={newQuoteUrl} className="btn-gold btn-sm">
            <Plus className="w-4 h-4" /> Nouveau devis
          </Link>
        </div>
        {address.quotes.length === 0 ? (
          <div className="card p-5 text-center">
            <p className="text-ink-300 text-sm mb-3">Aucun devis pour cette adresse.</p>
            <Link href={newQuoteUrl} className="btn-gold btn-sm"><Plus className="w-4 h-4" /> Créer le premier</Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {address.quotes.map((q) => {
              const st = QUOTE_STATUS_MAP[q.status];
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
      </section>

      {/* Chantiers à cette adresse */}
      <section>
        <h2 className="font-bold text-lg flex items-center gap-2 mb-3">
          <Hammer className="w-5 h-5" /> Chantiers à cette adresse ({address.projects.length})
        </h2>
        {address.projects.length === 0 ? (
          <p className="text-center text-ink-300 text-sm py-3">
            Aucun chantier ouvert. Accepte un devis pour en créer un.
          </p>
        ) : (
          <ul className="space-y-2">
            {address.projects.map((p) => {
              const st = PROJECT_STATUS_MAP[p.status];
              return (
                <Link key={p.id} href={`/chantiers/${p.id}`} className="block card p-3 hover:shadow-lift">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="font-medium">{p.name}</div>
                    <span className={st.cls}>{st.label}</span>
                  </div>
                  <div className="text-sm text-ink-300 flex items-center justify-between">
                    <span>{p.reference} · démarré {formatDate(p.createdAt)}</span>
                    {p.budgetEstimate && <strong className="text-ink">{formatCurrency(Number(p.budgetEstimate))}</strong>}
                  </div>
                </Link>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
