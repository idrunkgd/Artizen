"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, X, Save, Loader2, EyeOff, Eye } from "lucide-react";
import {
  createCatalogItem, updateCatalogItem, deleteCatalogItem
} from "@/server/actions/catalog-items";

type Item = {
  id: string;
  reference: string;
  label: string;
  unit: string;
  unitPriceHt: number;
  vatRate: number;
  notes: string | null;
  isActive: boolean;
};

/**
 * CRUD inline du catalogue d'articles d'un fournisseur.
 * Form d'ajout en haut, liste cliquable avec édition inline en dessous.
 * Suppression : si l'article a été utilisé sur un devis ou une commande,
 * on désactive au lieu de supprimer (préservation historique).
 */
export function SupplierCatalogSection({
  supplierId, items
}: { supplierId: string; items: Item[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-3">
      {!adding ? (
        <button onClick={() => setAdding(true)} className="btn-gold w-full justify-center">
          <Plus className="w-5 h-5" /> Ajouter un article
        </button>
      ) : (
        <CatalogItemForm
          supplierId={supplierId}
          onDone={() => setAdding(false)}
          onCancel={() => setAdding(false)}
        />
      )}

      {items.length === 0 ? (
        <p className="card p-5 text-center text-ink-300">
          Aucun article au catalogue de ce fournisseur.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((it) =>
            editingId === it.id ? (
              <CatalogItemForm
                key={it.id}
                supplierId={supplierId}
                item={it}
                onDone={() => setEditingId(null)}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <ItemRow
                key={it.id}
                item={it}
                onEdit={() => setEditingId(it.id)}
              />
            )
          )}
        </ul>
      )}
    </div>
  );
}

function ItemRow({ item, onEdit }: { item: Item; onEdit: () => void }) {
  const [pending, start] = useTransition();
  function remove() {
    if (!confirm(`Supprimer "${item.label}" ?\nSi l'article a été utilisé, il sera désactivé au lieu d'être supprimé.`)) return;
    start(async () => {
      try { await deleteCatalogItem(item.id); toast.success("Article retiré"); }
      catch (e: any) { toast.error(e?.message ?? "Erreur"); }
    });
  }
  return (
    <li className={"card p-3 " + (item.isActive ? "" : "opacity-60")}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs px-1.5 py-0.5 bg-ink text-cream rounded">{item.reference}</span>
            <span className="font-semibold truncate">{item.label}</span>
            {!item.isActive && (
              <span className="text-xs text-ink-300 inline-flex items-center gap-1">
                <EyeOff className="w-3 h-3" /> inactif
              </span>
            )}
          </div>
          <div className="text-sm text-ink-300 mt-0.5">
            {item.unitPriceHt.toFixed(2)} € HT / {item.unit} · TVA {item.vatRate}%
          </div>
          {item.notes && <div className="text-xs text-ink-400 italic mt-1">{item.notes}</div>}
        </div>
        <button onClick={onEdit} className="text-ink-300 hover:text-ink p-1" title="Modifier">
          <Pencil className="w-4 h-4" />
        </button>
        <button onClick={remove} disabled={pending} className="text-ink-300 hover:text-red-600 p-1" title="Supprimer">
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        </button>
      </div>
    </li>
  );
}

function CatalogItemForm({
  supplierId, item, onDone, onCancel
}: {
  supplierId: string;
  item?: Item;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [pending, start] = useTransition();
  const [form, setForm] = useState({
    reference: item?.reference ?? "",
    label: item?.label ?? "",
    unit: item?.unit ?? "u",
    unitPriceHt: String(item?.unitPriceHt ?? 0),
    vatRate: String(item?.vatRate ?? 21),
    notes: item?.notes ?? "",
    isActive: item?.isActive ?? true
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("supplierId", supplierId);
    fd.set("reference", form.reference);
    fd.set("label", form.label);
    fd.set("unit", form.unit);
    fd.set("unitPriceHt", form.unitPriceHt);
    fd.set("vatRate", form.vatRate);
    fd.set("notes", form.notes);
    if (form.isActive) fd.set("isActive", "on");
    start(async () => {
      try {
        if (item) await updateCatalogItem(item.id, fd);
        else await createCatalogItem(fd);
        toast.success(item ? "Article modifié" : "Article ajouté");
        onDone();
      } catch (e: any) { toast.error(e?.message ?? "Erreur"); }
    });
  }

  return (
    <form onSubmit={submit} className="card p-4 space-y-3 border-2 border-gold">
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-1">
          <label className="label">Référence *</label>
          <input className="input" required value={form.reference}
                 onChange={(e) => setForm({ ...form, reference: e.target.value })} />
        </div>
        <div className="col-span-2">
          <label className="label">Libellé *</label>
          <input className="input" required value={form.label}
                 onChange={(e) => setForm({ ...form, label: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="label">Unité</label>
          <input className="input" value={form.unit}
                 onChange={(e) => setForm({ ...form, unit: e.target.value })} />
        </div>
        <div>
          <label className="label">Prix HT</label>
          <input type="number" step="0.01" className="input" value={form.unitPriceHt}
                 onChange={(e) => setForm({ ...form, unitPriceHt: e.target.value })} />
        </div>
        <div>
          <label className="label">TVA %</label>
          <input type="number" step="0.01" className="input" value={form.vatRate}
                 onChange={(e) => setForm({ ...form, vatRate: e.target.value })} />
        </div>
      </div>
      <div>
        <label className="label">Notes (optionnel)</label>
        <input className="input" value={form.notes}
               onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.isActive}
               onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
        Actif (visible dans les devis)
      </label>
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="btn-gold flex-1">
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {item ? "Modifier" : "Ajouter"}
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost">
          <X className="w-4 h-4" /> Annuler
        </button>
      </div>
    </form>
  );
}
