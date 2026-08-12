"use server";
/**
 * Génération automatique de commandes matériel depuis les devis acceptés
 * d'un chantier, + envoi par email au fournisseur (PDF attaché).
 *
 * Logique :
 *   1. Récupère toutes les QuoteLine des devis ACCEPTED du chantier
 *      qui ont un catalogItemId (= ligne "Référence exacte").
 *   2. Filtre les lignes déjà commandées (présentes dans une MaterialOrderLine
 *      via sourceQuoteLineId) — idempotent : on peut rejouer sans risque.
 *   3. Groupe par fournisseur, crée une MaterialOrder DRAFT par fournisseur.
 *   4. Pour chaque commande : génère un PDF, tente l'envoi email Resend.
 *
 * Le résultat est un rapport par fournisseur indiquant : created (bool),
 * orderId, lineCount, emailed (bool), emailError, et missingEmail (bool)
 * pour permettre à l'UI d'afficher des fallbacks (lien mailto:).
 */
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireOrganization } from "@/lib/session";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { MaterialOrderPdf, type MaterialOrderPdfData } from "@/lib/material-order-pdf-template";
import { sendEmail } from "@/lib/email";

async function nextOrderReference(organizationId: string) {
  const year = new Date().getFullYear();
  const prefix = `CMD-${year}-`;
  const last = await prisma.materialOrder.findFirst({
    where: { organizationId, reference: { startsWith: prefix } },
    orderBy: { reference: "desc" }, select: { reference: true }
  });
  const lastNum = last ? parseInt(last.reference.slice(prefix.length), 10) || 0 : 0;
  return `${prefix}${String(lastNum + 1).padStart(3, "0")}`;
}

export type OrderGenerationReport = {
  supplierId: string;
  supplierName: string;
  supplierEmail: string | null;
  orderId: string;
  reference: string;
  lineCount: number;
  totalHt: number;
  emailSent: boolean;
  emailError: string | null;
  /// True si on n'a pas pu envoyer car le fournisseur n'a pas d'email
  missingEmail: boolean;
  /// True si on n'a pas pu envoyer car Resend n'est pas configuré
  emailNotConfigured: boolean;
};

/**
 * Action principale : depuis la page chantier, l'utilisateur clique
 * "Commander le matériel" et toutes les commandes par fournisseur sont
 * générées + envoyées.
 */
