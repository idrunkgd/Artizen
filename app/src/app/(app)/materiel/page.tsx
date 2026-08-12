import Link from "next/link";
import { requireOrganization } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Plus, Package } from "lucide-react";
import { StockClient } from "./stock-client";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { organizationId } = await requireOrganization();
  const materials = await prisma.material.findMany({
    where: { organizationId },
    orderBy: { name: "asc" },
    include: { defaultSupplier: { select: { name: true } } }
  });
  const stockValue = materials.reduce((s, m) => s + (m.unitCost ? Number(m.stockQty) * Number(m.unitCost) : 0), 0);
  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <header className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold">Matériel</h1>
          <p className="text-ink-300 text-sm">{materials.length} réf · stock ≈ {formatCurrency(stockValue)}</p>
        </div>
        <Link href="/materiel/new" className="btn-gold"><Plus className="w-5 h-5" /> Nouveau</Link>
      </header>
      {materials.length === 0 ? (
        <div className="card p-8 text-center">
          <Package className="w-12 h-12 text-ink-300 mx-auto mb-3" />
          <p className="text-ink-300 mb-4">Pas de matériel en stock.</p>
          <Link href="/materiel/new" className="btn-gold"><Plus className="w-5 h-5" /> Ajouter</Link>
        </div>
      ) : (
        <StockClient materials={materials as any} />
      )}
    </div>
  );
}
