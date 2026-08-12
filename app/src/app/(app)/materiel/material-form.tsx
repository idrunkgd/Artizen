"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save, Trash2 } from "lucide-react";
import { upsertMaterial, deleteMaterial } from "@/server/actions/materials";

export function MaterialForm({ initial, suppliers }: { initial?: any; suppliers: { id: string; name: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    unit: initial?.unit ?? "u",
    stockQty: String(initial?.stockQty ?? 0),
    unitCost: initial?.unitCost ? String(initial.unitCost) : "",
    defaultSupplierId: initial?.defaultSupplierId ?? ""
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Nom requis"); return; }
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.set(k, v));
    start(async () => {
      try {
        await upsertMaterial(fd, initial?.id);
        toast.success(initial ? "Mis à jour" : "Créé");
        if (!initial) router.push("/materiel");
      } catch (e: any) { toast.error(e?.message ?? "Erreur"); }
    });
  }

  function remove() {
    if (!initial || !confirm("Supprimer ce matériel ?")) return;
    start(async () => {
      try { await deleteMaterial(initial.id); toast.success("Supprimé"); router.push("/materiel"); }
      catch (e: any) { toast.error(e?.message ?? "Erreur"); }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div><label className="label">Nom *</label><input required value={form.name} placeholder="Ex. Ciment 25 kg" onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" /></div>
      <div><label className="label">Description</label><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Unité</label><input value={form.unit} placeholder="sac, m², palette..." onChange={(e) => setForm({ ...form, unit: e.target.value })} className="input" /></div>
        <div><label className="label">Stock actuel</label><input type="number" step="0.01" value={form.stockQty} onChange={(e) => setForm({ ...form, stockQty: e.target.value })} className="input" /></div>
      </div>
      <div><label className="label">Prix unitaire HT (€)</label><input type="number" step="0.01" value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: e.target.value })} className="input" /></div>
      <div>
        <label className="label">Fournisseur préféré</label>
        <select value={form.defaultSupplierId} onChange={(e) => setForm({ ...form, defaultSupplierId: e.target.value })} className="input">
          <option value="">— Aucun —</option>
          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="btn-gold flex-1">{pending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}{initial ? "Enregistrer" : "Créer"}</button>
        {initial && <button type="button" onClick={remove} className="btn bg-white text-danger border-2 border-danger"><Trash2 className="w-5 h-5" /></button>}
      </div>
    </form>
  );
}
