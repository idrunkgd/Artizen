import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireOrganization } from "@/lib/session";
import { OrgForm } from "./org-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { organizationId } = await requireOrganization();
  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <Link href="/dashboard" className="text-sm text-ink-300 hover:text-ink inline-flex items-center gap-1 mb-3">
        <ArrowLeft className="w-4 h-4" /> Retour à l'accueil
      </Link>
      <h1 className="text-2xl font-bold mb-1">Ma boîte</h1>
      <p className="text-ink-300 text-sm mb-5">
        Ces infos apparaissent sur tes devis et tes factures. Prends 2 minutes pour bien les remplir au début.
      </p>
      <div className="card p-5">
        <OrgForm initial={org as any} />
      </div>
    </div>
  );
}
