"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { Send, Check } from "lucide-react";
import { setInvoiceStatus } from "@/server/actions/invoices";

export function InvoiceStatusActions({ invoiceId, currentStatus }: { invoiceId: string; currentStatus: string }) {
  const [pending, start] = useTransition();
  function change(s: any, msg: string) {
    start(async () => {
      try { await setInvoiceStatus(invoiceId, s); toast.success(msg); }
      catch (e: any) { toast.error(e?.message ?? "Erreur"); }
    });
  }
  if (currentStatus === "DRAFT") return <button onClick={() => change("SENT", "Marquée envoyée")} disabled={pending} className="btn-gold"><Send className="w-5 h-5" /> Marquer envoyée</button>;
  if (currentStatus === "SENT" || currentStatus === "OVERDUE") return <button onClick={() => change("PAID", "Encaissée 🎉")} disabled={pending} className="btn bg-success text-white"><Check className="w-5 h-5" /> Marquer payée</button>;
  if (currentStatus === "PAID") return <button onClick={() => change("SENT", "Repassée en envoyée")} disabled={pending} className="btn-ghost btn-sm">↶ Annuler le paiement</button>;
  return null;
}
