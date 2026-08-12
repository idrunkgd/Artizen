import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireOrganization } from "@/lib/session";
import { SupplierForm } from "../supplier-form";
import { SupplierCatalogSection } from "./catalog-section";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: { id: string } }) {
  const { organizationId } = await requireOrganization();
  const supplier = await prisma.supplier.findFirst({
    where: { id: params.id, organizationId },
    include: {
      catalogItems: { orderBy: [{ isActive: "desc" }, { label: "asc" }] }
    }
  });
  if (!supplier) notFound();

  // On sérialise les Decimal avant de passer au client component
  const items = supplier.catalogItems.map((i) => ({
    id: i.id,
    reference: i.reference,
    label: i.label,
    unit: i.unit,
    unitPriceHt: Number(i.unitPriceHt),
    vatRate: Number(i.vatRate),
    notes: i.notes,
    isActive: i.isActive
  }));

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <Link href="/fournisseurs" className="text-sm text-ink-300 inline-flex items-center gap-1 mb-3">
        <ArrowLeft className="w-4 h-4" /> Retour
      </Link>
      <h1 className="text-2xl font-bold mb-4">{supplier.name}</h1>

      <section className="mb-6">
        <h2 className="font-bold text-lg mb-3">Coordonnées</h2>
        <div className="card p-5"><SupplierForm initial={supplier as any} /></div>
      </section>

      <section>
        <h2 className="font-bold text-lg mb-3">Catalogue ({items.length})</h2>
        <p className="text-sm text-ink-300 mb-3">
          Articles habituellement commandés chez ce fournisseur. Utilisés dans
          les devis (ligne « Référence exacte ») et pour générer
          automatiquement les bons de commande à l'acceptation d'un devis.
        </p>
        <SupplierCatalogSection supplierId={supplier.id} items={items} />
      </section>
    </div>
  );
}
