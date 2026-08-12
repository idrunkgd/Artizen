import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireOrganization } from "@/lib/session";
import { prisma } from "@/lib/db";
import { ToolForm } from "../tool-form";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: { id: string } }) {
  const { organizationId } = await requireOrganization();
  const tool = await prisma.tool.findFirst({ where: { id: params.id, organizationId } });
  if (!tool) notFound();
  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <Link href="/outillage" className="text-sm text-ink-300 inline-flex items-center gap-1 mb-3"><ArrowLeft className="w-4 h-4" /> Retour</Link>
      <h1 className="text-2xl font-bold mb-4">{tool.name}</h1>
      <div className="card p-5"><ToolForm initial={tool as any} /></div>
    </div>
  );
}
