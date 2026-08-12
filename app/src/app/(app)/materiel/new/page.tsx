import { requireOrganization } from "@/lib/session";
import { prisma } from "@/lib/db";
import { MaterialForm } from "../material-form";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { organizationId } = await requireOrganization();
  const suppliers = await prisma.supplier.findMany({
    where: { organizationId }, orderBy: { name: "asc" }, select: { id: true, name: true }
  });
  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Nouveau matériel</h1>
      <div className="card p-5"><MaterialForm suppliers={suppliers} /></div>
    </div>
  );
}
