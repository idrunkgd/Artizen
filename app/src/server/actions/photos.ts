"use server";
import { revalidatePath } from "next/cache";
import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireOrganization } from "@/lib/session";

const STORAGE_ROOT = process.env.UPLOAD_STORAGE_PATH || "/data/photos";

const UploadSchema = z.object({
  projectId: z.string().min(1),
  caption: z.string().optional().nullable(),
  /// data URI : "data:image/jpeg;base64,..."
  dataUri: z.string().min(50)
});

export async function uploadSitePhoto(input: z.infer<typeof UploadSchema>) {
  const { session, organizationId } = await requireOrganization();
  const data = UploadSchema.parse(input);

  // Vérif appartenance multi-tenant
  const project = await prisma.project.findFirst({
    where: { id: data.projectId, organizationId }
  });
  if (!project) throw new Error("Chantier introuvable");

  // Décode data URI
  const m = data.dataUri.match(/^data:(image\/(jpeg|png|webp));base64,(.+)$/);
  if (!m) throw new Error("Format image non supporté (JPEG, PNG, WebP)");
  const mediaType = m[1];
  const ext = m[2] === "jpeg" ? "jpg" : m[2];
  const base64 = m[3];
  const buffer = Buffer.from(base64, "base64");

  if (buffer.length > 12 * 1024 * 1024) {
    throw new Error("Photo trop lourde (>12 Mo)");
  }

  // Crée d'abord l'entrée DB pour avoir l'id, puis écrit le fichier
  const photo = await prisma.sitePhoto.create({
    data: {
      projectId: project.id,
      storagePath: "", // sera défini après écriture
      caption: data.caption?.trim() || null,
      uploadedById: session.user.id as string
    }
  });
  const relPath = `${photo.id}/photo.${ext}`;
  const fullPath = path.join(STORAGE_ROOT, relPath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, buffer);
  await prisma.sitePhoto.update({
    where: { id: photo.id },
    data: { storagePath: relPath }
  });

  revalidatePath(`/chantiers/${project.id}`);
  return { ok: true, photoId: photo.id };
}

export async function deleteSitePhoto(photoId: string) {
  const { organizationId } = await requireOrganization();
  const photo = await prisma.sitePhoto.findUnique({
    where: { id: photoId },
    include: { project: true }
  });
  if (!photo || photo.project.organizationId !== organizationId) {
    throw new Error("Photo introuvable");
  }
  // Soft delete des fichiers : on tente la suppression mais on n'erreur pas si absent
  try {
    await fs.unlink(path.join(STORAGE_ROOT, photo.storagePath));
  } catch { /* fichier déjà supprimé, OK */ }
  await prisma.sitePhoto.delete({ where: { id: photoId } });
  revalidatePath(`/chantiers/${photo.projectId}`);
  return { ok: true };
}
