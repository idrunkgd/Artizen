import { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { prisma } from "@/lib/db";
import { requireOrganization } from "@/lib/session";
import { QuotePdf, type QuotePdfData } from "@/lib/quote-pdf";

// On réutilise le template QuotePdf en lui passant les données d'une facture.
// C'est le même rendu visuel (Émetteur/Client/Lignes/Totaux), juste avec
// "FACTURE" au lieu de "DEVIS" en titre.
// Pour différencier, on injecte un override dans data.

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { organizationId } = await requireOrganization();
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return new Response("Missing id", { status: 400 });

  const inv = await prisma.invoice.findFirst({
    where: { id, organizationId },
    include: { organization: true, customer: true, project: true, lines: { orderBy: { position: "asc" } } }
  });
  if (!inv) return new Response("Not found", { status: 404 });

  // Le template Quote attend la même structure ; on mappe inv → QuotePdfData.
  const data: QuotePdfData = {
    reference: inv.reference,
    title: inv.title,
    description: inv.notes,
    status: inv.status,
    vatRate: Number(inv.vatRate),
    totalHt: Number(inv.totalHt),
    totalTvac: Number(inv.totalTvac),
    validityDays: 0,
    sentAt: inv.issueDate,
    acceptedAt: inv.paidAt,
    notes: inv.dueDate ? `À régler avant le ${new Intl.DateTimeFormat("fr-BE", { dateStyle: "long" }).format(inv.dueDate)}.` : null,
    org: {
      name: inv.organization.name, vatNumber: inv.organization.vatNumber,
      street: inv.organization.street, postalCode: inv.organization.postalCode,
      city: inv.organization.city, country: inv.organization.country,
      phone: inv.organization.phone, email: inv.organization.email,
      iban: inv.organization.iban, logoUrl: inv.organization.logoUrl,
      paymentTermsDays: inv.organization.paymentTermsDays
    },
    customer: {
      name: inv.customer.name, type: inv.customer.type, vatNumber: inv.customer.vatNumber,
      email: inv.customer.email, phone: inv.customer.phone,
      street: inv.customer.street, postalCode: inv.customer.postalCode, city: inv.customer.city
    },
    project: inv.project ? { name: inv.project.name, reference: inv.project.reference } : null,
    lines: inv.lines.map((l) => ({
      description: l.description, quantity: Number(l.quantity), unit: l.unit,
      unitPrice: Number(l.unitPrice), totalHt: Number(l.totalHt), category: ""
    })),
    milestones: []
  };

  // On passe un flag isInvoice via React.createElement props pour différencier le titre.
  const buffer = await renderToBuffer(React.createElement(QuotePdf, { data, isInvoice: true } as any));
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Facture-${inv.reference}.pdf"`
    }
  });
}
