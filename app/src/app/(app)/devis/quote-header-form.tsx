"use client";
import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save, Trash2, Plus, X, UserPlus, MapPin, Star } from "lucide-react";
import { createQuote, updateQuote, deleteQuote } from "@/server/actions/quotes";
import { createCustomer } from "@/server/actions/customers";
import { addCustomerAddress } from "@/server/actions/customer-addresses";

type Address = { id: string; label: string | null; street: string; postalCode: string | null; city: string; isPrimary: boolean };
type Customer = { id: string; name: string; addresses?: Address[] };

export function QuoteHeaderForm({
  initial, customers: initialCustomers, prefill
}: {
  initial?: any;
  customers: Customer[];
  /// Pré-remplissage du client/adresse depuis la query string
  prefill?: { customerId?: string; customerAddressId?: string };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [form, setForm] = useState({
    customerId: initial?.customerId ?? prefill?.customerId ?? customers[0]?.id ?? "",
    customerAddressId: initial?.customerAddressId ?? prefill?.customerAddressId ?? "",
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    vatRate: String(initial?.vatRate ?? 21),
    validityDays: String(initial?.validityDays ?? 30),
    notes: initial?.notes ?? ""
  });

  const selectedCustomer = customers.find((c) => c.id === form.customerId);
  const customerAddresses = selectedCustomer?.addresses ?? [];

  // Quand on change de client : reset l'adresse et auto-sélectionne la principale si seule
  useEffect(() => {
    if (form.customerAddressId && !customerAddresses.find((a) => a.id === form.customerAddressId)) {
      setForm((f) => ({ ...f, customerAddressId: "" }));
    }
    if (!form.customerAddressId && customerAddresses.length > 0 && !initial) {
      const primary = customerAddresses.find((a) => a.isPrimary) ?? customerAddresses[0];
      setForm((f) => ({ ...f, customerAddressId: primary.id }));
    }
  }, [form.customerId, customerAddresses, form.customerAddressId, initial]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("Titre obligatoire"); return; }
    if (!form.customerId) { toast.error("Client obligatoire"); return; }
    if (!form.customerAddressId) { toast.error("Adresse de chantier obligatoire"); return; }
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.set(k, v));
    start(async () => {
      try {
        if (initial) { await updateQuote(initial.id, fd); toast.success("Mis à jour"); }
        else { const r = await createQuote(fd); toast.success("Devis créé"); router.push(`/devis/${r.id}`); }
      } catch (err: any) { toast.error(err?.message ?? "Erreur"); }
    });
  }

  function remove() {
    if (!initial || !confirm("Supprimer ce devis ?")) return;
    start(async () => {
      try { await deleteQuote(initial.id); toast.success("Supprimé"); router.push("/devis"); }
      catch (e: any) { toast.error(e?.message ?? "Erreur"); }
    });
  }

  function onCustomerCreated(newId: string, newName: string) {
    setCustomers([...customers, { id: newId, name: newName, addresses: [] }]);
    setForm({ ...form, customerId: newId, customerAddressId: "" });
    setShowCustomerModal(false);
    // Pour que l'utilisateur puisse ajouter l'adresse de chantier immédiatement
    setTimeout(() => setShowAddressModal(true), 100);
  }

  function onAddressCreated(newAddr: Address) {
    setCustomers(customers.map((c) =>
      c.id === form.customerId
        ? { ...c, addresses: [...(c.addresses ?? []), newAddr] }
        : c
    ));
    setForm({ ...form, customerAddressId: newAddr.id });
    setShowAddressModal(false);
  }

  return (
    <>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="label">Client *</label>
          <div className="flex gap-2">
            <select required value={form.customerId}
                    onChange={(e) => setForm({ ...form, customerId: e.target.value, customerAddressId: "" })}
                    className="input flex-1">
              <option value="">— Choisis un client —</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button type="button" onClick={() => setShowCustomerModal(true)}
                    className="btn-gold btn-sm" title="Créer un client">
              <UserPlus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div>
          <label className="label">Adresse du chantier *</label>
          <div className="flex gap-2">
            <select required value={form.customerAddressId}
                    onChange={(e) => setForm({ ...form, customerAddressId: e.target.value })}
                    className="input flex-1"
                    disabled={!form.customerId}>
              <option value="">— Choisis une adresse —</option>
              {customerAddresses.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.isPrimary ? "⭐ " : ""}{a.label ? `${a.label} — ` : ""}{a.street}, {a.postalCode} {a.city}
                </option>
              ))}
            </select>
            <button type="button"
                    onClick={() => {
                      if (!form.customerId) { toast.error("Choisis d'abord un client"); return; }
                      setShowAddressModal(true);
                    }}
                    className="btn-gold btn-sm" title="Ajouter une adresse">
              <MapPin className="w-4 h-4" />
            </button>
          </div>
          {form.customerId && customerAddresses.length === 0 && (
            <p className="text-xs text-amber-700 mt-1">
              Aucune adresse pour ce client. Clique sur 📍 pour en ajouter une.
            </p>
          )}
          <p className="text-xs text-ink-300 mt-1">
            Plusieurs devis peuvent porter sur la même adresse (avenants, etc.). Le chantier sera créé ou associé à l'acceptation.
          </p>
        </div>

        <div>
          <label className="label">Titre du devis *</label>
          <input required value={form.title} placeholder="Ex. Rénovation salle de bain"
                 onChange={(e) => setForm({ ...form, title: e.target.value })} className="input" />
        </div>
        <div>
          <label className="label">Description (apparaît sur le PDF)</label>
          <textarea value={form.description} rows={3}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="input min-h-[80px]" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">TVA (%)</label>
            <select value={form.vatRate} onChange={(e) => setForm({ ...form, vatRate: e.target.value })} className="input">
              <option value="0">0 % (exonéré)</option>
              <option value="6">6 % (logement +10 ans)</option>
              <option value="21">21 % (standard)</option>
            </select>
          </div>
          <div>
            <label className="label">Validité (jours)</label>
            <input type="number" min={1} value={form.validityDays}
                   onChange={(e) => setForm({ ...form, validityDays: e.target.value })} className="input" />
          </div>
        </div>
        <div>
          <label className="label">Notes / conditions</label>
          <textarea value={form.notes} rows={2} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="input min-h-[60px]" />
        </div>
        <div className="flex gap-2 pt-2">
          <button type="submit" disabled={pending} className="btn-gold flex-1">
            {pending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {initial ? "Enregistrer" : "Créer le devis"}
          </button>
          {initial && (
            <button type="button" onClick={remove} className="btn bg-white text-danger border-2 border-danger"><Trash2 className="w-5 h-5" /></button>
          )}
        </div>
      </form>

      {showCustomerModal && (
        <QuickCustomerModal onClose={() => setShowCustomerModal(false)} onCreated={onCustomerCreated} />
      )}
      {showAddressModal && selectedCustomer && (
        <QuickAddressModal customer={selectedCustomer} onClose={() => setShowAddressModal(false)} onCreated={onAddressCreated} />
      )}
    </>
  );
}

