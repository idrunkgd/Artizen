import { clsx, type ClassValue } from "clsx";
export function cn(...inputs: ClassValue[]) { return clsx(inputs); }
export function formatCurrency(n: number | string | bigint | { toString(): string }) {
  const v = typeof n === "number" ? n : Number(n.toString());
  return new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR" }).format(v || 0);
}
export function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("fr-BE", { dateStyle: "short" }).format(date);
}
