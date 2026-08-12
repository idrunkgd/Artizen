"use client";
import { useState } from "react";
import { Eye, Download, X, ExternalLink } from "lucide-react";

/**
 * Boutons PDF réutilisables : "Aperçu" ouvre une modale avec la prévisualisation
 * intégrée (iframe), sans forcer le téléchargement ; "Télécharger" enregistre le
 * fichier. La route PDF est servie en `inline`, donc l'iframe l'affiche directement.
 */
export function PdfPreviewButton({
  url, filename, label = "Aperçu"
}: { url: string; filename: string; label?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-primary">
        <Eye className="w-5 h-5" /> {label}
      </button>
      <a href={url} download={filename} className="btn-secondary">
        <Download className="w-5 h-5" /> Télécharger
      </a>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col p-2 sm:p-4" onClick={() => setOpen(false)}>
          <div className="flex items-center justify-between gap-2 mb-2 text-cream" onClick={(e) => e.stopPropagation()}>
            <span className="font-semibold text-sm truncate">{filename}</span>
            <div className="flex items-center gap-1">
              <a href={url} target="_blank" rel="noreferrer"
                 className="p-2 rounded-lg hover:bg-white/10 inline-flex items-center gap-1 text-xs">
                <ExternalLink className="w-4 h-4" /> Onglet
              </a>
              <a href={url} download={filename}
                 className="p-2 rounded-lg hover:bg-white/10 inline-flex items-center gap-1 text-xs">
                <Download className="w-4 h-4" /> Télécharger
              </a>
              <button type="button" onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex-1 bg-white rounded-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <iframe src={url} className="w-full h-full border-0" title={filename} />
          </div>
        </div>
      )}
    </>
  );
}
