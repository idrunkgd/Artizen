import { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { prisma } from "@/lib/db";
import { requireOrganization } from "@/lib/session";
import { QuotePdf, type QuotePdfData } from "@/lib/quote-pdf";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { organizationId } = await requireOrganization();
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return new Response("Missing id", { status: 400 });

  const quote = await prisma.quote.findFirst({
    where: { id, organizationId },
    include: {
      organization: true,
      customer: true,
      project: true,
      lines: { orderBy: { position: "asc" } },
      milestones: { orderBy: { position: "asc" } }
    }
  });
  if (!quote) return new Response("Not found", { status: 404 });

  const data: QuotePdfData = {
    reference: quote.reference,
    title: quote.title,
    description: quote.description,
    status: quote.status,
    billingType: quote.billingType,
    vatRate: Number(quote.vatRate),
    totalHt: Number(quote.totalHt),
    totalTvac: Number(quote.totalTvac),
    validityDays: quote.validityDays,
    sentAt: quote.sentAt,
    acceptedAt: quote.acceptedAt,
    notes: quote.notes,
    org: {
      name: quote.organization.name,
      vatNumber: quote.organization.vatNumber,
      street: quote.organization.street,
      postalCode: quote.organization.postalCode,
      city: quote.organization.city,
      country: quote.organization.country,
      phone: quote.organization.phone,
      email: quote.organization.email,
      iban: quote.organization.iban,
      logoUrl: quote.organization.logoUrl,
      paymentTermsDays: quote.organization.paymentTermsDays
    },
    customer: {
      name: quote.customer.name,
      type: quote.customer.type,
      vatNumber: quote.customer.vatNumber,
      email: quote.customer.email,
      phone: quote.customer.phone,
      street: quote.customer.street,
      postalCode: quote.customer.postalCode,
      city: quote.customer.city
    },
    project: quote.project ? { name: quote.project.name, reference: quote.project.reference } : null,
    lines: quote.lines.map((l) => ({
      description: l.description,
      quantity: Number(l.quantity),
      unit: l.unit,
      unitPrice: Number(l.unitPrice),
      totalHt: Number(l.totalHt),
      category: l.category
    })),
    milestones: quote.milestones.map((m) => ({
      label: m.label,
      amountHt: Number(m.amountHt),
      percentage: m.percentage ? Number(m.percentage) : null,
      expectedAt: m.expectedAt
    }))
  };

  const buffer = await renderToBuffer(React.createElement(QuotePdf, { data }));
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Devis-${quote.reference}.pdf"`
    }
  });
}