export async function generateMaterialOrdersFromProject(
  projectId: string,
  opts?: { sendEmails?: boolean }
): Promise<{ reports: OrderGenerationReport[]; alreadyOrdered: number }> {
  const { organizationId } = await requireOrganization();
  const sendEmails = opts?.sendEmails !== false; // par défaut on envoie

  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId },
    include: {
      organization: true,
      customer: { select: { name: true } },
      customerAddress: true,
      quotes: {
        where: { status: "ACCEPTED" },
        include: {
          lines: {
            where: { catalogItemId: { not: null } },
            include: {
              catalogItem: {
                include: { supplier: true }
              }
            }
          }
        }
      }
    }
  });
  if (!project) throw new Error("Chantier introuvable");

  // 1. Toutes les QuoteLine avec catalogItem
  const allCandidateLines = project.quotes.flatMap((q) => q.lines);

  // 2. Filtrer celles déjà couvertes par une MaterialOrderLine
  const candidateIds = allCandidateLines.map((l) => l.id);
  const alreadyOrderedLineIds = new Set(
    candidateIds.length === 0
      ? []
      : (
          await prisma.materialOrderLine.findMany({
            where: { sourceQuoteLineId: { in: candidateIds } },
            select: { sourceQuoteLineId: true }
          })
        )
          .map((l) => l.sourceQuoteLineId)
          .filter(Boolean) as string[]
  );

  const newLines = allCandidateLines.filter((l) => !alreadyOrderedLineIds.has(l.id));

  if (newLines.length === 0) {
    return { reports: [], alreadyOrdered: alreadyOrderedLineIds.size };
  }

  // 3. Grouper par fournisseur. Une ligne sans catalogItem ou sans supplier
  //    serait filtrée silencieusement (ne devrait pas arriver vu le where).
  type Group = {
    supplier: NonNullable<NonNullable<(typeof newLines)[number]["catalogItem"]>>["supplier"];
    lines: typeof newLines;
  };
  const bySupplier = new Map<string, Group>();
  for (const l of newLines) {
    const sup = l.catalogItem?.supplier;
    if (!sup) continue;
    if (!bySupplier.has(sup.id)) bySupplier.set(sup.id, { supplier: sup, lines: [] });
    bySupplier.get(sup.id)!.lines.push(l);
  }

  const reports: OrderGenerationReport[] = [];

  for (const [supplierId, group] of bySupplier) {
    // 3a. Créer la MaterialOrder + lignes en transaction
    const reference = await nextOrderReference(organizationId);
    const totalHt = group.lines.reduce(
      (s, l) => s + Number(l.quantity) * Number(l.unitPrice),
      0
    );
    const order = await prisma.materialOrder.create({
      data: {
        organizationId,
        reference,
        supplierId,
        projectId,
        status: "DRAFT",
        totalHt,
        orderedAt: new Date(),
        notes: `Généré automatiquement depuis les devis acceptés du chantier ${project.reference}.`,
        lines: {
          create: group.lines.map((l, idx) => ({
            position: idx + 1,
            description: l.description,
            quantity: l.quantity,
            unit: l.unit,
            unitPrice: l.unitPrice,
            totalHt: Number(l.quantity) * Number(l.unitPrice),
            catalogItemId: l.catalogItemId,
            sourceQuoteLineId: l.id,
            reference: l.catalogItem?.reference ?? null
          }))
        }
      },
      include: { lines: true, supplier: true }
    });

    // 3b. Générer le PDF
    const addressLine = project.customerAddress
      ? [
          project.customerAddress.street,
          project.customerAddress.postalCode,
          project.customerAddress.city
        ]
          .filter(Boolean)
          .join(", ")
      : [project.siteStreet, project.sitePostalCode, project.siteCity]
          .filter(Boolean)
          .join(", ") || null;

    const pdfData: MaterialOrderPdfData = {
      reference: order.reference,
      orderedAt: order.orderedAt,
      expectedAt: order.expectedAt,
      notes: order.notes,
      totalHt: Number(order.totalHt),
      supplier: order.supplier
        ? {
            name: order.supplier.name,
            email: order.supplier.email,
            vatNumber: order.supplier.vatNumber
          }
        : null,
      project: {
        name: project.name,
        reference: project.reference,
        address: addressLine
      },
      organization: {
        name: project.organization.name,
        email: (project.organization as any).email ?? null,
        phone: (project.organization as any).phone ?? null,
        vatNumber: (project.organization as any).vatNumber ?? null,
        addressLine:
          [
            (project.organization as any).street,
            (project.organization as any).postalCode,
            (project.organization as any).city
          ]
            .filter(Boolean)
            .join(", ") || null
      },
      lines: order.lines.map((l) => ({
        reference: l.reference,
        description: l.description,
        quantity: Number(l.quantity),
        unit: l.unit,
        unitPrice: Number(l.unitPrice),
        totalHt: Number(l.totalHt)
      }))
    };

    const pdfBuffer = await renderToBuffer(
      React.createElement(MaterialOrderPdf, { data: pdfData })
    );

    // 3c. Envoyer l'email si possible
    let emailSent = false;
    let emailError: string | null = null;
    let missingEmail = false;
    let emailNotConfigured = false;

    if (!sendEmails) {
      // L'appelant a explicitement demandé "pas d'email" → on reste DRAFT
    } else if (!order.supplier?.email) {
      missingEmail = true;
    } else {
      const text = buildEmailText(order.reference, project.name, group.lines.length);
      const html = buildEmailHtml(order.reference, project.name, group.lines.length, project.organization.name);
      const send = await sendEmail({
        to: order.supplier.email,
        subject: `Commande ${order.reference} — ${project.name}`,
        text,
        html,
        replyTo: (project.organization as any).email ?? undefined,
        attachments: [
          { filename: `${order.reference}.pdf`, content: new Uint8Array(pdfBuffer) }
        ]
      });
      if (send.ok) {
        emailSent = true;
      } else if (send.reason === "no-api-key") {
        emailNotConfigured = true;
      } else {
        emailError = send.error ?? "Échec inconnu";
      }
    }

    // 3d. Mettre à jour le statut de la commande si email envoyé
    await prisma.materialOrder.update({
      where: { id: order.id },
      data: {
        status: emailSent ? "ORDERED" : order.status,
        emailedAt: emailSent ? new Date() : null,
        emailError
      }
    });

    reports.push({
      supplierId,
      supplierName: group.supplier.name,
      supplierEmail: group.supplier.email,
      orderId: order.id,
      reference: order.reference,
      lineCount: group.lines.length,
      totalHt: Number(order.totalHt),
      emailSent,
      emailError,
      missingEmail,
      emailNotConfigured
    });
  }

  revalidatePath(`/chantiers/${projectId}`);
  revalidatePath(`/chantiers/${projectId}/commandes`);
  revalidatePath("/commandes");
  return { reports, alreadyOrdered: alreadyOrderedLineIds.size };
}

function buildEmailText(ref: string, projectName: string, n: number) {
  return [
    `Bonjour,`,
    ``,
    `Veuillez trouver en pièce jointe le bon de commande ${ref} pour le chantier "${projectName}" (${n} référence(s)).`,
    ``,
    `Merci de me confirmer la disponibilité et la date de livraison souhaitée.`,
    ``,
    `Cordialement,`
  ].join("\n");
}
function buildEmailHtml(ref: string, projectName: string, n: number, orgName: string) {
  return `
    <div style="font-family: Helvetica, Arial, sans-serif; color: #0a0a0a;">
      <p>Bonjour,</p>
      <p>Veuillez trouver en pièce jointe le bon de commande <strong>${ref}</strong> pour le chantier
         <strong>${projectName}</strong> (${n} référence${n > 1 ? "s" : ""}).</p>
      <p>Merci de me confirmer la disponibilité et la date de livraison souhaitée.</p>
      <p>Cordialement,<br/>${orgName}</p>
    </div>
  `;
}

