import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireOrganization } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { organizationId } = await requireOrganization();
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });
  const project = await prisma.project.findFirst({
    where: { id, organizationId },
    select: { id: true, reference: true, name: true }
  });
  if (!project) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(project);
}
