import { requireOrganization } from "@/lib/session";
import { prisma } from "@/lib/db";
import { ProjectForm } from "../project-form";

export const dynamic = "force-dynamic";

export default async function NewChantierPage() {
  const { organizationId } = await requireOrganization();
  const customers = await prisma.customer.findMany({
    where: { organizationId },
    orderBy: { name: "asc" },
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
      <h1 className="text-2xl font-bold mb-4">Nouveau chantier</h1>
      <ProjectForm customers={customers} />
    </div>
  );
}
