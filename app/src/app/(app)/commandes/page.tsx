import Link from "next/link";
import { requireOrganization } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Plus, ShoppingBag } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: "Brouillon", cls: "badge-ink" },
  ORDERED: { label: "Commandé", cls: "badge-gold" },
  DELIVERED: { label: "Livré", cls: "badge-success" },
  CANCELLED: { label: "Annulé", cls: "badge-ink" }
};

export default async function Page() {
  const { organizationId } = await requireOrganization();
  const orders = await prisma.materialOrder.findMany({
    where: { organizationId },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { supplier: { select: { name: true } }, project: { select: { name: true } } }
  });
  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <header className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold">Commandes</h1>
          <p className="text-ink-300 text-sm">{orders.length} commande(s)</p>
        </div>
        <Link href="/commandes/new" className="btn-gold"><Plus className="w-5 h-5" /> Nouvelle</Link>
      </header>
      {orders.length === 0 ? (
        <div className="card p-8 text-center">
          <ShoppingBag className="w-12 h-12 text-ink-300 mx-auto mb-3" />
          <p className="text-ink-300 mb-4">Aucune commande.</p>
          <Link href="/commandes/new" className="btn-gold"><Plus className="w-5 h-5" /> Créer</Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {orders.map((o) => {
            const st = STATUS_MAP[o.status];
            return (
              <Link key={o.id} href={`/commandes/${o.id}`} className="block card p-4 hover:shadow-lift">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="font-semibold">{o.supplier?.name ?? "Fournisseur non défini"}</div>
                  <span className={st.cls}>{st.label}</span>
                </div>
                <div className="text-sm text-ink-300">
                  {o.reference}{o.project?.name && ` · ${o.project.name}`}
                  {o.expectedAt && ` · attendu ${formatDate(o.expectedAt)}`}
                </div>
                <div className="text-sm font-semibold text-ink mt-1">{formatCurrency(Number(o.totalHt))} HTVA</div>
              </Link>
            );
          })}
        </ul>
      )}
    </div>
  );
}
