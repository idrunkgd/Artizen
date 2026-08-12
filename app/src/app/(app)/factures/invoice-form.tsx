"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save, Trash2 } from "lucide-react";
import { createInvoice, updateInvoice, deleteInvoice } from "@/server/actions/invoices";

export function InvoiceHeaderForm({
  initial, customers, projects, prefill
}: {
  initial?: any;
  customers: { id: string; name: string }[];
  projects: { id: string; name: string; reference: string }[];
  prefill?: { customerId?: string; projectId?: string };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, setForm] = useState({
    customerId: initial?.customerId ?? prefill?.customerId ?? customers[0]?.id ?? "",
    projectId: initial?.projectId ?? prefill?.projectId ?? "",
    quoteId: initial?.quoteId ?? "",
    title: initial?.title ?? "",
    vatRate: String(initial?.vatRate ?? 21),
    dueDate: initial?.dueDate ? new Date(initial.dueDate).toISOString().slice(0, 10) : "",
    notes: initial?.notes ?? ""
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("Titre obligatoire"); return; }
    if (!form.customerId) { toast.error("Client obligatoire"); return; }
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.set(k, v));
    start(async () => {
      try {
        if (initial) { await updateInvoice(initial.id, fd); toast.success("Mise à jour"); }
        else { const r = await createInvoice(fd); toast.success("Facture créée"); router.push(`/factures/${r.id}`); }
      } catch (err: any) { toast.error(err?.message ?? "Erreur"); }
    });
  }

  function remove() {
    if (!initial || !confirm("Supprimer cette facture ?")) return;
    start(async () => {
      try { await deleteInvoice(initial.id); toast.success("Supprimée"); router.push("/factures"); }
      catch (e: any) { toast.error(e?.message ?? "Erreur"); }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="label">Client *</label>
        <select required value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} className="input">
          <option value="">— Choisir —</option>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
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
        <label className="label">Titre *</label>
        <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">TVA (%)</label>
          <select value={form.vatRate} onChange={(e) => setForm({ ...form, vatRate: e.target.value })} className="input">
            <option value="0">0 %</option>
            <option value="6">6 %</option>
            <option value="21">21 %</option>
          </select>
        </div>
        <div>
          <label className="label">Échéance</label>
          <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="input" />
        </div>
      </div>
      <div>
        <label className="label">Notes</label>
        <textarea value={form.notes} rows={2} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input min-h-[60px]" />
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="btn-gold flex-1">
          {pending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} {initial ? "Enregistrer" : "Créer"}
        </button>
        {initial && initial.status === "DRAFT" && (
          <button type="button" onClick={remove} className="btn bg-white text-danger border-2 border-danger"><Trash2 className="w-5 h-5" /></button>
        )}
      </div>
    </form>
  );
}
