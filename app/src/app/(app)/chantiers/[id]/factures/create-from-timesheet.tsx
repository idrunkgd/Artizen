"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ReceiptText, Clock } from "lucide-react";
import { createInvoiceFromTimesheet } from "@/server/actions/invoices";
import { formatCurrency } from "@/lib/utils";

/**
 * Bouton de facturation RÉGIE côté chantier : facture les heures prestées
 * non encore facturées, au taux horaire défini sur le devis régie.
 */
export function CreateInvoiceFromTimesheetButton({
  quoteId, quoteTitle, hourlyRate, unbilledHours, entryCount, vatRate
}: {
  quoteId: string;
  quoteTitle: string;
  hourlyRate: number;
  unbilledHours: number;
  entryCount: number;
  vatRate: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const amount = Math.round(unbilledHours * hourlyRate * 100) / 100;

  function submit() {
    if (unbilledHours <= 0) { toast.error("Aucune heure à facturer"); return; }
    start(async () => {
      try {
        const r = await createInvoiceFromTimesheet(quoteId);
        toast.success("Facture créée");
        router.push(`/factures/${r.id}`);
      } catch (e: any) { toast.error(e?.message ?? "Erreur"); }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm">
        <Clock className="w-4 h-4 text-gold" />
        <span>
          <strong>{unbilledHours} h</strong> non facturées
          {" "}({entryCount} saisie{entryCount > 1 ? "s" : ""}) × {formatCurrency(hourlyRate)}/h
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-ink-300">{quoteTitle} · TVA {vatRate} %</span>
        <span className="text-lg font-bold">{formatCurrency(amount)} HTVA</span>
      </div>
      <button onClick={submit} disabled={pending || unbilledHours <= 0} className="btn-gold w-full">
        {pending ? <Loader2 className="w-5 h-5 animate-spin" /> : <ReceiptText className="w-5 h-5" />}
        Facturer les heures prestées
      </button>
    </div>
  );
}
