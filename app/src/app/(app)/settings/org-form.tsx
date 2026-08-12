"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { updateOrganization } from "@/server/actions/organization";

export function OrgForm({ initial }: { initial: any }) {
  const [pending, start] = useTransition();
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    vatNumber: initial?.vatNumber ?? "",
    street: initial?.street ?? "",
    postalCode: initial?.postalCode ?? "",
    city: initial?.city ?? "",
    country: initial?.country ?? "Belgique",
    phone: initial?.phone ?? "",
    email: initial?.email ?? "",
    iban: initial?.iban ?? "",
    paymentTermsDays: String(initial?.paymentTermsDays ?? 30),
    logoUrl: initial?.logoUrl ?? ""
  });

  function onLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) { toast.error("Logo max 500 Ko"); return; }
    const reader = new FileReader();
    reader.onload = () => setForm({ ...form, logoUrl: reader.result as string });
    reader.readAsDataURL(file);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.set(k, v));
    start(async () => {
      try {
        await updateOrganization(fd);
        toast.success("Infos enregistrées");
      } catch (err: any) { toast.error(err?.message ?? "Erreur"); }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label">Nom de ta boîte *</label>
        <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
      </div>
      <div>
        <label className="label">N° TVA / BCE</label>
        <input value={form.vatNumber} placeholder="BE0123.456.789" onChange={(e) => setForm({ ...form, vatNumber: e.target.value })} className="input" />
      </div>
      <div>
        <label className="label">Adresse</label>
        <input value={form.street} placeholder="Rue + numéro" onChange={(e) => setForm({ ...form, street: e.target.value })} className="input mb-2" />
        <div className="grid grid-cols-3 gap-2">
          <input value={form.postalCode} placeholder="CP" onChange={(e) => setForm({ ...form, postalCode: e.target.value })} className="input" />
          <input value={form.city} placeholder="Ville" onChange={(e) => setForm({ ...form, city: e.target.value })} className="input col-span-2" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Téléphone</label>
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" />
        </div>
        <div>
          <label className="label">Email pro</label>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" />
        </div>
      </div>
      <div>
        <label className="label">IBAN</label>
        <input value={form.iban} placeholder="BE68 5390 0754 7034" onChange={(e) => setForm({ ...form, iban: e.target.value })} className="input" />
      </div>
      <div>
        <label className="label">Délai de paiement par défaut (jours)</label>
        <input type="number" min={0} max={180} value={form.paymentTermsDays}
               onChange={(e) => setForm({ ...form, paymentTermsDays: e.target.value })}
               className="input" />
        <p className="text-xs text-ink-300 mt-1">Apparaît automatiquement sur tes factures.</p>
      </div>
      <div>
        <label className="label">Logo (optionnel, 500 Ko max)</label>
        <input type="file" accept="image/*" onChange={onLogo} className="block w-full text-sm text-ink file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-ink file:text-cream file:font-semibold file:cursor-pointer" />
        {form.logoUrl && (
          <div className="mt-2 flex items-center gap-3">
            <img src={form.logoUrl} alt="Logo" className="h-16 w-auto border-2 border-cream-300 rounded-lg p-1 bg-white" />
            <button type="button" onClick={() => setForm({ ...form, logoUrl: "" })} className="text-xs text-danger underline">Retirer</button>
          </div>
        )}
      </div>
      <button type="submit" disabled={pending} className="btn-gold w-full btn-lg">
        {pending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
        Enregistrer
      </button>
    </form>
  );
}
