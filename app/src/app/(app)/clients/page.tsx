import Link from "next/link";
import { requireOrganization } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Plus, Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const { organizationId } = await requireOrganization();
  const customers = await prisma.customer.findMany({
    where: { organizationId },
    orderBy: { name: "asc" }
  });

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <header className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-ink">Clients</h1>
          <p className="text-ink-300 text-sm mt-0.5">{customers.length} client(s)</p>
        </div>
        <Link href="/clients/new" className="btn-gold">
          <Plus className="w-5 h-5" /> Nouveau
        </Link>
      </header>

      {customers.length === 0 ? (
        <div className="card p-8 text-center">
          <Users className="w-12 h-12 text-ink-300 mx-auto mb-3" />
          <p className="text-ink-300 mb-4">Aucun client pour l'instant.</p>
          <Link href="/clients/new" className="btn-gold">
            <Plus className="w-5 h-5" /> Créer mon premier client
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {customers.map((c) => (
            <Link key={c.id} href={`/clients/${c.id}`} className="block card p-4 hover:shadow-lift transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-ink">{c.name}</div>
                  <div className="text-sm text-ink-300">
                    {c.type === "PRO" ? "Professionnel" : "Particulier"}
                    {c.city && ` · ${c.city}`}
                    {c.phone && ` · ${c.phone}`}
                  </div>
                </div>
                <span className={c.type === "PRO" ? "badge-gold" : "badge-ink"}>
                  {c.type === "PRO" ? "Pro" : "Particulier"}
                </span>
              </div>
            </Link>
          ))}
        </ul>
      )}
    </div>
  );
}
