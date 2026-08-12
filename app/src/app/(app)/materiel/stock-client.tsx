"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Minus, Pencil, Loader2 } from "lucide-react";
import { adjustStock } from "@/server/actions/materials";
import { formatCurrency } from "@/lib/utils";
import { MaterialForm } from "./material-form";

export function StockClient({ materials }: { materials: any[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <ul className="space-y-2">
      {materials.map((m) => {
        if (editing === m.id) {
          return (
            <li key={m.id} className="card p-4 border-2 border-gold">
              <MaterialForm initial={m} suppliers={[]} />
              <button onClick={() => setEditing(null)} className="btn-ghost w-full mt-2">Fermer</button>
            </li>
          );
        }
        return (
          <li key={m.id} className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="font-semibold">{m.name}</div>
                {m.description && <div className="text-sm text-ink-300">{m.description}</div>}
                {m.defaultSupplier && <div className="text-xs text-ink-300 mt-0.5">Fournisseur : {m.defaultSupplier.name}</div>}
              </div>
              <button onClick={() => setEditing(m.id)} className="p-2 text-ink-300 hover:text-ink"><Pencil className="w-4 h-4" /></button>
            </div>
            <StockAdjuster materialId={m.id} stockQty={Number(m.stockQty)} unit={m.unit} unitCost={m.unitCost ? Number(m.unitCost) : null} />
          </li>
        );
      })}
    </ul>
  );
}

function StockAdjuster({ materialId, stockQty, unit, unitCost }: { materialId: string; stockQty: number; unit: string; unitCost: number | null }) {
  const [pending, start] = useTransition();
  function adj(delta: number) {
    start(async () => {
      try { await adjustStock(materialId, delta); toast.success(delta > 0 ? "+" + delta + " " + unit : delta + " " + unit); }
      catch (e: any) { toast.error(e?.message ?? "Erreur"); }
    });
  }
  return (
    <div className="mt-3 pt-3 border-t border-cream-300 flex items-center justify-between">
      <div>
        <div className="text-xs text-ink-300 uppercase">Stock</div>
        <div className="text-2xl font-black">{stockQty} <span className="text-base font-normal text-ink-300">{unit}</span></div>
        {unitCost != null && <div className="text-xs text-ink-300">≈ {formatCurrency(stockQty * unitCost)}</div>}
      </div>
      <div className="flex gap-1">
        <button onClick={() => adj(-1)} disabled={pending} className="btn-secondary btn-sm w-12"><Minus className="w-4 h-4" /></button>
        <button onClick={() => adj(1)} disabled={pending} className="btn-gold btn-sm w-12"><Plus className="w-4 h-4" /></button>
      </div>
    </div>
  );
}
