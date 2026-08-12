"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireOrganization } from "@/lib/session";

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

const OrderSchema = z.object({
  supplierId: z.string().optional().nullable().transform((v) => v || null),
  projectId: z.string().optional().nullable().transform((v) => v || null),
  expectedAt: z.string().optional().nullable().transform((v) => v || null),
  notes: z.string().optional().nullable().transform((v) => v?.trim() || null)
});

export async function createOrder(formData: FormData) {
  const { organizationId } = await requireOrganization();
  const data = OrderSchema.parse(Object.fromEntries(formData));
  const reference = await nextOrderReference(organizationId);
  const o = await prisma.materialOrder.create({
    data: {
      ...data, reference, organizationId, status: "DRAFT", totalHt: 0,
      expectedAt: data.expectedAt ? new Date(data.expectedAt) : null
    }
  });
  revalidatePath("/commandes");
  return { ok: true, id: o.id };
}

export async function updateOrder(id: string, formData: FormData) {
  const { organizationId } = await requireOrganization();
  const data = OrderSchema.parse(Object.fromEntries(formData));
  const e = await prisma.materialOrder.findFirst({ where: { id, organizationId } });
  if (!e) throw new Error("Commande introuvable");
  await prisma.materialOrder.update({
    where: { id },
    data: { ...data, expectedAt: data.expectedAt ? new Date(data.expectedAt) : null }
  });
  revalidatePath(`/commandes/${id}`);
  return { ok: true };
}

export async function deleteOrder(id: string) {
  const { organizationId } = await requireOrganization();
  const e = await prisma.materialOrder.findFirst({ where: { id, organizationId } });
  if (!e) throw new Error("Introuvable");
  await prisma.materialOrder.delete({ where: { id } });
  revalidatePath("/commandes");
  return { ok: true };
}

export async function setOrderStatus(id: string, status: "DRAFT"|"ORDERED"|"DELIVERED"|"CANCELLED") {
  const { organizationId } = await requireOrganization();
  const order = await prisma.materialOrder.findFirst({
    where: { id, organizationId }, include: { lines: true }
  });
  if (!order) throw new Error("Introuvable");
  const data: any = { status };
  if (status === "ORDERED" && !order.orderedAt) data.orderedAt = new Date();
  if (status === "DELIVERED" && !order.deliveredAt) {
    data.deliveredAt = new Date();
    // À la livraison : incrémente le stock des materials liés
    for (const line of order.lines) {
      if (line.materialId) {
        await prisma.material.update({
          where: { id: line.materialId },
          data: { stockQty: { increment: Number(line.quantity) } }
        });
      }
    }
  }
  await prisma.materialOrder.update({ where: { id }, data });
  revalidatePath(`/commandes/${id}`);
  revalidatePath("/commandes");
  revalidatePath("/materiel");
  return { ok: true };
}

// Lignes
const LineSchema = z.object({
  orderId: z.string().min(1),
  materialId: z.string().optional().nullable().transform((v) => v || null),
  description: z.string().min(1),
  quantity: z.coerce.number().nonnegative().default(1),
  unit: z.string().default("u"),
  unitPrice: z.coerce.number().nonnegative().default(0)
});

export async function addOrderLine(formData: FormData) {
  const { organizationId } = await requireOrganization();
  const data = LineSchema.parse(Object.fromEntries(formData));
  const order = await prisma.materialOrder.findFirst({ where: { id: data.orderId, organizationId } });
  if (!order) throw new Error("Commande introuvable");
  const last = await prisma.materialOrderLine.findFirst({ where: { orderId: order.id }, orderBy: { position: "desc" } });
  await prisma.materialOrderLine.create({
    data: {
      orderId: order.id, position: (last?.position ?? 0) + 1,
      materialId: data.materialId, description: data.description,
      quantity: data.quantity, unit: data.unit, unitPrice: data.unitPrice,
      totalHt: data.quantity * data.unitPrice
    }
  });
  await recomputeOrderTotals(order.id);
  revalidatePath(`/commandes/${order.id}`);
  return { ok: true };
}

export async function deleteOrderLine(lineId: string) {
  const { organizationId } = await requireOrganization();
  const line = await prisma.materialOrderLine.findUnique({
    where: { id: lineId }, include: { order: { select: { organizationId: true, id: true } } }
  });
  if (!line || line.order.organizationId !== organizationId) throw new Error("Introuvable");
  await prisma.materialOrderLine.delete({ where: { id: lineId } });
  await recomputeOrderTotals(line.order.id);
  revalidatePath(`/commandes/${line.order.id}`);
  return { ok: true };
}

async function recomputeOrderTotals(id: string) {
  const order = await prisma.materialOrder.findUnique({ where: { id }, include: { lines: true } });
  if (!order) return;
  const totalHt = order.lines.reduce((s, l) => s + Number(l.totalHt), 0);
  await prisma.materialOrder.update({ where: { id }, data: { totalHt } });
}
