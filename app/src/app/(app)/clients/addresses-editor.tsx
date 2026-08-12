"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, MapPin, Trash2, Star, Loader2, FileText, Hammer, ChevronRight } from "lucide-react";
import { addCustomerAddress, deleteCustomerAddress } from "@/server/actions/customer-addresses";

type Address = {
  id: string;
  label: string | null;
  street: string;
  postalCode: string | null;
  city: string;
  country: string | null;
  isPrimary: boolean;
  _count?: { projects: number; quotes: number };
};

export function AddressesEditor({ customerId, addresses }: { customerId: string; addresses: Address[] }) {
  const [adding, setAdding] = useState(false);
  const [pending, start] = useTransition();

  function remove(id: string, projectsCount: number) {
    if (projectsCount > 0) {
      if (!confirm(`Cette adresse a ${projectsCount} chantier(s). Les chantiers seront détachés mais pas supprimés. Confirmer ?`)) return;
    } else {
      if (!confirm("Supprimer cette adresse ?")) return;
    }
    start(async () => {
      try { await deleteCustomerAddress(id); toast.success("Supprimée"); }
      catch (e: any) { toast.error(e?.message ?? "Erreur"); }
    });
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-lg">Adresses de chantier ({addresses.length})</h2>
        {!adding && (
          <button onClick={() => setAdding(true)} className="btn-gold btn-sm">
            <Plus className="w-4 h-4" /> Ajouter
          </button>
        )}
      </div>

      {addresses.length === 0 && !adding && (
        <div className="card p-5 text-center">
          <MapPin className="w-10 h-10 text-ink-300 mx-auto mb-2" />
          <p className="text-ink-300 text-sm">Aucune adresse enregistrée pour ce client.</p>
        </div>
      )}

      <ul className="space-y-2">
        {addresses.map((a) => {
          const quoteCount = a._count?.quotes ?? 0;
          const projCount = a._count?.projects ?? 0;
          return (
            <li key={a.id} className="card p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <Link href={`/clients/${customerId}/adresses/${a.id}`} className="flex items-start gap-3 flex-1 group">
                  <MapPin className={"w-5 h-5 mt-0.5 " + (a.isPrimary ? "text-gold" : "text-ink-300")} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold group-hover:underline">{a.label || "Adresse"}</span>
                      {a.isPrimary && <span className="badge-gold">Principale</span>}
                    </div>
                    <div className="text-sm text-ink-300 mt-0.5">
                      {a.street}<br />
                      {a.postalCode} {a.city}{a.country && a.country !== "Belgique" && `, ${a.country}`}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-ink-300 mt-0.5 group-hover:text-ink" />
                </Link>
                <button onClick={() => remove(a.id, projCount)} disabled={pending} className="p-2 text-ink-300 hover:text-danger">
                  {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
              {(quoteCount > 0 || projCount > 0) && (
                <div className="flex gap-3 text-xs text-ink-300 pt-2 border-t border-cream-300">
                  {quoteCount > 0 && (
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3" /> {quoteCount} devis
                    </span>
                  )}
                  {projCount > 0 && (
                    <span className="flex items-center gap-1">
                      <Hammer className="w-3 h-3" /> {projCount} chantier{projCount > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {adding && (
        <NewAddressForm customerId={customerId} firstAddress={addresses.length === 0} onDone={() => setAdding(false)} />
      )}
    </section>
  );
}

function NewAddressForm({ customerId, firstAddress, onDone }: { customerId: string; firstAddress: boolean; onDone: () => void }) {
  const [pending, start] = useTransition();
  const [form, setForm] = useState({
    label: "", street: "", postalCode: "", city: "", country: "Belgique",
    isPrimary: firstAddress, notes: ""
  });
  function save() {
    if (!form.street.trim() || !form.city.trim()) { toast.error("Rue et ville obligatoires"); return; }
    const fd = new FormData();
    fd.set("customerId", customerId);
    Object.entries(form).forEach(([k, v]) => fd.set(k, String(v)));
    start(async () => {
      try { await addCustomerAddress(fd); toast.success("Adresse ajoutée"); onDone(); }
      catch (e: any) { toast.error(e?.message ?? "Erreur"); }
    });
  }
  return (
    <div className="card p-4 mt-2 border-2 border-gold space-y-2">
      <h3 className="font-semibold">Nouvelle adresse</h3>
      <div><label className="label">Libellé (optionnel)</label><input value={form.label} placeholder="Ex. Maison Bruxelles" onChange={(e) => setForm({ ...form, label: e.target.value })} className="input" /></div>
      <div><label className="label">Rue + numéro *</label><input required value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} className="input" /></div>
      <div className="grid grid-cols-3 gap-2">
        <input value={form.postalCode} placeholder="CP" onChange={(e) => setForm({ ...form, postalCode: e.target.value })} className="input" />
        <input value={form.city} placeholder="Ville *" required onChange={(e) => setForm({ ...form, city: e.target.value })} className="input col-span-2" />
      </div>
      <label className="flex items-center gap-2 cursor-pointer text-sm">
        <input type="checkbox" checked={form.isPrimary} onChange={(e) => setForm({ ...form, isPrimary: e.target.checked })} className="w-5 h-5" />
        <span className="flex items-center gap-1"><Star className="w-4 h-4 text-gold" /> Adresse principale</span>
      </label>
      <div className="flex gap-2 justify-end pt-2">
        <button onClick={onDone} className="btn-ghost">Annuler</button>
        <button onClick={save} disabled={pending} className="btn-gold">
          {pending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Ajouter"}
        </button>
      </div>
    </div>
  );
}
