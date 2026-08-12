import Link from "next/link";
import { ArrowLeft, Construction } from "lucide-react";

export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <Link href="/dashboard" className="text-sm text-ink-300 hover:text-ink inline-flex items-center gap-1 mb-3">
        <ArrowLeft className="w-4 h-4" /> Retour à l'accueil
      </Link>
      <div className="card p-8 text-center">
        <Construction className="w-16 h-16 text-gold mx-auto mb-3" />
        <h1 className="text-2xl font-bold mb-2">{title}</h1>
        <p className="text-ink-300 mb-4">{description}</p>
        <p className="text-xs text-ink-300">
          Le module est prévu et son schéma de données est déjà en place.
          La page web sera ajoutée bientôt.
        </p>
      </div>
    </div>
  );
}
