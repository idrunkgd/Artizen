"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { addTimesheetEntry, deleteTimesheetEntry } from "@/server/actions/timesheet";

type ProjectRef = { name: string; reference: string; customer?: { name: string } | null } | null;
type Entry = { id: string; date: Date; hours: any; description: string | null; project: ProjectRef };
type Project = { id: string; name: string; reference: string; customer?: { name: string } | null };

// Affiche « CLIENT — CHANTIER » (ou juste le chantier si pas de client).
function projLabel(p: ProjectRef | Project): string {
  if (!p) return "";
  return p.customer?.name ? `${p.customer.name} — ${p.name}` : p.name;
}

export function TimesheetClient({ projects, entries }: { projects: Project[]; entries: Entry[] }) {
  const [pending, start] = useTransition();
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ projectId: "", date: today, hours: "8", description: "" });

  function add() {
    if (!form.hours || Number(form.hours) <= 0) { toast.error("Indique le nombre d'heures"); return; }
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.set(k, v));
    start(async () => {
      try {
        await addTimesheetEntry(fd);
        toast.success("Heures enregistrées");
        setForm({ ...form, hours: "8", description: "" });
      } catch (e: any) { toast.error(e?.message ?? "Erreur"); }
    });
  }

  function remove(id: string) {
    if (!confirm("Supprimer cette saisie ?")) return;
    start(async () => {
      try { await deleteTimesheetEntry(id); toast.success("Supprimée"); }
      catch (e: any) { toast.error(e?.message ?? "Erreur"); }
    });
  }

  // Groupement par date pour total jour
  const byDate = new Map<string, Entry[]>();
  for (const e of entries) {
    const k = new Date(e.date).toISOString().slice(0, 10);
    const arr = byDate.get(k) ?? [];
    arr.push(e);
    byDate.set(k, arr);
  }
  const totalWeek = entries
    .filter((e) => {
      const d = new Date(e.date);
      const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
      return d >= weekAgo;
    })
    .reduce((s, e) => s + Number(e.hours), 0);

  return (
    <>
      {/* Formulaire saisie rapide */}
      <div className="card p-4 mb-4 border-2 border-gold">
        <h2 className="font-bold mb-3">Saisir mes heures</h2>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Date</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="input" />
            </div>
            <div>
              <label className="label">Heures</label>
              <input type="number" step="0.25" min="0.25" max="24" value={form.hours}
                     onChange={(e) => setForm({ ...form, hours: e.target.value })} className="input" />
            </div>
          </div>
          <div>
            <label className="label">Chantier</label>
            <select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })} className="input">
              <option value="">— Pas de chantier —</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{projLabel(p)}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Description (optionnel)</label>
            <input value={form.description} placeholder="Ex. pose carrelage cuisine"
                   onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" />
          </div>
          <button onClick={add} disabled={pending} className="btn-gold w-full btn-lg">
            {pending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />} Enregistrer
          </button>
        </div>
      </div>

      <div className="card p-3 mb-3 text-center">
        <span className="text-sm text-ink-300">Total 7 derniers jours :</span>{" "}
        <span className="text-2xl font-black text-gold">{totalWeek.toFixed(2)} h</span>
      </div>

      {/* Historique groupé par date */}
      {byDate.size === 0 ? (
        <p className="text-center text-ink-300 py-6">Pas encore de saisie. Mets ta première au-dessus 👆</p>
      ) : (
        <div className="space-y-3">
          {Array.from(byDate.entries()).map(([date, dayEntries]) => {
            const dayTotal = dayEntries.reduce((s, e) => s + Number(e.hours), 0);
            return (
              <div key={date} className="card overflow-hidden">
                <div className="bg-ink text-cream px-4 py-2 flex justify-between text-sm font-semibold">
                  <span>{new Intl.DateTimeFormat("fr-BE", { weekday: "long", day: "numeric", month: "long" }).format(new Date(date))}</span>
                  <span className="text-gold">{dayTotal.toFixed(2)} h</span>
                </div>
                <ul>
                  {dayEntries.map((e) => (
                    <li key={e.id} className="p-3 flex items-start justify-between gap-3 border-t border-cream-300 first:border-t-0">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">
                          <span className="text-gold-700 font-bold">{Number(e.hours).toFixed(2)} h</span>
                          {e.project && ` · ${projLabel(e.project)}`}
                        </div>
                        {e.description && <div className="text-xs text-ink-300 mt-0.5">{e.description}</div>}
                      </div>
                      <button onClick={() => remove(e.id)} disabled={pending} className="p-1.5 text-ink-300 hover:text-danger">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
