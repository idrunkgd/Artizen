"use client";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const r = await signIn("credentials", { email, password, redirect: false });
    setPending(false);
    if (r?.error) {
      toast.error("Email ou mot de passe invalide");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="card p-6">
      <h2 className="text-xl font-bold mb-1">Connexion</h2>
      <p className="text-sm text-ink-300 mb-5">Accède à ton espace.</p>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" required autoComplete="email"
                 value={email} onChange={(e) => setEmail(e.target.value)}
                 className="input" />
        </div>
        <div>
          <label className="label" htmlFor="password">Mot de passe</label>
          <input id="password" type="password" required autoComplete="current-password"
                 value={password} onChange={(e) => setPassword(e.target.value)}
                 className="input" />
        </div>
        <button type="submit" disabled={pending} className="btn-gold w-full btn-lg">
          {pending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Se connecter"}
        </button>
      </form>
      <p className="text-center text-sm text-ink-300 mt-5">
        Pas encore de compte ?{" "}
        <Link href="/signup" className="text-ink font-semibold underline">
          Crée ta boîte
        </Link>
      </p>
    </div>
  );
}
