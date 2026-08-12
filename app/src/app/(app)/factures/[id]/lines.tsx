import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

type Line = { id: string; position: number; description: string; quantity: any; unit: string; unitPrice: any; totalHt: any };
type CoveredMilestone = {
  id: string;
  label: string;
  percentage: any;
  amountHt: any;
  quote: { id: string; title: string; reference: string };
};

/**
 * Affichage des lignes de facture en lecture seule.
 * Chaque ligne = une tranche du devis. Pour modifier, il faut :
 *   - supprimer la facture (les tranches sont déverrouillées)
 *   - retourner sur le chantier
 *   - recréer une facture avec une autre sélection
 */
export function InvoiceLines({
  lines, coveredMilestones
}: { lines: Line[]; coveredMilestones: CoveredMilestone[] }) {
  if (lines.length === 0) {
    return <p className="card p-5 text-center text-ink-300">Aucune ligne</p>;
  }
  // On indexe les milestones par ordre de position de ligne pour les associer
  return (
    <div className="card overflow-hidden">
      <ul className="divide-y divide-cream-300">
        {lines.map((l, i) => {
          // Le tranche source correspondante : on cherche par texte (faillible mais simple)
          // ou on prend par ordre. On prend par ordre pour MVP.
          const m = coveredMilestones[i];
          return (
            <li key={l.id} className="p-3">
              <div className="font-medium">{l.description}</div>
              <div className="text-sm text-ink-300 flex items-center justify-between mt-1">
                <span>{Number(l.quantity)} {l.unit} × {formatCurrency(Number(l.unitPrice))}</span>
                <strong className="text-ink">{formatCurrency(Number(l.totalHt))} HTVA</strong>
              </div>
              {m && (
                <Link href={`/devis/${m.quote.id}`}
                      className="text-xs text-gold-700 hover:underline mt-1 inline-block">
                  ← Tranche du devis {m.quote.reference}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
