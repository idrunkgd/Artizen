import { NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { prisma } from "@/lib/db";
import { requireOrganization } from "@/lib/session";

const STORAGE_ROOT = process.env.UPLOAD_STORAGE_PATH || "/data/photos";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { organizationId } = await requireOrganization();
  const photo = await prisma.sitePhoto.findUnique({
    where: { id: params.id },
    include: { project: { select: { organizationId: true } } }
  });
  if (!photo || photo.project.organizationId !== organizationId) {
    return new Response("Not found", { status: 404 });
  }
  try {
    const buffer = await fs.readFile(path.join(STORAGE_ROOT, photo.storagePath));
    const ext = photo.storagePath.split(".").pop()?.toLowerCase();
    const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
    return new Response(buffer, {
      headers: { "Content-Type": mime, "Cache-Control": "private, max-age=3600" }
    });
  } catch {
    return new Response("File missing", { status: 404 });
  }
}
