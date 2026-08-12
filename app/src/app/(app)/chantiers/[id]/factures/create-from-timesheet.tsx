"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ReceiptText } from "lucide-react";
import { createInvoiceFromTimesheet } from "@/server/actions/invoices";
import { formatCurrency } from "@/lib/utils";

/**
 * Facturation RÉGIE côté chantier, sur une PÉRIODE choisie : les champs Du/Au
 * sont pré-remplis sur toute la plage des heures non facturées, et le montant
 * se recalcule en direct. On ne facture que les heures de la période.
 */
export function CreateInvoiceFromTimesheetButton({
  quoteId, quoteTitle, hourlyRate, vatRate, entries
}: {
  quoteId: string;
  quoteTitle: string;
  hourlyRate: number;
  vatRate: number;
  entries: { date: string; hours: number }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const dates = entries.map((e) => e.date).sort();
  const [from, setFrom] = useState(dates[0] ?? "");
  const [to, setTo] = useState(dates[dates.length - 1] ?? "");

  const inRange = entries.filter((e) => (!from || e.date >= from) && (!to || e.date <= to));
  const hours = inRange.reduce((s, e) => s + e.hours, 0);
  const amount = Math.round(hours * hourlyRate * 100) / 100;

  function submit() {
    if (hours <= 0) { toast.error("Aucune heure sur cette période"); return; }
    start(async () => {
      try {
        const r = await createInvoiceFromTimesheet(quoteId, from || undefined, to || undefined);
        toast.success("Facture créée");
        router.push(`/factures/${r.id}`);
      } catch (e: any) { toast.error(e?.message ?? "Erreur"); }
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Du</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input" />
        </div>
        <div>
          <label className="label">Au</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input" />
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-ink-300">
          {quoteTitle} · <strong className="text-ink">{hours} h</strong> × {formatCurrency(hourlyRate)}/h · TVA {vatRate} %
        </span>
        <span className="text-lg font-bold">{formatCurrency(amount)} HTVA</span>
      </div>

      <button onClick={submit} disabled={pending || hours <= 0} className="btn-gold w-full">
        {pending ? <Loader2 className="w-5 h-5 animate-spin" /> : <ReceiptText className="w-5 h-5" />}
        Facturer la période
      </button>
    </div>
  );
}
