import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireOrganization } from "@/lib/session";
import { formatCurrency, formatDate } from "@/lib/utils";
import { OrderHeaderForm } from "../order-form";
import { OrderLines } from "./lines";
import { OrderStatusActions } from "./status-actions";

export const dynamic = "force-dynamic";

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: "Brouillon", cls: "badge-ink" },
  ORDERED: { label: "Commandé", cls: "badge-gold" },
  DELIVERED: { label: "Livré", cls: "badge-success" },
  CANCELLED: { label: "Annulé", cls: "badge-ink" }
};

export default async function Page({ params }: { params: { id: string } }) {
  const { organizationId } = await requireOrganization();
  const [order, suppliers, projects, materials] = await Promise.all([
    prisma.materialOrder.findFirst({
      where: { id: params.id, organizationId },
      include: { supplier: true, project: true, lines: { orderBy: { position: "asc" }, include: { material: true } } }
    }),
    prisma.supplier.findMany({ where: { organizationId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.project.findMany({ where: { organizationId }, orderBy: { name: "asc" }, select: { id: true, name: true, reference: true } }),
    prisma.material.findMany({ where: { organizationId }, orderBy: { name: "asc" }, select: { id: true, name: true, unit: true, unitCost: true } })
  ]);
  if (!order) notFound();
  const st = STATUS_MAP[order.status];
  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <Link href="/commandes" className="text-sm text-ink-300 inline-flex items-center gap-1 mb-3"><ArrowLeft className="w-4 h-4" /> Retour</Link>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold">{order.supplier?.name ?? "Commande sans fournisseur"}</h1>
          <p className="text-ink-300 text-sm mt-1">
            {order.reference}
            {order.project && ` · ${order.project.name}`}
            {order.expectedAt && ` · attendu ${formatDate(order.expectedAt)}`}
          </p>
        </div>
        <span className={st.cls}>{st.label}</span>
      </div>
      <div className="mb-5">
        <OrderStatusActions orderId={order.id} currentStatus={order.status} />
      </div>
      <div className="card p-4 mb-4 bg-ink text-cream text-center">
        <div className="text-xs text-cream/60 uppercase">Total HTVA</div>
        <div className="text-3xl font-black text-gold mt-1">{formatCurrency(Number(order.totalHt))}</div>
      </div>
      <section className="mb-5">
        <h2 className="font-bold text-lg mb-3">Lignes ({order.lines.length})</h2>
        <OrderLines orderId={order.id} lines={order.lines as any} materials={materials as any} editable={order.status === "DRAFT"} />
      </section>
      <section>
        <h2 className="font-bold text-lg mb-3">Infos</h2>
        <div className="card p-5"><OrderHeaderForm initial={order as any} suppliers={suppliers} projects={projects} /></div>
      </section>
    </div>
  );
}
