"use client";
import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";
import { ArrowRight, Loader2 } from "lucide-react";
import { setInvoiceStatus } from "@/server/actions/invoices";

type Invoice = {
  id: string;
  title: string;
  reference: string;
  customerName: string;
  issueDate: string;
  dueDate: string | null;
  totalTvac: string;
  status: string;
  statusLabel: string;
  statusCls: string;
};

/**
 * Cycle de statut piloté depuis la liste /factures :
 *   Brouillon → Envoyée → Payée → Brouillon → ...
 *
 * Au lieu d'un badge dans le coin, c'est tout le fond de la ligne qui
 * change : repérage visuel immédiat (vert = payé, ambré = envoyé,
 * neutre = brouillon, rouge = en retard).
 */
const CYCLE: Record<
  string,
  {
    next: "DRAFT" | "SENT" | "PAID";
    nextLabel: string;
    btnCls: string;
    rowCls: string;       // fond + bordure de la ligne entière
    metaCls: string;      // couleur du texte secondaire (réf, client, dates)
  }
> = {
  DRAFT: {
    next: "SENT", nextLabel: "Envoyée",
    btnCls: "btn-secondary",
    rowCls: "bg-cream-100 border-cream-300",
    metaCls: "text-ink-400"
  },
  SENT: {
    next: "PAID", nextLabel: "Payée",
    btnCls: "btn-gold",
    rowCls: "bg-amber-50 border-amber-200",
    metaCls: "text-amber-800/70"
  },
  PAID: {
    next: "DRAFT", nextLabel: "Brouillon",
    btnCls: "btn-ghost",
    rowCls: "bg-emerald-50 border-emerald-200",
    metaCls: "text-emerald-800/70"
  },
  OVERDUE: {
    next: "PAID", nextLabel: "Payée",
    btnCls: "btn-gold",
    rowCls: "bg-red-50 border-red-200",
    metaCls: "text-red-800/70"
  },
  CANCELLED: {
    next: "DRAFT", nextLabel: "Brouillon",
    btnCls: "btn-ghost",
    rowCls: "bg-ink-100 border-ink-200 opacity-60",
    metaCls: "text-ink-400"
  }
};

export function InvoiceRow({ invoice: i }: { invoice: Invoice }) {
  const [pending, start] = useTransition();
  const cycle = CYCLE[i.status] ?? CYCLE.DRAFT;

  function advance(e: React.MouseEvent) {
    // Le bloc info est un <Link> ; on bloque la navigation au clic sur le bouton.
    e.preventDefault();
    e.stopPropagation();
    start(async () => {
      try {
        await setInvoiceStatus(i.id, cycle.next);
        toast.success(`${i.reference} → ${cycle.nextLabel}`);
      } catch (e: any) {
        toast.error(e?.message ?? "Erreur");
      }
    });
  }

  return (
    <li
      className={`rounded-xl border p-4 transition hover:shadow-lift ${cycle.rowCls}`}
    >
      <div className="flex items-start gap-3">
        <Link href={`/factures/${i.id}`} className="flex-1 min-w-0">
          <div className="font-semibold truncate text-ink">{i.title}</div>
          <div className={`text-sm ${cycle.metaCls}`}>
            {i.reference} · {i.customerName} · émise {i.issueDate}
            {i.dueDate && ` · échéance ${i.dueDate}`}
          </div>
          <div className="text-base font-bold text-ink mt-1">{i.totalTvac} TVAC</div>
        </Link>

        {/* Bouton cyclique : clique pour avancer Brouillon → Envoyée → Payée → Brouillon */}
        <button
          onClick={advance}
          disabled={pending}
          className={`${cycle.btnCls} btn-sm shrink-0 self-center whitespace-nowrap`}
          title={`Passer à : ${cycle.nextLabel}`}
        >
          {pending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ArrowRight className="w-4 h-4" />
          )}
          {cycle.nextLabel}
        </button>
      </div>
    </li>
  );
}
