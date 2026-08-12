import { prisma } from "@/lib/db";
import { requireOrganization } from "@/lib/session";
import { PhotoUploader } from "../photo-uploader";
import { PhotoGallery } from "../photo-gallery";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: { id: string } }) {
  const { organizationId } = await requireOrganization();
  const project = await prisma.project.findFirst({
    where: { id: params.id, organizationId },
    include: { photos: { orderBy: { takenAt: "desc" } } }
  });
  if (!project) return null;
  return (
    <div className="space-y-3">
      <PhotoUploader projectId={project.id} />
      <PhotoGallery photos={project.photos as any} />
    </div>
  );
}
