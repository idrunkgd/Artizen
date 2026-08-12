/**
 * Envoi d'email avec Resend.
 *
 * Si RESEND_API_KEY n'est pas définie, l'envoi est NO-OP et retourne
 * `{ ok: false, reason: "no-api-key" }` — l'UI affichera alors une
 * solution de repli (mailto:) plutôt que de lever une erreur.
 *
 * Adresse d'expédition :
 *  - RESEND_FROM_EMAIL si défini (ex. "Artisan <commande@ton-domaine.be>")
 *  - sinon "onboarding@resend.dev" (compte de test Resend, fonctionnel
 *    pour les boîtes mail des destinataires que tu as ajoutées dans la
 *    sandbox — pas pour de vrais clients).
 */
import { Resend } from "resend";

export type EmailAttachment = {
  filename: string;
  content: Buffer | Uint8Array;
};

export type SendEmailResult =
  | { ok: true; id: string }
  | { ok: false; reason: "no-api-key" | "send-failed"; error?: string };

const FROM_FALLBACK = "Artizen <onboarding@resend.dev>";

export async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
}): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, reason: "no-api-key" };
  }
  const resend = new Resend(apiKey);
  const from = process.env.RESEND_FROM_EMAIL || FROM_FALLBACK;
  try {
    const res = await resend.emails.send({
      from,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
      replyTo: opts.replyTo,
      attachments: opts.attachments?.map((a) => ({
        filename: a.filename,
        content: Buffer.from(a.content).toString("base64")
      }))
    });
    if (res.error) {
      return { ok: false, reason: "send-failed", error: String(res.error?.message ?? res.error) };
    }
    return { ok: true, id: res.data?.id ?? "" };
  } catch (e: any) {
    return { ok: false, reason: "send-failed", error: String(e?.message ?? e) };
  }
}