/**
 * Renvoie un email pour une commande déjà créée (cas mailto: ou
 * re-tentative manuelle après correction de l'email fournisseur).
 */
export async function resendMaterialOrderEmail(orderId: string) {
  const { organizationId } = await requireOrganization();
  const order = await prisma.materialOrder.findFirst({
    where: { id: orderId, organizationId },
    include: {
      lines: true,
      supplier: true,
      project: { include: { organization: true, customerAddress: true } }
    }
  });
  if (!order) throw new Error("Commande introuvable");
  if (!order.supplier?.email) throw new Error("Fournisseur sans email");
  if (!order.project) throw new Error("Commande sans chantier");

  const addressLine = order.project.customerAddress
    ? [
        order.project.customerAddress.street,
        order.project.customerAddress.postalCode,
        order.project.customerAddress.city
      ].filter(Boolean).join(", ")
    : [order.project.siteStreet, order.project.sitePostalCode, order.project.siteCity]
        .filter(Boolean).join(", ") || null;

  const pdfData: MaterialOrderPdfData = {
    reference: order.reference,
    orderedAt: order.orderedAt,
    expectedAt: order.expectedAt,
    notes: order.notes,
    totalHt: Number(order.totalHt),
    supplier: { name: order.supplier.name, email: order.supplier.email, vatNumber: order.supplier.vatNumber },
    project: { name: order.project.name, reference: order.project.reference, address: addressLine },
    organization: {
      name: order.project.organization.name,
      email: (order.project.organization as any).email ?? null,
      phone: (order.project.organization as any).phone ?? null,
      vatNumber: (order.project.organization as any).vatNumber ?? null,
      addressLine:
        [
          (order.project.organization as any).street,
          (order.project.organization as any).postalCode,
          (order.project.organization as any).city
        ].filter(Boolean).join(", ") || null
    },
    lines: order.lines.map((l) => ({
      reference: l.reference,
      description: l.description,
      quantity: Number(l.quantity),
      unit: l.unit,
      unitPrice: Number(l.unitPrice),
      totalHt: Number(l.totalHt)
    }))
  };
  const pdfBuffer = await renderToBuffer(React.createElement(MaterialOrderPdf, { data: pdfData }));

  const send = await sendEmail({
    to: order.supplier.email,
    subject: `Commande ${order.reference} — ${order.project.name}`,
    text: buildEmailText(order.reference, order.project.name, order.lines.length),
    html: buildEmailHtml(order.reference, order.project.name, order.lines.length, order.project.organization.name),
    replyTo: (order.project.organization as any).email ?? undefined,
    attachments: [{ filename: `${order.reference}.pdf`, content: new Uint8Array(pdfBuffer) }]
  });

  if (!send.ok) {
    await prisma.materialOrder.update({
      where: { id: order.id },
      data: { emailError: send.error ?? send.reason }
    });
    throw new Error(
      send.reason === "no-api-key"
        ? "Email non configuré (RESEND_API_KEY manquante)"
        : `Échec d'envoi : ${send.error}`
    );
  }

  await prisma.materialOrder.update({
    where: { id: order.id },
    data: { emailedAt: new Date(), emailError: null, status: "ORDERED" }
  });
  revalidatePath(`/commandes/${orderId}`);
  return { ok: true };
}

/**
 * Aperçu (sans création) : combien de lignes seraient générées et pour
 * quels fournisseurs. Utilisé pour afficher le préview avant clic.
 */
export async function previewMaterialOrdersFromProject(projectId: string) {
  const { organizationId } = await requireOrganization();
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId },
    include: {
      quotes: {
        where: { status: "ACCEPTED" },
        include: {
          lines: {
            where: { catalogItemId: { not: null } },
            include: { catalogItem: { include: { supplier: true } } }
          }
        }
      }
    }
  });
  if (!project) throw new Error("Chantier introuvable");

  const allLines = project.quotes.flatMap((q) => q.lines);
  const orderedIds = new Set(
    allLines.length === 0
      ? []
      : (
          await prisma.materialOrderLine.findMany({
            where: { sourceQuoteLineId: { in: allLines.map((l) => l.id) } },
            select: { sourceQuoteLineId: true }
          })
        ).map((l) => l.sourceQuoteLineId).filter(Boolean) as string[]
  );

  const newLines = allLines.filter((l) => !orderedIds.has(l.id));

  type PreviewGroup = {
    supplierId: string;
    supplierName: string;
    supplierEmail: string | null;
    lineCount: number;
    totalHt: number;
  };
  const map = new Map<string, PreviewGroup>();
  for (const l of newLines) {
    const sup = l.catalogItem?.supplier;
    if (!sup) continue;
    const g = map.get(sup.id) ?? {
      supplierId: sup.id, supplierName: sup.name, supplierEmail: sup.email,
      lineCount: 0, totalHt: 0
    };
    g.lineCount += 1;
    g.totalHt += Number(l.quantity) * Number(l.unitPrice);
    map.set(sup.id, g);
  }
  return {
    alreadyOrdered: orderedIds.size,
    pending: Array.from(map.values())
  };
}
