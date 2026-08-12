import { Eye, Download } from "lucide-react";

/**
 * Boutons PDF réutilisables : "Aperçu" ouvre le PDF dans un nouvel onglet
 * (la route est servie en `inline`, donc le navigateur l'affiche sans le
 * télécharger) ; "Télécharger" enregistre le fichier.
 */
export function PdfPreviewButton({
  url, filename, label = "Aperçu"
}: { url: string; filename: string; label?: string }) {
  return (
    <>
      <a href={url} target="_blank" rel="noreferrer" className="btn-primary">
        <Eye className="w-5 h-5" /> {label}
      </a>
      <a href={url} download={filename} className="btn-secondary">
        <Download className="w-5 h-5" /> Télécharger
      </a>
    </>
  );
}
