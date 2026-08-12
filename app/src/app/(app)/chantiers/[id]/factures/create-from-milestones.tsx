"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Loader2, X, Check } from "lucide-react";
import { createInvoiceFromMilestones } from "@/server/actions/invoices";
import { formatCurrency } from "@/lib/utils";

type Milestone = { id: string; label: string; percentage: number | null; amountHt: number };
type QuoteGroup = {
  quoteId: string;
  quoteTitle: string;
  quoteReference: string;
  vatRate: number;
  milestones: Milestone[];
};

export function CreateInvoiceFromMilestonesButton({
  projectId, availableByQuote
}: { projectId: string; availableByQuote: QuoteGroup[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Pour éviter le mélange de taux TVA différents, on calcule le taux des
  // tranches sélectionnées et on disable celles d'un autre taux.
  const selectedVatRates = new Set<number>();
  for (const g of availableByQuote) {
    for (const m of g.milestones) {
      if (selected.has(m.id)) selectedVatRates.add(g.vatRate);
    }
  }
  const lockedVatRate = selectedVatRates.size === 1 ? Array.from(selectedVatRates)[0] : null;

  function toggle(id: string) {
    const s = new Set(selected);
    if (s.has(id)) s.delete(id);
    else s.add(id);
    setSelected(s);
  }

  const totalSelected = availableByQuote
    .flatMap((g) => g.milestones)
    .filter((m) => selected.has(m.id))
    .reduce((s, m) => s + m.amountHt, 0);

  function submit() {
    if (selected.size === 0) { toast.error("Sélectionne au moins une tranche"); return; }
    start(async () => {
      try {
        const r = await createInvoiceFromMilestones(projectId, Array.from(selected));
        toast.success("Facture créée");
        setOpen(false);
        router.push(`/factures/${r.id}`);
      } catch (e: any) {
        toast.error(e?.message ?? "Erreur");
      }
    });
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-gold w-full">
        <Plus className="w-5 h-5" /> Créer une facture
      </button>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 grid place-items-center p-4 overflow-y-auto" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-lift p-6 w-full max-w-lg my-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-lg">Sélectionne les tranches à facturer</h2>
              <button onClick={() => setOpen(false)} className="p-1 text-ink-300 hover:text-ink"><X className="w-5 h-5" /></button>
            </div>

            <div className="max-h-[50vh] overflow-y-auto space-y-3 pr-1">
              {availableByQuote.map((g) => (
                <div key={g.quoteId} className="border border-cream-300 rounded-xl p-3">
                  <div className="text-sm font-semibold mb-2">
                    {g.quoteTitle}
                    <span className="text-xs text-ink-300 font-normal ml-2">
                      {g.quoteReference} · TVA {g.vatRate} %
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {g.milestones.map((m) => {
                      const isSelected = selected.has(m.id);
                      const disabled = lockedVatRate !== null && lockedVatRate !== g.vatRate;
                      return (
                        <li key={m.id}>
                          <label className={"flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-colors " +
                            (disabled
                              ? "opacity-40 cursor-not-allowed"
                              : isSelected
                                ? "bg-gold/20 border border-gold"
                                : "hover:bg-cream-100 border border-transparent")}>
                            <input type="checkbox" checked={isSelected} disabled={disabled}
                                   onChange={() => toggle(m.id)}
                                   className="w-5 h-5 mt-0.5" />
                            <div className="flex-1 text-sm">
                              <div className="font-medium">{m.label}</div>
                              <div className="text-xs text-ink-300">
                                {m.percentage != null && <span className="font-semibold text-gold-700">{m.percentage} % · </span>}
                                {formatCurrency(m.amountHt)} HTVA
                              </div>
                            </div>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>

            {lockedVatRate !== null && availableByQuote.some((g) => g.vatRate !== lockedVatRate) && (
              <p className="text-xs text-amber-700 mt-2">
                ⚠️ Les tranches d'un autre taux TVA sont désactivées (une facture = un seul taux).
              </p>
            )}

            <div className="mt-4 pt-4 border-t border-cream-300">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-ink-300">{selected.size} tranche(s) sélectionnée(s)</span>
                <span className="text-lg font-bold">{formatCurrency(totalSelected)} HTVA</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setOpen(false)} disabled={pending} className="btn-ghost flex-1">Annuler</button>
                <button onClick={submit} disabled={pending || selected.size === 0} className="btn-gold flex-1">
                  {pending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                  Créer la facture
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
