import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireOrganization } from "@/lib/session";
import { prisma } from "@/lib/db";
import { CustomerForm } from "../customer-form";
import { AddressesEditor } from "../addresses-editor";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const { organizationId } = await requireOrganization();
  const customer = await prisma.customer.findFirst({
    where: { id: params.id, organizationId },
    include: {
      projects: { orderBy: { updatedAt: "desc" } },
      addresses: {
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        include: { _count: { select: { projects: true, quotes: true } } }
      }
    }
  });
  if (!customer) notFound();

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <Link href="/clients" className="text-sm text-ink-300 hover:text-ink inline-flex items-center gap-1 mb-3">
        <ArrowLeft className="w-4 h-4" /> Retour aux clients
      </Link>
      <h1 className="text-2xl font-bold mb-4">{customer.name}</h1>
      <div className="card p-5 mb-4">
        <CustomerForm initial={customer as any} />
      </div>

      <div className="mb-4">
        <AddressesEditor customerId={customer.id} addresses={customer.addresses as any} />
      </div>

      {customer.projects.length > 0 && (
        <section>
          <h2 className="font-semibold text-lg mb-2">Ses chantiers</h2>
          <ul className="space-y-2">
            {customer.projects.map((p) => (
              <Link key={p.id} href={`/chantiers/${p.id}`} className="block card p-3 hover:shadow-lift">
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-ink-300">{p.reference}</div>
              </Link>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
