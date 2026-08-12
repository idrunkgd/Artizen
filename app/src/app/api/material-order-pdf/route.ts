/**
 * API : génère et renvoie le PDF d'un bon de commande matériel.
 * GET /api/material-order-pdf?id=<orderId>[&inline=1]
 *
 * Multi-tenant : on vérifie que la commande appartient à l'organisation
 * courante avant de générer le PDF.
 */
import { NextRequest } from "next/server";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/db";
import { requireOrganization } from "@/lib/session";
import { MaterialOrderPdf, type MaterialOrderPdfData } from "@/lib/material-order-pdf-template";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { organizationId } = await requireOrganization();
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return new Response("Missing id", { status: 400 });
  const inline = req.nextUrl.searchParams.get("inline") === "1";

  const order = await prisma.materialOrder.findFirst({
    where: { id, organizationId },
    include: {
      lines: { orderBy: { position: "asc" } },
      supplier: true,
      project: { include: { organization: true, customerAddress: true } }
    }
  });
  if (!order) return new Response("Not found", { status: 404 });

  const project = order.project;
  const org = project?.organization;
  const addressLine = project?.customerAddress
    ? [
        project.customerAddress.street,
        project.customerAddress.postalCode,
        project.customerAddress.city
      ].filter(Boolean).join(", ")
    : project
      ? [project.siteStreet, project.sitePostalCode, project.siteCity].filter(Boolean).join(", ") || null
      : null;

  const data: MaterialOrderPdfData = {
    reference: order.reference,
    orderedAt: order.orderedAt,
    expectedAt: order.expectedAt,
    notes: order.notes,
    totalHt: Number(order.totalHt),
    supplier: order.supplier
      ? { name: order.supplier.name, email: order.supplier.email, vatNumber: order.supplier.vatNumber }
      : null,
    project: project
      ? { name: project.name, reference: project.reference, address: addressLine }
      : null,
    organization: {
      name: org?.name ?? "Mon entreprise",
      email: org?.email ?? null,
      phone: org?.phone ?? null,
      vatNumber: org?.vatNumber ?? null,
      addressLine: org
        ? [org.street, org.postalCode, org.city].filter(Boolean).join(", ") || null
        : null
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

  try {
    const buffer = await renderToBuffer(React.createElement(MaterialOrderPdf, { data }));
    const u8 = new Uint8Array(buffer);
    return new Response(u8, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${order.reference}.pdf"`,
        "Content-Length": String(u8.length),
        "Cache-Control": "private, no-store"
      }
    });
  } catch (e: any) {
    return new Response(`PDF generation failed: ${String(e?.message ?? e)}`, {
      status: 500, headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }
}
