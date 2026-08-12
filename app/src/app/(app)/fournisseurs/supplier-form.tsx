"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save, Trash2 } from "lucide-react";
import { createSupplier, updateSupplier, deleteSupplier } from "@/server/actions/suppliers";

export function SupplierForm({ initial }: { initial?: any }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    vatNumber: initial?.vatNumber ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    notes: initial?.notes ?? ""
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Nom obligatoire"); return; }
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.set(k, v));
    start(async () => {
      try {
        if (initial) { await updateSupplier(initial.id, fd); toast.success("Mis à jour"); }
        else { const r = await createSupplier(fd); toast.success("Créé"); router.push(`/fournisseurs/${r.id}`); }
      } catch (e: any) { toast.error(e?.message ?? "Erreur"); }
    });
  }

  function remove() {
    if (!initial || !confirm("Supprimer ce fournisseur ?")) return;
    start(async () => {
      try { await deleteSupplier(initial.id); toast.success("Supprimé"); router.push("/fournisseurs"); }
      catch (e: any) { toast.error(e?.message ?? "Erreur"); }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div><label className="label">Nom *</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" /></div>
      <div><label className="label">N° TVA</label><input value={form.vatNumber} onChange={(e) => setForm({ ...form, vatNumber: e.target.value })} className="input" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Téléphone</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" /></div>
        <div><label className="label">Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" /></div>
      </div>
      <div><label className="label">Notes</label><textarea value={form.notes} rows={2} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input min-h-[60px]" /></div>
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="btn-gold flex-1">{pending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}{initial ? "Enregistrer" : "Créer"}</button>
        {initial && <button type="button" onClick={remove} className="btn bg-white text-danger border-2 border-danger"><Trash2 className="w-5 h-5" /></button>}
      </div>
    </form>
  );
}
