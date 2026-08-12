"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Package } from "lucide-react";
import { addOrderLine, deleteOrderLine } from "@/server/actions/orders";
import { formatCurrency } from "@/lib/utils";

type Line = { id: string; position: number; materialId: string | null; material: any; description: string; quantity: any; unit: string; unitPrice: any; totalHt: any };

export function OrderLines({ orderId, lines, materials, editable }: { orderId: string; lines: Line[]; materials: any[]; editable: boolean }) {
  const [adding, setAdding] = useState(false);
  const [pending, start] = useTransition();
  function remove(id: string) {
    if (!confirm("Supprimer ?")) return;
    start(async () => {
      try { await deleteOrderLine(id); toast.success("Supprimée"); }
      catch (e: any) { toast.error(e?.message ?? "Erreur"); }
    });
  }
  return (
    <>
      <div className="card overflow-hidden">
        {lines.length === 0 ? (
          <p className="p-5 text-center text-ink-300">Aucune ligne</p>
        ) : (
          <ul className="divide-y divide-cream-300">
            {lines.map((l) => (
              <li key={l.id} className="p-3 flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="font-medium flex items-center gap-2">
                    {l.material && <Package className="w-4 h-4 text-gold" title="Lié au stock" />}
                    {l.description}
                  </div>
                  <div className="text-sm text-ink-300">{Number(l.quantity)} {l.unit} × {formatCurrency(Number(l.unitPrice))} = <strong>{formatCurrency(Number(l.totalHt))}</strong></div>
                </div>
                {editable && <button onClick={() => remove(l.id)} disabled={pending} className="p-2 text-ink-300 hover:text-danger">{pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}</button>}
              </li>
            ))}
          </ul>
        )}
      </div>
      {editable && (adding ? <NewLine orderId={orderId} materials={materials} onDone={() => setAdding(false)} /> :
        <button onClick={() => setAdding(true)} className="btn-gold w-full mt-3"><Plus className="w-5 h-5" /> Ajouter une ligne</button>)}
    </>
  );
}

function NewLine({ orderId, materials, onDone }: { orderId: string; materials: any[]; onDone: () => void }) {
  const [pending, start] = useTransition();
  const [form, setForm] = useState({ materialId: "", description: "", quantity: "1", unit: "u", unitPrice: "0" });

  function pickMaterial(id: string) {
    const m = materials.find((x) => x.id === id);
    if (m) {
      setForm({
        materialId: id,
        description: m.name,
        quantity: "1",
        unit: m.unit,
        unitPrice: m.unitCost ? String(m.unitCost) : "0"
      });
    } else {
      setForm({ ...form, materialId: "" });
    }
  }

  function save() {
    if (!form.description.trim()) { toast.error("Description requise"); return; }
    const fd = new FormData();
    fd.set("orderId", orderId);
    Object.entries(form).forEach(([k, v]) => fd.set(k, v));
    start(async () => {
      try { await addOrderLine(fd); toast.success("Ajoutée"); onDone(); }
      catch (e: any) { toast.error(e?.message ?? "Erreur"); }
    });
  }

  return (
    <div className="card p-4 mt-3 border-2 border-gold space-y-2">
      <div>
        <label className="label">Depuis le catalogue (optionnel)</label>
        <select value={form.materialId} onChange={(e) => pickMaterial(e.target.value)} className="input">
          <option value="">— Saisie libre —</option>
          {materials.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
        </select>
        <p className="text-[11px] text-ink-300 mt-1">Si lié à un matériel du catalogue, le stock sera incrémenté à la livraison.</p>
      </div>
      <input value={form.description} placeholder="Description" onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" />
      <div className="grid grid-cols-3 gap-2">
        <input type="number" step="0.001" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="input" />
        <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="input" />
        <input type="number" step="0.01" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} className="input" />
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onDone} className="btn-ghost">Annuler</button>
        <button onClick={save} disabled={pending} className="btn-gold">{pending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Ajouter"}</button>
      </div>
    </div>
  );
}
