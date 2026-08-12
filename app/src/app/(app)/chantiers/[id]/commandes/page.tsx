import Link from "next/link";
import { notFound } from "next/navigation";
import { ShoppingBag, Truck, Mail, CheckCircle2, AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireOrganization } from "@/lib/session";
import { formatCurrency, formatDate } from "@/lib/utils";
import { previewMaterialOrdersFromProject } from "@/server/actions/material-orders";
import { GenerateOrdersButton } from "./generate-button";

export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: "Brouillon", cls: "badge-ink" },
  ORDERED: { label: "Commandée", cls: "badge-gold" },
  DELIVERED: { label: "Livrée", cls: "badge-success" },
  CANCELLED: { label: "Annulée", cls: "badge-ink" }
};

export default async function Page({ params }: { params: { id: string } }) {
  const { organizationId } = await requireOrganization();
  const project = await prisma.project.findFirst({
    where: { id: params.id, organizationId },
    select: { id: true, name: true }
  });
  if (!project) notFound();

  // Préview de ce qu'on commanderait si on cliquait sur "Commander"
  const preview = await previewMaterialOrdersFromProject(project.id);

  // Commandes déjà créées pour ce chantier
  const orders = await prisma.materialOrder.findMany({
    where: { organizationId, projectId: project.id },
    include: { supplier: { select: { name: true, email: true } }, _count: { select: { lines: true } } },
    orderBy: [{ createdAt: "desc" }]
  });

  const totalPendingHt = preview.pending.reduce((s, p) => s + p.totalHt, 0);

  return (
    <div>
      <h2 className="font-bold text-xl mb-4 flex items-center gap-2">
        <ShoppingBag className="w-5 h-5" /> Commandes matériel
      </h2>

      {/* Préview tranches commandables */}
      <section className="card p-5 mb-5 border-2 border-gold">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">À commander depuis les devis acceptés</h3>
          {preview.alreadyOrdered > 0 && (
            <span className="text-xs text-ink-300">
              {preview.alreadyOrdered} ligne{preview.alreadyOrdered > 1 ? "s" : ""} déjà commandée{preview.alreadyOrdered > 1 ? "s" : ""}
            </span>
          )}
        </div>

        {preview.pending.length === 0 ? (
          <p className="text-sm text-ink-300">
            Rien à commander. Ajoute des lignes « Référence exacte » dans un devis accepté pour générer automatiquement des bons de commande.
          </p>
        ) : (
          <>
            <ul className="space-y-2 mb-4">
              {preview.pending.map((p) => (
                <li key={p.supplierId} className="flex items-center justify-between p-3 bg-cream-100 rounded-lg">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium inline-flex items-center gap-2">
                      <Truck className="w-4 h-4 text-ink-300" /> {p.supplierName}
                    </div>
                    <div className="text-xs text-ink-300 mt-0.5">
                      {p.lineCount} référence{p.lineCount > 1 ? "s" : ""}
                      {p.supplierEmail ? ` · email : ${p.supplierEmail}` : (
                        <span className="text-amber-700"> · ⚠ pas d'email enregistré</span>
                      )}
                    </div>
                  </div>
                  <div className="font-semibold tabular-nums">{formatCurrency(p.totalHt)}</div>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between text-sm pb-3 border-b border-cream-300 mb-3">
              <span className="text-ink-300">Total estimé HT</span>
              <strong className="text-lg">{formatCurrency(totalPendingHt)}</strong>
            </div>
            <GenerateOrdersButton
              projectId={project.id}
              supplierCount={preview.pending.length}
              missingEmailCount={preview.pending.filter((p) => !p.supplierEmail).length}
            />
          </>
        )}
      </section>

      {/* Commandes existantes pour ce chantier */}
      <section>
        <h3 className="font-semibold mb-3">Bons de commande ({orders.length})</h3>
        {orders.length === 0 ? (
          <p className="card p-5 text-center text-ink-300 text-sm">
            Aucun bon de commande pour ce chantier.
          </p>
        ) : (
          <ul className="space-y-2">
            {orders.map((o) => {
              const st = STATUS[o.status];
              return (
                <li key={o.id} className="card p-3">
                  <div className="flex items-start gap-3">
                    <Link href={`/commandes/${o.id}`} className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-mono text-xs px-1.5 py-0.5 bg-ink text-cream rounded">{o.reference}</span>
                        <span className={st.cls}>{st.label}</span>
                        {o.emailedAt && (
                          <span className="text-[10px] text-emerald-700 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Envoyé {formatDate(o.emailedAt)}
                          </span>
                        )}
                        {o.emailError && (
                          <span className="text-[10px] text-red-700 inline-flex items-center gap-1" title={o.emailError}>
                            <AlertTriangle className="w-3 h-3" /> erreur d'envoi
                          </span>
                        )}
                      </div>
                      <div className="font-medium truncate">
                        {o.supplier?.name ?? "Fournisseur supprimé"}
                      </div>
                      <div className="text-xs text-ink-300">
                        {o._count.lines} ligne{o._count.lines > 1 ? "s" : ""}
                        {o.supplier?.email && ` · ${o.supplier.email}`}
                      </div>
                    </Link>
                    <div className="text-right">
                      <div className="font-semibold tabular-nums">{formatCurrency(Number(o.totalHt))}</div>
                      <a
                        href={`/api/material-order-pdf?id=${o.id}`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-xs text-gold-700 hover:underline inline-flex items-center gap-1 mt-1"
                      >
                        <Mail className="w-3 h-3" /> PDF
                      </a>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
