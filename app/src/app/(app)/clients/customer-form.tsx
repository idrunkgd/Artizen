"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save, Trash2 } from "lucide-react";
import { createCustomer, updateCustomer, deleteCustomer } from "@/server/actions/customers";

type Initial = {
  id: string;
  name: string;
  type: "PARTICULIER" | "PRO";
  vatNumber?: string | null;
  email?: string | null;
  phone?: string | null;
  street?: string | null;
  postalCode?: string | null;
  city?: string | null;
  notes?: string | null;
};

export function CustomerForm({ initial }: { initial?: Initial }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    type: initial?.type ?? "PARTICULIER",
    vatNumber: initial?.vatNumber ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    street: initial?.street ?? "",
    postalCode: initial?.postalCode ?? "",
    city: initial?.city ?? "",
    notes: initial?.notes ?? ""
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Nom obligatoire");
      return;
    }
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.set(k, v));
    start(async () => {
      try {
        if (initial) {
          await updateCustomer(initial.id, fd);
          toast.success("Client mis à jour");
        } else {
          const r = await createCustomer(fd);
          toast.success("Client créé");
          router.push(`/clients/${r.id}`);
        }
      } catch (e: any) {
        toast.error(e?.message ?? "Erreur");
      }
    });
  }

  function remove() {
    if (!initial || !confirm("Supprimer ce client définitivement ?")) return;
    start(async () => {
      try {
        await deleteCustomer(initial.id);
        toast.success("Client supprimé");
        router.push("/clients");
      } catch (e: any) {
        toast.error(e?.message ?? "Erreur");
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label">Nom *</label>
        <input required value={form.name}
               onChange={(e) => setForm({ ...form, name: e.target.value })}
               className="input" />
      </div>
      <div>
        <label className="label">Type</label>
        <div className="flex gap-2">
          {(["PARTICULIER", "PRO"] as const).map((t) => (
            <button key={t} type="button"
              onClick={() => setForm({ ...form, type: t })}
              className={"flex-1 h-12 rounded-xl border-2 font-semibold transition-colors " +
                (form.type === t ? "bg-ink text-cream border-ink" : "bg-white text-ink border-cream-300")}>
              {t === "PRO" ? "Pro / société" : "Particulier"}
            </button>
          ))}
        </div>
      </div>
      {form.type === "PRO" && (
        <div>
          <label className="label">N° TVA</label>
          <input value={form.vatNumber}
                 onChange={(e) => setForm({ ...form, vatNumber: e.target.value })}
                 placeholder="BE0123.456.789"
                 className="input" />
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Téléphone</label>
          <input type="tel" value={form.phone}
                 onChange={(e) => setForm({ ...form, phone: e.target.value })}
                 className="input" />
        </div>
        <div>
          <label className="label">Email</label>
          <input type="email" value={form.email}
                 onChange={(e) => setForm({ ...form, email: e.target.value })}
                 className="input" />
        </div>
      </div>
      <div>
        <label className="label">Adresse</label>
        <input value={form.street} placeholder="Rue + numéro"
               onChange={(e) => setForm({ ...form, street: e.target.value })}
               className="input mb-2" />
        <div className="grid grid-cols-3 gap-2">
          <input value={form.postalCode} placeholder="Code postal"
                 onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                 className="input" />
          <input value={form.city} placeholder="Ville"
                 onChange={(e) => setForm({ ...form, city: e.target.value })}
                 className="input col-span-2" />
        </div>
      </div>
      <div>
        <label className="label">Notes</label>
        <textarea value={form.notes} rows={3}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="input min-h-[80px]" />
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
