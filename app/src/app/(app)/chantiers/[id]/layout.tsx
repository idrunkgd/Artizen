import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Calendar } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireOrganization } from "@/lib/session";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ChantierSubNav } from "./sub-nav";

export const dynamic = "force-dynamic";

export default async function ChantierLayout({
  children, params
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const { organizationId } = await requireOrganization();
  const project = await prisma.project.findFirst({
    where: { id: params.id, organizationId },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      customerAddress: { select: { label: true, street: true, postalCode: true, city: true } },
      _count: {
        select: { quotes: true, invoices: true, photos: true, timesheet: true, materialOrders: true }
      }
    }
  });
  if (!project) notFound();

  const displayAddress = project.customerAddress
    ? {
        label: project.customerAddress.label,
        street: project.customerAddress.street,
        postalCode: project.customerAddress.postalCode,
        city: project.customerAddress.city
      }
    : (project.siteStreet || project.siteCity)
      ? { label: null, street: project.siteStreet, postalCode: project.sitePostalCode, city: project.siteCity }
      : null;

  return (
    <div className="pb-6">
      {/* Header sticky avec infos chantier */}
      <div className="bg-ink text-cream px-4 md:px-8 py-4 sticky top-0 md:top-0 z-10">
        <div className="max-w-4xl mx-auto">
          <Link href="/chantiers" className="text-xs text-cream/60 hover:text-gold inline-flex items-center gap-1 mb-1">
            <ArrowLeft className="w-3 h-3" /> Tous les chantiers
          </Link>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-bold leading-tight truncate">{project.name}</h1>
              <p className="text-xs text-cream/60 mt-0.5">{project.reference}</p>
            </div>
            <StatusBadge status={project.status} />
          </div>
          {/* Infos compactes */}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-cream/80">
            {project.customer && (
              <Link href={`/clients/${project.customer.id}`} className="hover:text-gold">
                👤 {project.customer.name}
              </Link>
            )}
            {displayAddress && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {displayAddress.label ? `${displayAddress.label} · ` : ""}
                {displayAddress.postalCode} {displayAddress.city}
              </span>
            )}
            {project.budgetEstimate && (
              <span>💰 {formatCurrency(Number(project.budgetEstimate))}</span>
            )}
          </div>
        </div>
      </div>

      {/* Sub-nav onglets */}
      <ChantierSubNav
        projectId={project.id}
        counts={{
          quotes: project._count.quotes,
          invoices: project._count.invoices,
          photos: project._count.photos,
          timesheet: project._count.timesheet,
          orders: project._count.materialOrders
        }}
      />

      {/* Contenu de la sous-page */}
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-4">
        {children}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    PROSPECT:  { label: "Prospect",  cls: "bg-cream/20 text-cream" },
    ACTIVE:    { label: "En cours",  cls: "bg-gold text-ink" },
    ON_HOLD:   { label: "En pause",  cls: "bg-amber-500 text-ink" },
    DONE:      { label: "Terminé",   cls: "bg-emerald-500 text-white" },
    CANCELLED: { label: "Annulé",    cls: "bg-cream/20 text-cream" }
  };
  const c = map[status] ?? { label: status, cls: "bg-cream/20 text-cream" };
  return <span className={"shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold " + c.cls}>{c.label}</span>;
}
