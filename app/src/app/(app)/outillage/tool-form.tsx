"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save, Trash2 } from "lucide-react";
import { upsertTool, deleteTool } from "@/server/actions/tools";

export function ToolForm({ initial }: { initial?: any }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    serialNumber: initial?.serialNumber ?? "",
    brand: initial?.brand ?? "",
    purchaseDate: initial?.purchaseDate ? new Date(initial.purchaseDate).toISOString().slice(0, 10) : "",
    purchasePrice: initial?.purchasePrice ? String(initial.purchasePrice) : "",
    location: initial?.location ?? "Atelier",
    notes: initial?.notes ?? ""
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Nom requis"); return; }
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.set(k, v));
    start(async () => {
      try {
        await upsertTool(fd, initial?.id);
        toast.success(initial ? "Mis à jour" : "Créé");
        if (!initial) router.push("/outillage");
      } catch (e: any) { toast.error(e?.message ?? "Erreur"); }
    });
  }

  function remove() {
    if (!initial || !confirm("Supprimer cet outil ?")) return;
    start(async () => {
      try { await deleteTool(initial.id); toast.success("Supprimé"); router.push("/outillage"); }
      catch (e: any) { toast.error(e?.message ?? "Erreur"); }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div><label className="label">Nom *</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Marque</label><input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="input" /></div>
        <div><label className="label">N° de série</label><input value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} className="input" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Date d'achat</label><input type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} className="input" /></div>
        <div><label className="label">Prix d'achat (€)</label><input type="number" step="0.01" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })} className="input" /></div>
      </div>
      <div><label className="label">Où se trouve-t-il ?</label><input value={form.location} placeholder="Atelier, Camion, chantier X..." onChange={(e) => setForm({ ...form, location: e.target.value })} className="input" /></div>
      <div><label className="label">Notes</label><textarea value={form.notes} rows={2} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input min-h-[60px]" /></div>
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="btn-gold flex-1">{pending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}{initial ? "Enregistrer" : "Créer"}</button>
        {initial && <button type="button" onClick={remove} className="btn bg-white text-danger border-2 border-danger"><Trash2 className="w-5 h-5" /></button>}
      </div>
    </form>
  );
}
