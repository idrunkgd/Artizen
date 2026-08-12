"use client";
import { useState, useEffect, useTransition, useRef } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Save, Pencil, Tag, Search, Hammer } from "lucide-react";
import { addQuoteLine, updateQuoteLine, deleteQuoteLine } from "@/server/actions/quotes";
import { searchCatalogItems } from "@/server/actions/catalog-items";
import { formatCurrency } from "@/lib/utils";

type Line = {
  id: string; position: number; category: string; description: string;
  quantity: any; unit: string; unitPrice: any; totalHt: any;
  catalogItemId?: string | null;
  catalogItem?: { reference: string; supplier: { name: string } } | null;
};

const CATEGORIES = [
  { v: "MAIN_OEUVRE",    l: "Main d'œuvre" },
  { v: "FOURNITURE",     l: "Fourniture" },
  { v: "SOUS_TRAITANCE", l: "Sous-traitance" },
  { v: "DEPLACEMENT",    l: "Déplacement" },
  { v: "AUTRE",          l: "Autre" }
];

const UNITS = ["u", "h", "j", "m", "m²", "m³", "kg", "forfait", "pal", "sac"];

/**
 * Éditeur des lignes du devis.
 *
 * Deux modes d'ajout :
 *   - Ligne libre (Main d'œuvre, déplacement, prestation forfaitaire, ...)
 *   - Ligne "Référence exacte" : sélection d'un article du catalogue
 *     fournisseur (CatalogItem) → permet de générer ensuite les bons de
 *     commande matériel automatiquement à l'acceptation du devis.
 */
export function LinesEditor({ quoteId, lines }: { quoteId: string; lines: Line[] }) {
  const [addingMode, setAddingMode] = useState<"none" | "free" | "catalog">("none");
  return (
    <>
      <div className="card overflow-hidden">
        {lines.length === 0 ? (
          <p className="p-5 text-center text-ink-300">Aucune ligne. Ajoute la première ↓</p>
        ) : (
          <ul className="divide-y divide-cream-300">
            {lines.map((l) => <LineRow key={l.id} line={l} />)}
          </ul>
        )}
      </div>

      {addingMode === "none" ? (
        <div className="grid grid-cols-2 gap-2 mt-3">
          <button onClick={() => setAddingMode("free")} className="btn-gold">
            <Plus className="w-5 h-5" /> Ligne libre
          </button>
          <button onClick={() => setAddingMode("catalog")} className="btn-secondary">
            <Tag className="w-5 h-5" /> Référence exacte
          </button>
        </div>
      ) : addingMode === "free" ? (
        <NewLineForm quoteId={quoteId} onDone={() => setAddingMode("none")} />
      ) : (
        <NewCatalogLineForm quoteId={quoteId} onDone={() => setAddingMode("none")} />
      )}
    </>
  );
}

function LineRow({ line }: { line: Line }) {
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();

  function remove() {
    if (!confirm("Supprimer cette ligne ?")) return;
    start(async () => {
      try { await deleteQuoteLine(line.id); toast.success("Supprimée"); }
      catch (e: any) { toast.error(e?.message ?? "Erreur"); }
    });
  }

  if (editing) {
    return <EditLineRow line={line} onDone={() => setEditing(false)} />;
  }
  return (
    <li className="p-3 flex items-start gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className="badge-ink text-[10px]">
            {CATEGORIES.find((c) => c.v === line.category)?.l ?? line.category}
          </span>
          {line.catalogItem && (
            <span className="text-[10px] px-1.5 py-0.5 bg-gold/15 text-gold-700 rounded inline-flex items-center gap-1">
              <Tag className="w-3 h-3" />
              {line.catalogItem.reference} · {line.catalogItem.supplier.name}
            </span>
          )}
        </div>
        <div className="font-medium">{line.description}</div>
        <div className="text-sm text-ink-300 mt-0.5">
          {Number(line.quantity)} {line.unit} × {formatCurrency(Number(line.unitPrice))} = <strong className="text-ink">{formatCurrency(Number(line.totalHt))}</strong>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <button onClick={() => setEditing(true)} className="p-2 text-ink-300 hover:text-ink"><Pencil className="w-4 h-4" /></button>
        <button onClick={remove} disabled={pending} className="p-2 text-ink-300 hover:text-danger">
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        </button>
      </div>
    </li>
  );
}

