"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save, Trash2 } from "lucide-react";
import { createOrder, updateOrder, deleteOrder } from "@/server/actions/orders";

export function OrderHeaderForm({
  initial, suppliers, projects
}: {
  initial?: any;
  suppliers: { id: string; name: string }[];
  projects: { id: string; name: string; reference: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, setForm] = useState({
    supplierId: initial?.supplierId ?? "",
    projectId: initial?.projectId ?? "",
    expectedAt: initial?.expectedAt ? new Date(initial.expectedAt).toISOString().slice(0, 10) : "",
    notes: initial?.notes ?? ""
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.set(k, v));
    start(async () => {
      try {
        if (initial) { await updateOrder(initial.id, fd); toast.success("Mise à jour"); }
        else { const r = await createOrder(fd); toast.success("Créée"); router.push(`/commandes/${r.id}`); }
      } catch (e: any) { toast.error(e?.message ?? "Erreur"); }
    });
  }

  function remove() {
    if (!initial || !confirm("Supprimer cette commande ?")) return;
    start(async () => {
      try { await deleteOrder(initial.id); toast.success("Supprimée"); router.push("/commandes"); }
      catch (e: any) { toast.error(e?.message ?? "Erreur"); }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="label">Fournisseur</label>
        <select value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })} className="input">
          <option value="">— Aucun —</option>
          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Chantier (optionnel)</label>
        <select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })} className="input">
          <option value="">— Aucun —</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.reference} · {p.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Livraison prévue</label>
        <input type="date" value={form.expectedAt} onChange={(e) => setForm({ ...form, expectedAt: e.target.value })} className="input" />
      </div>
      <div>
        <label className="label">Notes</label>
        <textarea value={form.notes} rows={2} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input min-h-[60px]" />
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="btn-gold flex-1">{pending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}{initial ? "Enregistrer" : "Créer"}</button>
        {initial && initial.status === "DRAFT" && <button type="button" onClick={remove} className="btn bg-white text-danger border-2 border-danger"><Trash2 className="w-5 h-5" /></button>}
      </div>
    </form>
  );
}
