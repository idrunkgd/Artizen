import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireOrganization } from "@/lib/session";
import { prisma } from "@/lib/db";
import { OrderHeaderForm } from "../order-form";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { organizationId } = await requireOrganization();
  const [suppliers, projects] = await Promise.all([
    prisma.supplier.findMany({ where: { organizationId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.project.findMany({ where: { organizationId, status: { in: ["ACTIVE", "PROSPECT"] } }, orderBy: { name: "asc" }, select: { id: true, name: true, reference: true } })
  ]);
  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <Link href="/commandes" className="text-sm text-ink-300 inline-flex items-center gap-1 mb-3"><ArrowLeft className="w-4 h-4" /> Retour</Link>
      <h1 className="text-2xl font-bold mb-4">Nouvelle commande</h1>
      <div className="card p-5"><OrderHeaderForm suppliers={suppliers} projects={projects} /></div>
    </div>
  );
}