function EditLineRow({ line, onDone }: { line: Line; onDone: () => void }) {
  const [pending, start] = useTransition();
  const [form, setForm] = useState({
    category: line.category,
    description: line.description,
    quantity: String(line.quantity),
    unit: line.unit,
    unitPrice: String(line.unitPrice),
    catalogItemId: line.catalogItemId ?? ""
  });
  function save() {
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.set(k, v));
    start(async () => {
      try { await updateQuoteLine(line.id, fd); toast.success("Modifiée"); onDone(); }
      catch (e: any) { toast.error(e?.message ?? "Erreur"); }
    });
  }
  const total = Number(form.quantity || 0) * Number(form.unitPrice || 0);
  return (
    <li className="p-3 bg-gold/5">
      {line.catalogItem && (
        <div className="text-xs text-ink-300 mb-2 inline-flex items-center gap-1">
          <Tag className="w-3 h-3" /> Article catalogue : <strong>{line.catalogItem.reference}</strong> ({line.catalogItem.supplier.name})
        </div>
      )}
      <LineFormFields form={form} setForm={setForm as any} disableCategory={!!line.catalogItemId} />
      <div className="flex items-center justify-between mt-2">
        <span className="text-sm">Total : <strong>{formatCurrency(total)}</strong></span>
        <div className="flex gap-2">
          <button onClick={onDone} className="btn-ghost btn-sm">Annuler</button>
          <button onClick={save} disabled={pending} className="btn-gold btn-sm">
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Sauver
          </button>
        </div>
      </div>
    </li>
  );
}

