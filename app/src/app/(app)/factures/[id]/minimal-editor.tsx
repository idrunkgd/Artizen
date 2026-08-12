"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { updateInvoiceDueDateAndNotes } from "@/server/actions/invoices";

export function MinimalInvoiceEditor({
  invoiceId, initial, editable
}: {
  invoiceId: string;
  initial: { dueDate: string; notes: string };
  editable: boolean;
}) {
  const [pending, start] = useTransition();
  const [form, setForm] = useState(initial);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("dueDate", form.dueDate);
    fd.set("notes", form.notes);
    start(async () => {
      try { await updateInvoiceDueDateAndNotes(invoiceId, fd); toast.success("Enregistré"); }
      catch (e: any) { toast.error(e?.message ?? "Erreur"); }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="label">Date d'échéance</label>
        <input type="date" value={form.dueDate} disabled={!editable}
               onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
               className="input" />
        <p className="text-xs text-ink-300 mt-1">
          Apparaît sur le PDF : « À régler avant le ... ».
        </p>
      </div>
      <div>
        <label className="label">Notes (optionnel)</label>
        <textarea value={form.notes} rows={3} disabled={!editable}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="input min-h-[80px]"
                  placeholder="Remerciements, modalités, ..." />
      </div>
      {editable ? (
        <button type="submit" disabled={pending} className="btn-gold w-full">
          {pending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Enregistrer
        </button>
      ) : (
        <p className="text-sm text-ink-300 text-center">
          Cette facture n'est plus en brouillon, les infos sont figées.
        </p>
      )}
    </form>
  );
}
