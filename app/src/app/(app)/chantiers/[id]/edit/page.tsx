import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireOrganization } from "@/lib/session";
import { ProjectForm } from "../../project-form";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: { id: string } }) {
  const { organizationId } = await requireOrganization();
  const [project, customers] = await Promise.all([
    prisma.project.findFirst({ where: { id: params.id, organizationId } }),
    prisma.customer.findMany({
      where: { organizationId }, orderBy: { name: "asc" },
      select: {
        id: true, name: true,
        addresses: {
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
          select: { id: true, label: true, street: true, postalCode: true, city: true, isPrimary: true }
        }
      }
    })
  ]);
  if (!project) notFound();
  return (
    <div className="card p-5">
      <ProjectForm initial={project as any} customers={customers} />
    </div>
  );
}
