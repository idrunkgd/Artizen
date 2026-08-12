import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireOrganization } from "@/lib/session";
import { prisma } from "@/lib/db";
import { QuoteHeaderForm } from "../quote-header-form";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams
}: {
  searchParams: { customerId?: string; customerAddressId?: string };
}) {
  const { organizationId } = await requireOrganization();
  const customers = await prisma.customer.findMany({
    where: { organizationId }, orderBy: { name: "asc" },
    select: {
      id: true, name: true,
      addresses: {
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        select: { id: true, label: true, street: true, postalCode: true, city: true, isPrimary: true }
      }
    }
  });
  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <Link href="/devis" className="text-sm text-ink-300 inline-flex items-center gap-1 mb-3"><ArrowLeft className="w-4 h-4" /> Retour aux devis</Link>
      <h1 className="text-2xl font-bold mb-4">Nouveau devis</h1>
      <div className="card p-5">
        <QuoteHeaderForm
          customers={customers}
          prefill={{
            customerId: searchParams.customerId,
            customerAddressId: searchParams.customerAddressId
          }}
        />
      </div>
    </div>
  );
}