function QuickCustomerModal({
  onClose, onCreated
}: { onClose: () => void; onCreated: (id: string, name: string) => void }) {
  const [pending, start] = useTransition();
  const [form, setForm] = useState({ name: "", type: "PARTICULIER", phone: "", email: "" });
  function save() {
    if (!form.name.trim()) { toast.error("Nom requis"); return; }
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.set(k, v));
    start(async () => {
      try {
        const r = await createCustomer(fd);
        toast.success("Client créé");
        onCreated(r.id, form.name);
      } catch (e: any) { toast.error(e?.message ?? "Erreur"); }
    });
  }
  return (
    <ModalShell title="Nouveau client" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="label">Nom complet *</label>
          <input required value={form.name} placeholder="Ex. Jean Dupont"
                 onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" autoFocus />
        </div>
        <div className="flex gap-2">
          {(["PARTICULIER", "PRO"] as const).map((t) => (
            <button key={t} type="button"
              onClick={() => setForm({ ...form, type: t })}
              className={"flex-1 h-12 rounded-xl border-2 font-semibold " +
                (form.type === t ? "bg-ink text-cream border-ink" : "bg-white text-ink border-cream-300")}>
              {t === "PRO" ? "Pro / société" : "Particulier"}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Téléphone</label><input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" /></div>
          <div><label className="label">Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" /></div>
        </div>
        <p className="text-xs text-ink-300">Tu pourras ajouter l'adresse juste après.</p>
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="btn-ghost flex-1">Annuler</button>
          <button onClick={save} disabled={pending} className="btn-gold flex-1">
            {pending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />} Créer
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function QuickAddressModal({
  customer, onClose, onCreated
}: { customer: Customer; onClose: () => void; onCreated: (addr: Address) => void }) {
  const [pending, start] = useTransition();
  const isFirstAddress = (customer.addresses?.length ?? 0) === 0;
  const [form, setForm] = useState({
    label: "", street: "", postalCode: "", city: "",
    country: "Belgique", isPrimary: isFirstAddress
  });
  function save() {
    if (!form.street.trim() || !form.city.trim()) { toast.error("Rue et ville obligatoires"); return; }
    const fd = new FormData();
    fd.set("customerId", customer.id);
    Object.entries(form).forEach(([k, v]) => fd.set(k, String(v)));
    start(async () => {
      try {
        const r = await addCustomerAddress(fd);
        toast.success("Adresse ajoutée");
        onCreated({
          id: r.id,
          label: form.label || null,
          street: form.street,
          postalCode: form.postalCode || null,
          city: form.city,
          isPrimary: form.isPrimary
        });
      } catch (e: any) { toast.error(e?.message ?? "Erreur"); }
    });
  }
  return (
    <ModalShell title={`Nouvelle adresse — ${customer.name}`} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="label">Libellé (optionnel)</label>
          <input value={form.label} placeholder="Ex. Maison principale, Appartement Bruxelles..."
                 onChange={(e) => setForm({ ...form, label: e.target.value })} className="input" autoFocus />
        </div>
        <div>
          <label className="label">Rue + numéro *</label>
          <input required value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} className="input" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <input value={form.postalCode} placeholder="CP" onChange={(e) => setForm({ ...form, postalCode: e.target.value })} className="input" />
          <input value={form.city} placeholder="Ville *" required onChange={(e) => setForm({ ...form, city: e.target.value })} className="input col-span-2" />
        </div>
        <label className="flex items-center gap-2 cursor-pointer text-sm">
          <input type="checkbox" checked={form.isPrimary} onChange={(e) => setForm({ ...form, isPrimary: e.target.checked })} className="w-5 h-5" />
          <span className="flex items-center gap-1"><Star className="w-4 h-4 text-gold" /> Adresse principale</span>
        </label>
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="btn-ghost flex-1">Annuler</button>
          <button onClick={save} disabled={pending} className="btn-gold flex-1">
            {pending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />} Ajouter
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 grid place-items-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-lift p-6 w-full max-w-md my-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">{title}</h2>
          <button onClick={onClose} className="p-1 text-ink-300 hover:text-ink"><X className="w-5 h-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
