"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, PencilLine, ListChecks } from "lucide-react";
import { addTimesheetEntry, addTimesheetRange, deleteTimesheetEntry } from "@/server/actions/timesheet";

type ProjectRef = { id?: string; name: string; reference: string; customer?: { name: string } | null } | null;
type Entry = { id: string; date: Date; hours: any; description: string | null; project: ProjectRef };
type Project = { id: string; name: string; reference: string; customer?: { name: string } | null };

// Affiche « CLIENT — CHANTIER » (ou juste le chantier si pas de client).
function projLabel(p: ProjectRef | Project): string {
  if (!p) return "";
  return p.customer?.name ? `${p.customer.name} — ${p.name}` : p.name;
}

const fmtShort = (d: Date) =>
  new Intl.DateTimeFormat("fr-BE", { day: "2-digit", month: "2-digit", year: "2-digit" }).format(new Date(d));

export function TimesheetClient({ projects, entries }: { projects: Project[]; entries: Entry[] }) {
  const [pending, start] = useTransition();
  const today = new Date().toISOString().slice(0, 10);
  const [tab, setTab] = useState<"saisie" | "historique">("saisie");
  const [form, setForm] = useState({ projectId: "", date: today, hours: "8", description: "" });
  const [mode, setMode] = useState<"day" | "range">("day");
  const [range, setRange] = useState({ from: today, to: today, includeWeekend: false });
  const [filterId, setFilterId] = useState("");

  function add() {
    if (!form.projectId) { toast.error("Choisis un chantier"); return; }
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

  function addRange() {
    if (!form.projectId) { toast.error("Choisis un chantier"); return; }
    if (!range.from || !range.to) { toast.error("Choisis les deux dates"); return; }
    if (!form.hours || Number(form.hours) <= 0) { toast.error("Indique le nombre d'heures"); return; }
    const fd = new FormData();
    fd.set("projectId", form.projectId);
    fd.set("from", range.from);
    fd.set("to", range.to);
    fd.set("hours", form.hours);
    fd.set("description", form.description);
    fd.set("includeWeekend", String(range.includeWeekend));
    start(async () => {
      try {
        const r = await addTimesheetRange(fd);
        toast.success(`${r.count} jour(s) enregistré(s)`);
        setForm({ ...form, description: "" });
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

  const totalWeek = entries
    .filter((e) => new Date(e.date) >= new Date(Date.now() - 7 * 24 * 3600 * 1000))
    .reduce((s, e) => s + Number(e.hours), 0);

  const filtered = filterId ? entries.filter((e) => e.project?.id === filterId) : entries;
  const totalFiltered = filtered.reduce((s, e) => s + Number(e.hours), 0);

  return (
    <>
      {/* Onglets */}
      <div className="flex gap-2 mb-4">
        {([["saisie", "Saisie", PencilLine], ["historique", "Historique", ListChecks]] as const).map(([t, label, Icon]) => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={"flex-1 h-11 rounded-xl border-2 font-semibold inline-flex items-center justify-center gap-2 " +
              (tab === t ? "bg-gold text-ink border-gold" : "bg-white text-ink border-cream-300")}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {tab === "saisie" ? (
        <>
          {/* Formulaire saisie rapide */}
          <div className="card p-4 mb-4 border-2 border-gold">
            <div className="space-y-3">
              <div className="flex gap-2">
                {(["day", "range"] as const).map((m) => (
                  <button key={m} type="button" onClick={() => setMode(m)}
                    className={"flex-1 h-10 rounded-xl border-2 text-sm font-semibold " +
                      (mode === m ? "bg-ink text-cream border-ink" : "bg-white text-ink border-cream-300")}>
                    {m === "day" ? "Un jour" : "Période"}
                  </button>
                ))}
              </div>

              {mode === "day" ? (
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
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Du</label>
                      <input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} className="input" />
                    </div>
                    <div>
                      <label className="label">Au</label>
                      <input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} className="input" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 items-center">
                    <div>
                      <label className="label">Heures / jour</label>
                      <input type="number" step="0.25" min="0.25" max="24" value={form.hours}
                             onChange={(e) => setForm({ ...form, hours: e.target.value })} className="input" />
                    </div>
                    <label className="flex items-center gap-2 mt-5 cursor-pointer text-sm">
                      <input type="checkbox" checked={range.includeWeekend}
                             onChange={(e) => setRange({ ...range, includeWeekend: e.target.checked })} className="w-5 h-5" />
                      Inclure week-ends
                    </label>
                  </div>
                  <p className="text-xs text-ink-300">Une saisie par jour ouvré ; les jours déjà remplis sont ignorés.</p>
                </>
              )}
              <div>
                <label className="label">Chantier *</label>
                <select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })} className="input">
                  <option value="">— Choisis un chantier —</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{projLabel(p)}</option>)}
                </select>
                {projects.length === 0 && (
                  <p className="text-xs text-amber-700 mt-1">Aucun chantier actif. Crée un chantier avant de saisir des heures.</p>
                )}
              </div>
              <div>
                <label className="label">Description (optionnel)</label>
                <input value={form.description} placeholder="Ex. pose carrelage cuisine"
                       onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" />
              </div>
              <button onClick={mode === "day" ? add : addRange} disabled={pending} className="btn-gold w-full btn-lg">
                {pending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                {mode === "day" ? "Enregistrer" : "Enregistrer la période"}
              </button>
            </div>
          </div>

          <div className="card p-3 text-center">
            <span className="text-sm text-ink-300">Total 7 derniers jours :</span>{" "}
            <span className="text-2xl font-black text-gold">{totalWeek.toFixed(2)} h</span>
          </div>
        </>
      ) : (
        /* ─── Historique condensé + filtre chantier ─── */
        <>
          <div className="card p-3 mb-3 space-y-2">
            <select value={filterId} onChange={(e) => setFilterId(e.target.value)} className="input">
              <option value="">Tous les chantiers</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{projLabel(p)}</option>)}
            </select>
            <div className="flex items-center justify-between text-sm px-1">
              <span className="text-ink-300">{filtered.length} saisie{filtered.length > 1 ? "s" : ""}</span>
              <span className="font-bold">Total : <span className="text-gold-700">{totalFiltered.toFixed(2)} h</span></span>
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="text-center text-ink-300 py-6">Aucune heure {filterId ? "pour ce chantier" : "saisie"}.</p>
          ) : (
            <div className="card divide-y divide-cream-300">
              {filtered.map((e) => (
                <div key={e.id} className="px-3 py-2 flex items-center gap-3 text-sm">
                  <span className="text-ink-300 w-14 shrink-0 tabular-nums">{fmtShort(e.date)}</span>
                  <span className="text-gold-700 font-bold w-12 shrink-0 tabular-nums">{Number(e.hours).toFixed(2)}h</span>
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{e.project ? projLabel(e.project) : "—"}</div>
                    {e.description && <div className="text-xs text-ink-300 truncate">{e.description}</div>}
                  </div>
                  <button onClick={() => remove(e.id)} disabled={pending} className="p-1 text-ink-300 hover:text-danger shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
