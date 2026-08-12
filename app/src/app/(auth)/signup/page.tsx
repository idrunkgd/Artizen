"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { signupAction } from "@/server/auth/signup";

export default function SignupPage() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState({
    organizationName: "", firstName: "", lastName: "", email: "", password: ""
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.set(k, v));
      const r = await signupAction(fd);
      if (!r.ok) {
        toast.error(r.error);
        setPending(false);
        return;
      }
      // Auto-login après création
      const s = await signIn("credentials", {
        email: form.email, password: form.password, redirect: false
      });
      if (s?.error) {
        toast.error("Compte créé mais connexion échouée — réessaie via login");
        router.push("/login");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur");
      setPending(false);
    }
  }

  return (
    <div className="card p-6">
      <h2 className="text-xl font-bold mb-1">Crée ta boîte</h2>
      <p className="text-sm text-ink-300 mb-5">
        Ton compte patron sera créé, tu pourras inviter ton apprenti plus tard.
      </p>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Nom de ta boîte</label>
          <input required value={form.organizationName}
                 onChange={(e) => setForm({ ...form, organizationName: e.target.value })}
                 placeholder="Ex. Maçonnerie Dupont"
                 className="input" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Prénom</label>
            <input required value={form.firstName}
                   onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                   className="input" />
          </div>
          <div>
            <label className="label">Nom</label>
            <input required value={form.lastName}
                   onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                   className="input" />
          </div>
        </div>
        <div>
          <label className="label">Email</label>
          <input type="email" required autoComplete="email" value={form.email}
                 onChange={(e) => setForm({ ...form, email: e.target.value })}
                 className="input" />
        </div>
        <div>
          <label className="label">Mot de passe (8+ caractères)</label>
          <input type="password" required autoComplete="new-password" minLength={8}
                 value={form.password}
                 onChange={(e) => setForm({ ...form, password: e.target.value })}
                 className="input" />
        </div>
        <button type="submit" disabled={pending} className="btn-gold w-full btn-lg">
          {pending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Créer ma boîte"}
        </button>
      </form>
      <p className="text-center text-sm text-ink-300 mt-5">
        Déjà inscrit ?{" "}
        <Link href="/login" className="text-ink font-semibold underline">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
