import Link from "next/link";
import { Tag, Truck, EyeOff } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireOrganization } from "@/lib/session";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Page globale du catalogue d'articles (tous fournisseurs confondus).
 *
 * Lecture seule : la CRUD se fait depuis la fiche fournisseur (l'ergonomie
 * d'encoder « tout ce que je commande chez X » au même endroit est plus
 * naturelle). Ici on offre la recherche transverse et un panorama.
 *
 * Le filtre se passe en query string (?q=...&fournisseur=ID) pour rester
 * partageable et bookmarkable.
 */
export default async function Page({
  searchParams
}: {
  searchParams: { q?: string; fournisseur?: string };
}) {
  const { organizationId } = await requireOrganization();
  const query = (searchParams.q ?? "").trim();
  const supplierFilter = searchParams.fournisseur ?? "";

  const ic = (s: string) => ({ contains: s, mode: "insensitive" as const });

  const [items, suppliers] = await Promise.all([
    prisma.catalogItem.findMany({
      where: {
        organizationId,
        ...(supplierFilter ? { supplierId: supplierFilter } : {}),
        ...(query
          ? {
              OR: [
                { reference: ic(query) },
                { label: ic(query) },
                { supplier: { name: ic(query) } }
              ]
            }
          : {})
      },
      include: { supplier: { select: { id: true, name: true } } },
      orderBy: [{ isActive: "desc" }, { supplier: { name: "asc" } }, { label: "asc" }],
      take: 300
    }),
    prisma.supplier.findMany({
      where: { organizationId },
      select: { id: true, name: true, _count: { select: { catalogItems: true } } },
      orderBy: { name: "asc" }
    })
  ]);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <header className="mb-5">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Tag className="w-6 h-6" /> Catalogue
        </h1>
        <p className="text-sm text-ink-300 mt-1">
          Tous les articles habituellement commandés chez tes fournisseurs.
          La gestion (ajout/modif) se fait depuis la fiche d'un fournisseur.
        </p>
      </header>

      {/* Filtres en GET — pas besoin de JS, c'est du form classique */}
      <form className="card p-4 mb-5 flex flex-col md:flex-row gap-3 items-end">
        <div className="flex-1">
          <label className="label">Recherche (référence, libellé, fournisseur)</label>
          <input name="q" defaultValue={query} placeholder="ex. PVC, Würth, vis 3.5..." className="input" />
        </div>
        <div className="md:w-72">
          <label className="label">Fournisseur</label>
          <select name="fournisseur" defaultValue={supplierFilter} className="input">
            <option value="">Tous</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s._count.catalogItems})
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-gold md:w-auto">Filtrer</button>
      </form>

      <p className="text-xs text-ink-300 mb-3">
        {items.length} article{items.length > 1 ? "s" : ""}
        {query && ` correspondant à « ${query} »`}
      </p>

      {items.length === 0 ? (
        <div className="card p-8 text-center">
          <Tag className="w-12 h-12 text-ink-300 mx-auto mb-3" />
          <p className="text-ink-300 mb-3">Aucun article au catalogue.</p>
          <Link href="/fournisseurs" className="btn-gold inline-flex">Voir mes fournisseurs</Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ink text-cream text-xs uppercase">
              <tr>
                <th className="text-left px-3 py-2">Référence</th>
                <th className="text-left px-3 py-2">Désignation</th>
                <th className="text-left px-3 py-2">Fournisseur</th>
                <th className="text-right px-3 py-2">Prix HT</th>
                <th className="text-center px-3 py-2">TVA</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className={"border-b border-cream-300 last:border-0 " + (it.isActive ? "" : "opacity-50")}>
                  <td className="px-3 py-2 font-mono text-xs">{it.reference}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span>{it.label}</span>
                      {!it.isActive && (
                        <span className="text-[10px] text-ink-300 inline-flex items-center gap-1">
                          <EyeOff className="w-3 h-3" /> inactif
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <Link href={`/fournisseurs/${it.supplier.id}`} className="text-gold-700 hover:underline inline-flex items-center gap-1">
                      <Truck className="w-3 h-3" /> {it.supplier.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatCurrency(Number(it.unitPriceHt))} / {it.unit}
                  </td>
                  <td className="px-3 py-2 text-center">{Number(it.vatRate)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
