"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Trash2, X } from "lucide-react";
import { deleteSitePhoto } from "@/server/actions/photos";

type Photo = {
  id: string;
  caption: string | null;
  takenAt: Date;
};

export function PhotoGallery({ photos }: { photos: Photo[] }) {
  const [pending, start] = useTransition();
  const [lightbox, setLightbox] = useState<string | null>(null);

  function remove(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Supprimer cette photo ?")) return;
    start(async () => {
      try {
        await deleteSitePhoto(id);
        toast.success("Photo supprimée");
      } catch (err: any) {
        toast.error(err?.message ?? "Erreur");
      }
    });
  }

  if (photos.length === 0) {
    return <p className="text-center text-ink-300 py-6 text-sm">Aucune photo encore. Prends-en une 👆</p>;
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {photos.map((p) => (
          <div
            key={p.id}
            onClick={() => setLightbox(p.id)}
            className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group"
          >
            <img src={`/api/photos/${p.id}`} alt={p.caption ?? ""} className="w-full h-full object-cover" />
            {p.caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1.5 truncate">
                {p.caption}
              </div>
            )}
            <button
              onClick={(e) => remove(p.id, e)}
              disabled={pending}
              className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center"
              aria-label="Supprimer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 grid place-items-center p-4" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white p-2" onClick={() => setLightbox(null)}>
            <X className="w-6 h-6" />
          </button>
          <img src={`/api/photos/${lightbox}`} alt="" className="max-w-full max-h-full object-contain" />
        </div>
      )}
    </>
  );
}
