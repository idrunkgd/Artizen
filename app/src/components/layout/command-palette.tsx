"use client";
/**
 * Palette de commandes Cmd+K / Ctrl+K.
 *
 * - S'ouvre au clavier (⌘K ou Ctrl+K) ou via le bouton "Rechercher" dans
 *   le header / la sidebar.
 * - Debounce 180ms pour ne pas spammer le serveur pendant la frappe.
 * - Navigation clavier : ↑ ↓ pour sélectionner, Entrée pour ouvrir,
 *   Escape pour fermer.
 * - Multi-entité : clients, chantiers, devis, factures, fournisseurs,
 *   matériel, outillage. Regroupé par type pour repérage rapide.
 */
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Loader2, X,
  Users, Hammer, FileText, Receipt, Truck, Package, Wrench, Tag
} from "lucide-react";
import { globalSearch, type SearchHit } from "@/server/actions/search";

const KIND_META: Record<SearchHit["kind"], { label: string; Icon: any; color: string }> = {
  customer: { label: "Clients",      Icon: Users,    color: "text-blue-700" },
  project:  { label: "Chantiers",    Icon: Hammer,   color: "text-amber-700" },
  quote:    { label: "Devis",        Icon: FileText, color: "text-emerald-700" },
  invoice:  { label: "Factures",     Icon: Receipt,  color: "text-rose-700" },
  supplier: { label: "Fournisseurs", Icon: Truck,    color: "text-violet-700" },
  catalog:  { label: "Catalogue",    Icon: Tag,      color: "text-gold-700" },
  material: { label: "Matériel",     Icon: Package,  color: "text-cyan-700" },
  tool:     { label: "Outillage",    Icon: Wrench,   color: "text-slate-700" }
};

