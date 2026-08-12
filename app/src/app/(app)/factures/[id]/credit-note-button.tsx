"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileMinus, Loader2 } from "lucide-react";
import { createCreditNote } from "@/server/actions/invoices";

/** Crée en un clic une note de crédit reprenant tous les paramètres de la facture. */
export function CreditNoteButton({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  function create() {
    if (!confirm("Créer une note de crédit qui annule cette facture ?")) return;
    start(async () => {
      try {
        const r = await createCreditNote(invoiceId);
        toast.success("Note de crédit créée");
        router.push(`/factures/${r.id}`);
      } catch (e: any) { toast.error(e?.message ?? "Erreur"); }
    });
  }
  return (
    <button onClick={create} disabled={pending} className="btn-secondary">
      {pending ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileMinus className="w-5 h-5" />}
      Note de crédit
    </button>
  );
}
