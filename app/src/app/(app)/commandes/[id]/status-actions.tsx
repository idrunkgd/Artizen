"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { Send, Truck } from "lucide-react";
import { setOrderStatus } from "@/server/actions/orders";

export function OrderStatusActions({ orderId, currentStatus }: { orderId: string; currentStatus: string }) {
  const [pending, start] = useTransition();
  function change(s: any, msg: string) {
    start(async () => {
      try { await setOrderStatus(orderId, s); toast.success(msg); }
      catch (e: any) { toast.error(e?.message ?? "Erreur"); }
    });
  }
  if (currentStatus === "DRAFT") return <button onClick={() => change("ORDERED", "Marquée commandée")} disabled={pending} className="btn-gold"><Send className="w-5 h-5" /> Marquer commandée</button>;
  if (currentStatus === "ORDERED") return <button onClick={() => change("DELIVERED", "Livrée — stock mis à jour ✓")} disabled={pending} className="btn bg-success text-white"><Truck className="w-5 h-5" /> Marquer livrée</button>;
  return null;
}
