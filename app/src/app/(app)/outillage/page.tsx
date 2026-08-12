import Link from "next/link";
import { requireOrganization } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Plus, Wrench, MapPin } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { organizationId } = await requireOrganization();
  const tools = await prisma.tool.findMany({ where: { organizationId }, orderBy: { name: "asc" } });
  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <header className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold">Outillage</h1>
          <p className="text-ink-300 text-sm">{tools.length} outil(s)</p>
        </div>
        <Link href="/outillage/new" className="btn-gold"><Plus className="w-5 h-5" /> Nouveau</Link>
      </header>
      {tools.length === 0 ? (
        <div className="card p-8 text-center">
          <Wrench className="w-12 h-12 text-ink-300 mx-auto mb-3" />
          <p className="text-ink-300 mb-4">Pas d'outillage inventorié.</p>
          <Link href="/outillage/new" className="btn-gold"><Plus className="w-5 h-5" /> Ajouter</Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {tools.map((t) => (
            <Link key={t.id} href={`/outillage/${t.id}`} className="block card p-4 hover:shadow-lift">
              <div className="font-semibold">{t.name}</div>
              <div className="text-sm text-ink-300">{[t.brand, t.serialNumber].filter(Boolean).join(" · ")}</div>
              {t.location && <div className="text-xs text-ink-300 mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> {t.location}</div>}
              {t.purchasePrice && <div className="text-xs text-ink-300 mt-0.5">Acheté {formatCurrency(Number(t.purchasePrice))}{t.purchaseDate && ` le ${formatDate(t.purchaseDate)}`}</div>}
            </Link>
          ))}
        </ul>
      )}
    </div>
  );
}
