"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Send, Loader2, CheckCircle2, AlertTriangle, Mail } from "lucide-react";
import {
  generateMaterialOrdersFromProject,
  type OrderGenerationReport
} from "@/server/actions/material-orders";

/**
 * Bouton "Commander le matériel" + résumé du résultat (par fournisseur).
 *
 * Comportement :
 *  - Crée une commande DRAFT par fournisseur depuis les lignes de devis
 *    acceptées (catalogItemId non-null) non encore commandées.
 *  - Tente l'envoi email Resend pour chaque commande (PDF en pièce jointe).
 *  - Affiche un rapport ligne par ligne : envoyé / pas d'email fournisseur /
 *    Resend non configuré / erreur SMTP — chaque cas avec un fallback clair
 *    (lien mailto: avec sujet pré-rempli).
 */
export function GenerateOrdersButton({
  projectId, supplierCount, missingEmailCount
}: {
  projectId: string;
  supplierCount: number;
  missingEmailCount: number;
}) {
  const [pending, start] = useTransition();
  const [report, setReport] = useState<OrderGenerationReport[] | null>(null);
  const [emailNotConfigured, setEmailNotConfigured] = useState(false);

  function run() {
    const ok = confirm(
      `Créer ${supplierCount} bon${supplierCount > 1 ? "s" : ""} de commande` +
      ` et envoyer les emails aux fournisseurs ?` +
      (missingEmailCount > 0 ? `\n\n⚠ ${missingEmailCount} fournisseur(s) sans email : la commande sera créée mais devra être envoyée manuellement.` : "")
    );
    if (!ok) return;
    start(async () => {
      try {
        const res = await generateMaterialOrdersFromProject(projectId);
        setReport(res.reports);
        const sent = res.reports.filter((r) => r.emailSent).length;
        setEmailNotConfigured(res.reports.some((r) => r.emailNotConfigured));
        if (sent > 0) toast.success(`${sent} email${sent > 1 ? "s" : ""} envoyé${sent > 1 ? "s" : ""} aux fournisseurs`);
        else toast.success(`${res.reports.length} commande${res.reports.length > 1 ? "s" : ""} créée${res.reports.length > 1 ? "s" : ""}`);
      } catch (e: any) {
        toast.error(e?.message ?? "Erreur");
      }
    });
  }

  return (
    <div>
      <button onClick={run} disabled={pending} className="btn-gold w-full justify-center">
        {pending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        {pending ? "Création en cours..." : `Commander le matériel (${supplierCount} fournisseur${supplierCount > 1 ? "s" : ""})`}
      </button>

      {report && (
        <div className="mt-4 space-y-2">
          {emailNotConfigured && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
              <strong>Resend non configuré.</strong> Les bons de commande sont créés mais aucun email n'a été envoyé.
              Définis <code>RESEND_API_KEY</code> dans le fichier <code>.env</code> pour activer l'envoi automatique,
              ou utilise les liens « Envoyer manuellement » ci-dessous.
            </div>
          )}
          <h4 className="font-semibold text-sm">Résultat :</h4>
          <ul className="space-y-2">
            {report.map((r) => (
              <ReportRow key={r.orderId} r={r} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ReportRow({ r }: { r: OrderGenerationReport }) {
  const mailtoUrl = r.supplierEmail
    ? `mailto:${encodeURIComponent(r.supplierEmail)}` +
      `?subject=${encodeURIComponent(`Commande ${r.reference}`)}` +
      `&body=${encodeURIComponent(
        `Bonjour,\n\nVeuillez trouver en pièce jointe le bon de commande ${r.reference} (${r.lineCount} référence(s)).\n\nMerci de me confirmer la disponibilité.\n\nCordialement,`
      )}`
    : null;

  return (
    <li className="p-3 bg-cream-100 rounded-lg">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs px-1.5 py-0.5 bg-ink text-cream rounded">{r.reference}</span>
            <span className="font-semibold text-sm">{r.supplierName}</span>
          </div>
          <div className="text-xs text-ink-300 mt-0.5">
            {r.lineCount} ligne{r.lineCount > 1 ? "s" : ""} · {r.totalHt.toFixed(2)} € HT
          </div>
          {r.emailSent && (
            <div className="text-xs text-emerald-700 inline-flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3 h-3" /> Email envoyé à {r.supplierEmail}
            </div>
          )}
          {r.missingEmail && (
            <div className="text-xs text-amber-800 inline-flex items-center gap-1 mt-1">
              <AlertTriangle className="w-3 h-3" /> Pas d'email pour ce fournisseur — bon de commande créé, à envoyer manuellement
            </div>
          )}
          {r.emailError && !r.emailSent && (
            <div className="text-xs text-red-700 inline-flex items-center gap-1 mt-1">
              <AlertTriangle className="w-3 h-3" /> Erreur : {r.emailError}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1 items-end">
          <a
            href={`/api/material-order-pdf?id=${r.orderId}`}
            target="_blank" rel="noopener noreferrer"
            className="text-xs text-gold-700 hover:underline"
          >
            Télécharger PDF
          </a>
          {mailtoUrl && !r.emailSent && (
            <a href={mailtoUrl} className="text-xs text-gold-700 hover:underline inline-flex items-center gap-1">
              <Mail className="w-3 h-3" /> Envoyer manuellement
            </a>
          )}
        </div>
      </div>
    </li>
  );
}
