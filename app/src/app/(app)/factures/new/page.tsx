import Link from "next/link";
import { ArrowLeft, Info } from "lucide-react";

export default function Page() {
  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <Link href="/factures" className="text-sm text-ink-300 inline-flex items-center gap-1 mb-3">
        <ArrowLeft className="w-4 h-4" /> Retour aux factures
      </Link>
      <div className="card p-8 text-center">
        <Info className="w-12 h-12 text-gold mx-auto mb-3" />
        <h1 className="text-xl font-bold mb-2">Les factures se créent depuis un chantier</h1>
        <p className="text-ink-300 mb-4">
          Une facture est toujours rattachée à un chantier et regroupe une ou plusieurs tranches de facturation d'un devis accepté.
        </p>
        <Link href="/chantiers" className="btn-gold">Voir mes chantiers</Link>
      </div>
    </div>
  );
}
