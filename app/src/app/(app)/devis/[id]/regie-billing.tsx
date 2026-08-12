"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ReceiptText, Clock } from "lucide-react";
import { createInvoiceFromTimesheet } from "@/server/actions/invoices";
import { formatCurrency } from "@/lib/utils";

/**
 * Bloc de facturation d'un devis en RÉGIE : agrège les heures prestées non
 * encore facturées (Timesheet du chantier) et génère une facture au taux
 * horaire choisi (pré-rempli depuis le devis).
 */
export function RegieBilling({
  quoteId, hasProject, unbilledHours, entryCount, defaultRate
}: {
  quoteId: string;
  hasProject: boolean;
  unbilledHours: number;
  entryCount: number;
  defaultRate: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [rate, setRate] = useState(String(defaultRate || 0));

  if (!hasProject) {
    return (
      <div className="card p-5 text-sm text-ink-300">
        Accepte d'abord le devis : le chantier sera créé, les heures s'y saisiront
        via le Timesheet, puis tu pourras les facturer ici.
      </div>
    );
  }

  const rateNum = Number(rate) || 0;
  const estimated = Math.round(unbilledHours * rateNum * 100) / 100;

  function generate() {
    if (unbilledHours <= 0) { toast.error("Aucune heure à facturer"); return; }
    if (!(rateNum > 0) && !confirm("Taux horaire à 0 € : générer la facture quand même ?")) return;
    start(async () => {
      try {
        const r = await createInvoiceFromTimesheet(quoteId, rateNum);
        toast.success("Facture régie créée");
        router.push(`/factures/${r.id}`);
      } catch (e: any) { toast.error(e?.message ?? "Erreur"); }
    });
  }

  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-center gap-2 text-sm">
        <Clock className="w-4 h-4 text-gold" />
        <span>
          <strong>{unbilledHours} h</strong> prestées non facturées
          {" "}({entryCount} saisie{entryCount > 1 ? "s" : ""})
        </span>
      </div>

      {unbilledHours <= 0 ? (
        <p className="text-sm text-ink-300">
          Toutes les heures saisies sur ce chantier sont déjà facturées.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <label className="label">Taux horaire (€ HT / h)</label>
              <input type="number" step="0.01" value={rate}
                     onChange={(e) => setRate(e.target.value)} className="input" />
            </div>
            <div className="text-right">
              <div className="text-xs text-ink-300 uppercase tracking-wider">Montant HTVA</div>
              <div className="text-xl font-bold">{formatCurrency(estimated)}</div>
            </div>
          </div>
          <button onClick={generate} disabled={pending} className="btn-gold w-full">
            {pending ? <Loader2 className="w-5 h-5 animate-spin" /> : <ReceiptText className="w-5 h-5" />}
            Générer la facture des heures prestées
          </button>
          <p className="text-xs text-ink-300">
            Taux pré-rempli depuis la 1ʳᵉ ligne « à l'heure » du devis. Les postes au
            forfait ou à la journée (engins, déplacements…) restent à ajouter sur la facture.
          </p>
        </>
      )}
    </div>
  );
}