function NewLineForm({ quoteId, onDone }: { quoteId: string; onDone: () => void }) {
  const [pending, start] = useTransition();
  const [form, setForm] = useState({
    category: "MAIN_OEUVRE", description: "", quantity: "1", unit: "u", unitPrice: "0"
  });
  function save() {
    if (!form.description.trim()) { toast.error("Description requise"); return; }
    const fd = new FormData();
    fd.set("quoteId", quoteId);
    Object.entries(form).forEach(([k, v]) => fd.set(k, v));
    start(async () => {
      try { await addQuoteLine(fd); toast.success("Ajoutée"); onDone(); }
      catch (e: any) { toast.error(e?.message ?? "Erreur"); }
    });
  }
  const total = Number(form.quantity || 0) * Number(form.unitPrice || 0);
  return (
    <div className="card p-4 mt-3 border-2 border-gold">
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <Hammer className="w-4 h-4" /> Nouvelle ligne libre
      </h3>
      <LineFormFields form={form} setForm={setForm as any} />
      <div className="flex items-center justify-between mt-3">
        <span className="text-base font-semibold">Total : {formatCurrency(total)}</span>
        <div className="flex gap-2">
          <button onClick={onDone} className="btn-ghost">Annuler</button>
          <button onClick={save} disabled={pending} className="btn-gold">
            {pending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Ajouter
          </button>
        </div>
      </div>
    </div>
  );
}

type CatalogHit = {
  id: string;
  reference: string;
  label: string;
  unit: string;
  unitPriceHt: any;
  vatRate: any;
  supplier: { name: string };
};

/**
 * Form d'ajout "Référence exacte" : pick d'article catalogue + qté.
 * Tout le reste (description, prix, unité, fournisseur) est dérivé de
 * l'article sélectionné mais reste éditable avant validation.
 */
function NewCatalogLineForm({ quoteId, onDone }: { quoteId: string; onDone: () => void }) {
  const [pending, start] = useTransition();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<CatalogHit | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("0");
  const debounceRef = useRef<any>();

  // Chargement initial (top 30) + debounce sur changement
  useEffect(() => {
    if (picked) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await searchCatalogItems(query);
        setResults(r as any);
      } finally {
        setSearching(false);
      }
    }, 180);
    return () => clearTimeout(debounceRef.current);
  }, [query, picked]);

  function pick(item: CatalogHit) {
    setPicked(item);
    setUnitPrice(String(Number(item.unitPriceHt)));
  }

  function save() {
    if (!picked) { toast.error("Choisis un article"); return; }
    const fd = new FormData();
    fd.set("quoteId", quoteId);
    fd.set("catalogItemId", picked.id);
    fd.set("description", picked.label);
    fd.set("quantity", quantity);
    fd.set("unit", picked.unit);
    fd.set("unitPrice", unitPrice);
    // category sera forcée à FOURNITURE côté server quand catalogItemId est défini
    fd.set("category", "FOURNITURE");
    start(async () => {
      try { await addQuoteLine(fd); toast.success("Article ajouté"); onDone(); }
      catch (e: any) { toast.error(e?.message ?? "Erreur"); }
    });
  }

  const total = Number(quantity || 0) * Number(unitPrice || 0);

  return (
    <div className="card p-4 mt-3 border-2 border-gold">
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <Tag className="w-4 h-4" /> Référence exacte (article fournisseur)
      </h3>

      {!picked ? (
        <>
          <div className="relative">
            <Search className="w-4 h-4 text-ink-300 absolute left-3 top-3" />
            <input
              autoFocus value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cherche par référence, libellé ou fournisseur..."
              className="input pl-9"
            />
          </div>
          <div className="mt-3 max-h-72 overflow-y-auto border border-cream-300 rounded-lg">
            {searching ? (
              <div className="p-4 text-center text-sm text-ink-300">Recherche...</div>
            ) : results.length === 0 ? (
              <div className="p-4 text-center text-sm text-ink-300">
                Aucun article. Ajoute-en sur la fiche d'un fournisseur.
              </div>
            ) : (
              <ul>
                {results.map((it) => (
                  <li key={it.id}>
                    <button
                      onClick={() => pick(it)}
                      className="w-full text-left p-3 hover:bg-cream-100 border-b border-cream-300 last:border-0"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] px-1.5 py-0.5 bg-ink text-cream rounded">
                          {it.reference}
                        </span>
                        <span className="font-medium">{it.label}</span>
                      </div>
                      <div className="text-xs text-ink-300 mt-0.5">
                        {it.supplier.name} · {Number(it.unitPriceHt).toFixed(2)} € HT / {it.unit}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex justify-end mt-3">
            <button onClick={onDone} className="btn-ghost">Annuler</button>
          </div>
        </>
      ) : (
        <>
          <div className="p-3 bg-cream-100 rounded-lg mb-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs px-1.5 py-0.5 bg-ink text-cream rounded">{picked.reference}</span>
              <span className="font-semibold">{picked.label}</span>
            </div>
            <div className="text-sm text-ink-300">{picked.supplier.name}</div>
            <button onClick={() => setPicked(null)} className="text-xs text-gold-700 mt-1 hover:underline">
              ← Changer d'article
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Quantité ({picked.unit})</label>
              <input type="number" step="0.001" value={quantity}
                     onChange={(e) => setQuantity(e.target.value)}
                     className="input" autoFocus />
            </div>
            <div>
              <label className="label">Prix HT / {picked.unit}</label>
              <input type="number" step="0.01" value={unitPrice}
                     onChange={(e) => setUnitPrice(e.target.value)}
                     className="input" />
            </div>
          </div>
          <div className="flex items-center justify-between mt-3">
            <span className="text-base font-semibold">Total : {formatCurrency(total)}</span>
            <div className="flex gap-2">
              <button onClick={onDone} className="btn-ghost">Annuler</button>
              <button onClick={save} disabled={pending} className="btn-gold">
                {pending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Ajouter
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function LineFormFields({
  form, setForm, disableCategory = false
}: { form: any; setForm: (f: any) => void; disableCategory?: boolean }) {
  return (
    <div className="space-y-2">
      <select value={form.category}
              disabled={disableCategory}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="input">
        {CATEGORIES.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
      </select>
      <input value={form.description} placeholder="Description"
             onChange={(e) => setForm({ ...form, description: e.target.value })}
             className="input" />
      <div className="grid grid-cols-3 gap-2">
        <input type="number" step="0.001" value={form.quantity} placeholder="Qté"
               onChange={(e) => setForm({ ...form, quantity: e.target.value })}
               className="input" />
        <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="input">
          {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
        <input type="number" step="0.01" value={form.unitPrice} placeholder="Prix unitaire"
               onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
               className="input" />
      </div>
    </div>
  );
}
