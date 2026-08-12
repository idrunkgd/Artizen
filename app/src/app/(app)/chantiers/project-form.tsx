"use client";
import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save, Trash2, MapPin } from "lucide-react";
import { createProject, updateProject, deleteProject } from "@/server/actions/projects";

type Address = { id: string; label: string | null; street: string; postalCode: string | null; city: string; isPrimary: boolean };
type CustomerWithAddrs = { id: string; name: string; addresses?: Address[] };

type Initial = {
  id: string;
  name: string;
  description?: string | null;
  customerId?: string | null;
  customerAddressId?: string | null;
  status: string;
  siteStreet?: string | null;
  sitePostalCode?: string | null;
  siteCity?: string | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  budgetEstimate?: any;
};

export function ProjectForm({
  initial,
  customers
}: {
  initial?: Initial;
  customers: CustomerWithAddrs[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    customerId: initial?.customerId ?? "",
    customerAddressId: initial?.customerAddressId ?? "",
    status: initial?.status ?? "PROSPECT",
    siteStreet: initial?.siteStreet ?? "",
    sitePostalCode: initial?.sitePostalCode ?? "",
    siteCity: initial?.siteCity ?? "",
    startDate: initial?.startDate ? new Date(initial.startDate).toISOString().slice(0, 10) : "",
    endDate: initial?.endDate ? new Date(initial.endDate).toISOString().slice(0, 10) : "",
    budgetEstimate: initial?.budgetEstimate ? String(initial.budgetEstimate) : ""
  });

  const selectedCustomer = customers.find((c) => c.id === form.customerId);
  const customerAddresses = selectedCustomer?.addresses ?? [];

  // Quand on change de client, on reset l'adresse sélectionnée (sauf si déjà valide)
  useEffect(() => {
    if (form.customerAddressId && !customerAddresses.find((a) => a.id === form.customerAddressId)) {
      setForm((f) => ({ ...f, customerAddressId: "" }));
    }
    // Si le client n'a qu'une adresse, on la pré-sélectionne automatiquement
    if (!form.customerAddressId && !initial && customerAddresses.length === 1) {
      setForm((f) => ({ ...f, customerAddressId: customerAddresses[0].id }));
    }
    // Si une adresse principale existe et qu'aucune n'est sélectionnée, on la prend
    if (!form.customerAddressId && !initial && customerAddresses.length > 1) {
      const primary = customerAddresses.find((a) => a.isPrimary);
      if (primary) setForm((f) => ({ ...f, customerAddressId: primary.id }));
    }
  }, [form.customerId, customerAddresses, form.customerAddressId, initial]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Nom du chantier obligatoire"); return; }
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.set(k, v));
    start(async () => {
      try {
        if (initial) {
          await updateProject(initial.id, fd);
          toast.success("Chantier mis à jour");
        } else {
          const r = await createProject(fd);
          toast.success("Chantier créé");
          router.push(`/chantiers/${r.id}`);
        }
      } catch (e: any) { toast.error(e?.message ?? "Erreur"); }
    });
  }

  function remove() {
    if (!initial || !confirm("Supprimer ce chantier (toutes ses photos seront perdues) ?")) return;
    start(async () => {
      try { await deleteProject(initial.id); toast.success("Chantier supprimé"); router.push("/chantiers"); }
      catch (e: any) { toast.error(e?.message ?? "Erreur"); }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label">Nom du chantier *</label>
        <input required value={form.name} placeholder="Ex. Salle de bain Dupont"
               onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
      </div>
      <div>
        <label className="label">Client</label>
        <select value={form.customerId}
                onChange={(e) => setForm({ ...form, customerId: e.target.value, customerAddressId: "" })}
                className="input">
          <option value="">— Sans client lié —</option>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Adresse de chantier : depuis catalogue client OU saisie libre */}
      <div>
        <label className="label flex items-center gap-2">
          <MapPin className="w-4 h-4" /> Adresse du chantier
        </label>
        {customerAddresses.length > 0 && (
          <select value={form.customerAddressId}
                  onChange={(e) => setForm({ ...form, customerAddressId: e.target.value, siteStreet: "", sitePostalCode: "", siteCity: "" })}
                  className="input mb-2">
            <option value="">— Saisir une autre adresse ci-dessous —</option>
            {customerAddresses.map((a) => (
              <option key={a.id} value={a.id}>
                {a.isPrimary ? "⭐ " : ""}{a.label ? `${a.label} — ` : ""}{a.street}, {a.postalCode} {a.city}
              </option>
            ))}
          </select>
        )}
        {!form.customerAddressId && (
          <>
            <input value={form.siteStreet} placeholder="Rue + numéro"
                   onChange={(e) => setForm({ ...form, siteStreet: e.target.value })} className="input mb-2" />
            <div className="grid grid-cols-3 gap-2">
              <input value={form.sitePostalCode} placeholder="CP"
                     onChange={(e) => setForm({ ...form, sitePostalCode: e.target.value })} className="input" />
              <input value={form.siteCity} placeholder="Ville"
                     onChange={(e) => setForm({ ...form, siteCity: e.target.value })} className="input col-span-2" />
            </div>
            {form.customerId && customerAddresses.length === 0 && (
              <p className="text-xs text-ink-300 mt-1">
                💡 Tu peux pré-enregistrer cette adresse sur la <a href={`/clients/${form.customerId}`} className="underline">fiche du client</a> pour la réutiliser.
              </p>
            )}
          </>
        )}
      </div>

      <div>
        <label className="label">Statut</label>
        <div className="grid grid-cols-2 gap-2">
          {([
            { v: "PROSPECT", l: "Prospect" },
            { v: "ACTIVE",   l: "En cours" },
            { v: "ON_HOLD",  l: "En pause" },
            { v: "DONE",     l: "Terminé" }
          ] as const).map((opt) => (
            <button key={opt.v} type="button"
              onClick={() => setForm({ ...form, status: opt.v })}
              className={"h-12 rounded-xl border-2 font-semibold " +
                (form.status === opt.v ? "bg-gold text-ink border-gold" : "bg-white text-ink border-cream-300")}>
              {opt.l}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Début</label>
          <input type="date" value={form.startDate}
                 onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="input" />
        </div>
        <div>
          <label className="label">Fin prévue</label>
          <input type="date" value={form.endDate}
                 onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="input" />
        </div>
      </div>
      <div>
        <label className="label">Budget estimé (€ HTVA)</label>
        <input type="number" step="0.01" value={form.budgetEstimate}
               onChange={(e) => setForm({ ...form, budgetEstimate: e.target.value })} className="input" />
      </div>
      <div>
        <label className="label">Description / notes</label>
        <textarea value={form.description} rows={3}
                  onChange={(e) => setForm({ ...form, description: e.target.value })} className="input min-h-[80px]" />
      </div>
      <div className="flex gap-2 pt-2">
        <button type="submit" disabled={pending} className="btn-gold flex-1">
          {pending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {initial ? "Enregistrer" : "Créer"}
        </button>
        {initial && (
          <button type="button" onClick={remove} disabled={pending}
                  className="btn bg-white text-danger border-2 border-danger hover:bg-red-50">
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>
    </form>
  );
}
