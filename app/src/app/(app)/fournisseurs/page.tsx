import Link from "next/link";
import { requireOrganization } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Plus, Truck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function FournisseursPage() {
  const { organizationId } = await requireOrganization();
  const suppliers = await prisma.supplier.findMany({
    where: { organizationId }, orderBy: { name: "asc" }
  });
  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <header className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold">Fournisseurs</h1>
          <p className="text-ink-300 text-sm">{suppliers.length} fournisseur(s)</p>
        </div>
        <Link href="/fournisseurs/new" className="btn-gold"><Plus className="w-5 h-5" /> Nouveau</Link>
      </header>
      {suppliers.length === 0 ? (
        <div className="card p-8 text-center">
          <Truck className="w-12 h-12 text-ink-300 mx-auto mb-3" />
          <p className="text-ink-300 mb-4">Aucun fournisseur enregistré.</p>
          <Link href="/fournisseurs/new" className="btn-gold"><Plus className="w-5 h-5" /> Ajouter</Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {suppliers.map((s) => (
            <Link key={s.id} href={`/fournisseurs/${s.id}`} className="block card p-4 hover:shadow-lift">
              <div className="font-semibold">{s.name}</div>
              <div className="text-sm text-ink-300">{[s.phone, s.email].filter(Boolean).join(" · ") || "—"}</div>
            </Link>
          ))}
        </ul>
      )}
    </div>
  );
}
