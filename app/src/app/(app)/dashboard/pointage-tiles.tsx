"use client";
import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Play, Square, Loader2 } from "lucide-react";
import { toggleTimer } from "@/server/actions/timesheet";

type Tile = { id: string; name: string; customer: string | null };

/**
 * Dalles de pointage : un clic démarre le temps de prestation sur le chantier
 * (chrono en direct), un second clic l'arrête. Les horaires sont modifiables
 * ensuite dans l'onglet Heures (historique) si on a cliqué trop tôt/tard.
 */
export function PointageTiles({ projects, runningProjectId, startAt }: {
  projects: Tile[];
  runningProjectId: string | null;
  startAt: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (!startAt) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [startAt]);

  const base = now ?? (startAt ? new Date(startAt).getTime() : 0);
  const elapsed = startAt ? Math.max(0, base - new Date(startAt).getTime()) : 0;
  const fmtElapsed = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  };

  function click(id: string) {
    start(async () => {
      try {
        const r = await toggleTimer(id);
        toast.success(r.running ? "Pointage démarré ⏱️" : "Pointage arrêté");
        router.refresh();
      } catch (e: any) { toast.error(e?.message ?? "Erreur"); }
    });
  }

  if (projects.length === 0) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {projects.map((p) => {
        const active = p.id === runningProjectId;
        return (
          <button key={p.id} onClick={() => click(p.id)} disabled={pending}
            className={"card p-4 text-left transition-all min-h-[96px] flex flex-col justify-between " +
              (active ? "bg-gold text-ink border-2 border-gold shadow-lift" : "hover:shadow-lift hover:bg-gold/5")}>
            <div className="min-w-0">
              <div className="font-semibold truncate">{p.name}</div>
              {p.customer && <div className={"text-xs truncate " + (active ? "text-ink/70" : "text-ink-300")}>{p.customer}</div>}
            </div>
            <div className="flex items-center gap-1.5 mt-2 font-bold">
              {pending && active
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : active
                  ? <><Square className="w-4 h-4 fill-current" /> <span className="tabular-nums">{fmtElapsed(elapsed)}</span></>
                  : <><Play className="w-4 h-4" /> <span className="text-sm">Démarrer</span></>}
            </div>
          </button>
        );
      })}
    </div>
  );
}
