"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { addQuoteMilestone, deleteQuoteMilestone } from "@/server/actions/quotes";
import { formatCurrency, formatDate } from "@/lib/utils";

type Milestone = { id: string; position: number; label: string; percentage: any; amountHt: any; expectedAt: any };

export function MilestonesEditor({ quoteId, milestones, totalHt }: { quoteId: string; milestones: Milestone[]; totalHt: number }) {
  const [adding, setAdding] = useState(false);
  const sumPct = milestones.reduce((s, m) => s + Number(m.percentage ?? 0), 0);
  const remaining = Math.max(0, 100 - sumPct);
  const isComplete = Math.abs(sumPct - 100) < 0.01;
  const isOver = sumPct > 100.01;

  return (
    <>
      {/* Jauge total % */}
      <div className={"card p-4 mb-3 " +
        (isComplete ? "bg-emerald-50 border-2 border-success" :
         isOver ? "bg-red-50 border-2 border-danger" :
         milestones.length > 0 ? "bg-gold/10 border-2 border-gold" : "")}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {isComplete && <CheckCircle2 className="w-5 h-5 text-success" />}
            {isOver && <AlertTriangle className="w-5 h-5 text-danger" />}
            <span className="font-semibold text-sm">
              Tranches : {sumPct.toFixed(2)} % couvert{remaining > 0.01 ? ` (${remaining.toFixed(2)} % restant)` : ""}
            </span>
          </div>
          <span className="text-sm font-bold">{formatCurrency(Number(totalHt) * (sumPct / 100))} / {formatCurrency(totalHt)}</span>
        </div>
        {/* Barre de progression */}
        <div className="h-3 bg-cream-300 rounded-full overflow-hidden">
          <div
            className={"h-full transition-all " + (isComplete ? "bg-success" : isOver ? "bg-danger" : "bg-gold")}
            style={{ width: `${Math.min(100, sumPct)}%` }}
          />
        </div>
        {!isComplete && milestones.length > 0 && !isOver && (
          <p className="text-xs text-ink-300 mt-2">
            ⚠️ Continue d'ajouter des tranches pour arriver à 100 % avant d'envoyer le devis.
          </p>
        )}
        {isOver && (
          <p className="text-xs text-danger mt-2 font-medium">
            ❌ Les tranches dépassent 100 % du devis. Supprime ou ajuste.
          </p>
        )}
      </div>

      <div className="card overflow-hidden">
        {milestones.length === 0 ? (
          <div className="p-5 text-center text-ink-300 text-sm">
            Pas de tranche. Ajoute par exemple « Acompte 30% à la signature », « 50% à mi-chantier », « Solde 20% à la fin ».
          </div>
        ) : (
          <ul className="divide-y divide-cream-300">
            {milestones.map((m) => <MilestoneRow key={m.id} m={m} />)}
          </ul>
        )}
      </div>

      {adding ? (
        <NewMilestoneForm quoteId={quoteId} totalHt={totalHt} remainingPct={remaining} onDone={() => setAdding(false)} />
      ) : (
        remaining > 0.01 && (
          <button onClick={() => setAdding(true)} className="btn-gold w-full mt-3">
            <Plus className="w-5 h-5" /> Ajouter une tranche ({remaining.toFixed(2)} % restants)
          </button>
        )
      )}
    </>
  );
}

function MilestoneRow({ m }: { m: Milestone }) {
  const [pending, start] = useTransition();
  function remove() {
    if (!confirm("Supprimer cette tranche ?")) return;
    start(async () => {
      try { await deleteQuoteMilestone(m.id); toast.success("Supprimée"); }
      catch (e: any) { toast.error(e?.message ?? "Erreur"); }
    });
  }
  return (
    <li className="p-3 flex items-start justify-between gap-3">
      <div className="flex-1">
        <div className="font-medium">{m.label}</div>
        <div className="text-sm text-ink-300">
          <span className="text-gold-700 font-bold">{Number(m.percentage)} %</span>
          <span className="mx-1">·</span>
          {formatCurrency(Number(m.amountHt))} HTVA
          {m.expectedAt && ` · échéance ${formatDate(m.expectedAt)}`}
        </div>
      </div>
      <button onClick={remove} disabled={pending} className="p-2 text-ink-300 hover:text-danger">
        {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
      </button>
    </li>
  );
}

function NewMilestoneForm({ quoteId, totalHt, remainingPct, onDone }: { quoteId: string; totalHt: number; remainingPct: number; onDone: () => void }) {
  const [pending, start] = useTransition();
  const [form, setForm] = useState({
    label: "",
    percentage: remainingPct.toFixed(2),  // pré-remplit avec le reste pour qu'un clic suffise à boucler à 100 %
    expectedAt: ""
  });
  function save() {
    if (!form.label.trim()) { toast.error("Label requis"); return; }
    const pct = Number(form.percentage);
    if (!pct || pct <= 0) { toast.error("Pourcentage > 0 requis"); return; }
    if (pct > remainingPct + 0.01) {
      toast.error(`Maximum ${remainingPct.toFixed(2)} % disponible`); return;
    }
    const fd = new FormData();
    fd.set("quoteId", quoteId);
    Object.entries(form).forEach(([k, v]) => fd.set(k, v));
    start(async () => {
      try { await addQuoteMilestone(fd); toast.success("Tranche ajoutée"); onDone(); }
      catch (e: any) { toast.error(e?.message ?? "Erreur"); }
    });
  }
  const previewAmount = totalHt > 0 ? (Number(form.percentage || 0) * totalHt) / 100 : 0;
  return (
    <div className="card p-4 mt-3 border-2 border-gold space-y-2">
      <div>
        <label className="label">Nom de la tranche *</label>
        <input value={form.label} placeholder="Ex. Acompte signature"
               onChange={(e) => setForm({ ...form, label: e.target.value })} className="input" />
      </div>
      <div>
        <label className="label">Pourcentage du devis * ({remainingPct.toFixed(2)} % restants)</label>
        <div className="relative">
          <input type="number" step="0.01" min="0.01" max={remainingPct}
                 value={form.percentage}
                 onChange={(e) => setForm({ ...form, percentage: e.target.value })}
                 className="input pr-10" />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-300 font-bold">%</span>
        </div>
        {totalHt > 0 && (
          <p className="text-sm text-ink-300 mt-1">→ {formatCurrency(previewAmount)} HTVA</p>
        )}
      </div>
      <div>
        <label className="label">Échéance (optionnel)</label>
        <input type="date" value={form.expectedAt}
               onChange={(e) => setForm({ ...form, expectedAt: e.target.value })} className="input" />
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <button onClick={onDone} className="btn-ghost">Annuler</button>
        <button onClick={save} disabled={pending} className="btn-gold">
          {pending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Ajouter"}
        </button>
      </div>
    </div>
  );
}
