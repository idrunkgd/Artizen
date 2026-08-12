import Link from "next/link";
import { requireOrganization } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Plus, Hammer, MapPin } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ChantiersPage() {
  const { organizationId } = await requireOrganization();
  const projects = await prisma.project.findMany({
    where: { organizationId },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    include: {
      customer: { select: { name: true } },
      photos: { take: 1, orderBy: { takenAt: "desc" }, select: { id: true } },
      _count: { select: { photos: true } }
    }
  });

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <header className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-ink">Chantiers</h1>
          <p className="text-ink-300 text-sm mt-0.5">{projects.length} chantier(s)</p>
        </div>
        <Link href="/chantiers/new" className="btn-gold">
          <Plus className="w-5 h-5" /> Nouveau
        </Link>
      </header>
      {projects.length === 0 ? (
        <div className="card p-8 text-center">
          <Hammer className="w-12 h-12 text-ink-300 mx-auto mb-3" />
          <p className="text-ink-300 mb-4">Aucun chantier pour l'instant.</p>
          <Link href="/chantiers/new" className="btn-gold">
            <Plus className="w-5 h-5" /> Créer mon premier chantier
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => {
            const coverPhoto = p.photos[0];
            return (
              <Link key={p.id} href={`/chantiers/${p.id}`} className="card overflow-hidden hover:shadow-lift transition-shadow">
                {coverPhoto ? (
                  <img src={`/api/photos/${coverPhoto.id}`} alt="" className="w-full h-40 object-cover" />
                ) : (
                  <div className="w-full h-40 bg-gradient-to-br from-ink to-ink-700 flex items-center justify-center">
                    <Hammer className="w-12 h-12 text-gold" />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h2 className="font-semibold text-ink leading-tight">{p.name}</h2>
                    <StatusBadge status={p.status} />
                  </div>
                  <div className="text-sm text-ink-300">{p.customer?.name ?? "Sans client"}</div>
                  {(p.siteCity || p.sitePostalCode) && (
                    <div className="text-xs text-ink-300 mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {p.sitePostalCode} {p.siteCity}
                    </div>
                  )}
                  <div className="text-xs text-ink-300 mt-2 pt-2 border-t border-cream-300">
                    {p.reference} · {p._count.photos} photo{p._count.photos > 1 ? "s" : ""}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    PROSPECT:  { label: "Prospect",  cls: "badge-ink" },
    ACTIVE:    { label: "En cours",  cls: "badge-gold" },
    ON_HOLD:   { label: "En pause",  cls: "badge-warning" },
    DONE:      { label: "Terminé",   cls: "badge-success" },
    CANCELLED: { label: "Annulé",    cls: "badge-danger" }
  };
  const c = map[status] ?? { label: status, cls: "badge-ink" };
  return <span className={c.cls}>{c.label}</span>;
}