const KIND_ORDER: SearchHit["kind"][] = [
  "project", "quote", "invoice", "customer", "supplier", "catalog", "material", "tool"
];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // Raccourci clavier global
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      if (isCmdK) {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Focus le champ à l'ouverture, reset à la fermeture
  useEffect(() => {
    if (open) {
      // microtask pour que le focus passe après le render
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setQuery("");
      setHits([]);
      setActiveIdx(0);
    }
  }, [open]);

  // Debounce la recherche
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    const t = setTimeout(() => {
      start(async () => {
        try {
          const res = await globalSearch(q);
          setHits(res);
          setActiveIdx(0);
        } catch (e) {
          setHits([]);
        }
      });
    }, 180);
    return () => clearTimeout(t);
  }, [query, open]);

  // Tri stable par kind pour avoir des groupes
  const grouped = useMemo(() => {
    const byKind = new Map<SearchHit["kind"], SearchHit[]>();
    for (const k of KIND_ORDER) byKind.set(k, []);
    hits.forEach((h) => byKind.get(h.kind)?.push(h));
    return KIND_ORDER
      .map((k) => ({ kind: k, items: byKind.get(k) ?? [] }))
      .filter((g) => g.items.length > 0);
  }, [hits]);

  // Liste à plat dans l'ordre d'affichage, pour la navigation clavier
  const flat = useMemo(() => grouped.flatMap((g) => g.items), [grouped]);

  function go(hit: SearchHit) {
    setOpen(false);
    router.push(hit.href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, Math.max(0, flat.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const hit = flat[activeIdx];
      if (hit) go(hit);
    }
  }

  return (
    <>
      {/* Bouton réutilisable : on l'expose via une fonction window pour que
          la sidebar / le header puissent appeler `openCommandPalette()`.
          Plus simple qu'un context provider, vu qu'il y a un seul portail. */}
      <PaletteBridge onOpen={() => setOpen(true)} />

      {open && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 flex items-start justify-center pt-[15vh] px-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-xl bg-white rounded-2xl shadow-lift overflow-hidden flex flex-col max-h-[70vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-cream-300">
              {pending ? (
                <Loader2 className="w-5 h-5 text-ink-300 animate-spin" />
              ) : (
                <Search className="w-5 h-5 text-ink-300" />
              )}
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Chercher un client, chantier, devis, facture, fournisseur..."
                className="flex-1 bg-transparent outline-none text-base placeholder:text-ink-300"
              />
              <kbd className="text-[10px] px-1.5 py-0.5 border border-cream-300 rounded text-ink-300">
                Esc
              </kbd>
              <button onClick={() => setOpen(false)} className="text-ink-300 hover:text-ink p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {query.trim().length < 2 ? (
                <div className="p-8 text-center text-sm text-ink-300">
                  Tape au moins 2 caractères pour chercher.
                  <div className="mt-2 text-xs text-ink-300">
                    Astuce : <kbd className="px-1 border border-cream-300 rounded">⌘</kbd>+<kbd className="px-1 border border-cream-300 rounded">K</kbd> ou <kbd className="px-1 border border-cream-300 rounded">Ctrl</kbd>+<kbd className="px-1 border border-cream-300 rounded">K</kbd> pour ouvrir d'où que tu sois.
                  </div>
                </div>
              ) : pending ? (
                <div className="p-8 text-center text-sm text-ink-300">Recherche...</div>
              ) : flat.length === 0 ? (
                <div className="p-8 text-center text-sm text-ink-300">Aucun résultat pour « {query} »</div>
              ) : (
                <ul className="py-2">
                  {grouped.map((g) => {
                    const meta = KIND_META[g.kind];
                    return (
                      <li key={g.kind} className="mb-2">
                        <div className="px-4 py-1 text-[11px] uppercase tracking-wider text-ink-300 font-semibold">
                          {meta.label}
                        </div>
                        <ul>
                          {g.items.map((h) => {
                            const Icon = meta.Icon;
                            const idxInFlat = flat.indexOf(h);
                            const active = idxInFlat === activeIdx;
                            return (
                              <li key={`${h.kind}:${h.id}`}>
                                <button
                                  onClick={() => go(h)}
                                  onMouseEnter={() => setActiveIdx(idxInFlat)}
                                  className={
                                    "w-full text-left px-4 py-2.5 flex items-center gap-3 " +
                                    (active ? "bg-cream-100" : "hover:bg-cream-100/60")
                                  }
                                >
                                  <Icon className={`w-4 h-4 shrink-0 ${meta.color}`} />
                                  <div className="min-w-0 flex-1">
                                    <div className="text-sm font-medium text-ink truncate">{h.title}</div>
                                    {h.subtitle && (
                                      <div className="text-xs text-ink-300 truncate">{h.subtitle}</div>
                                    )}
                                  </div>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="px-4 py-2 border-t border-cream-300 text-[11px] text-ink-300 flex items-center justify-between">
              <span>↑ ↓ pour naviguer · ↵ pour ouvrir</span>
              <span>{flat.length > 0 && `${flat.length} résultat${flat.length > 1 ? "s" : ""}`}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Petit pont pour que les boutons "Rechercher" ailleurs dans l'app
 * puissent ouvrir la palette sans contexte React.
 */
function PaletteBridge({ onOpen }: { onOpen: () => void }) {
  useEffect(() => {
    (window as any).openCommandPalette = onOpen;
    return () => {
      if ((window as any).openCommandPalette === onOpen) {
        delete (window as any).openCommandPalette;
      }
    };
  }, [onOpen]);
  return null;
}

/**
 * Bouton "Rechercher" stylé, à utiliser dans la sidebar / le header.
 * Affiche le raccourci ⌘K à droite. Appelle la fonction globale.
 */
export function SearchTrigger({ className = "" }: { className?: string }) {
  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform));
  }, []);
  return (
    <button
      onClick={() => (window as any).openCommandPalette?.()}
      className={
        "flex items-center gap-2 px-3 py-2 rounded-lg bg-ink-800/60 hover:bg-ink-800 text-cream/80 hover:text-cream text-sm w-full " +
        className
      }
    >
      <Search className="w-4 h-4 shrink-0" />
      <span className="flex-1 text-left">Rechercher...</span>
      <kbd className="text-[10px] px-1.5 py-0.5 border border-cream/20 rounded">
        {isMac ? "⌘K" : "Ctrl+K"}
      </kbd>
    </button>
  );
}
