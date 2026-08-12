"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, FileText, Receipt, Camera, Clock, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

type Counts = { quotes: number; invoices: number; photos: number; timesheet: number };

export function ChantierSubNav({ projectId, counts }: { projectId: string; counts: Counts }) {
  const path = usePathname();
  const base = `/chantiers/${projectId}`;
  const tabs = [
    { href: base,                label: "Aperçu",    icon: LayoutGrid, badge: null },
    { href: `${base}/devis`,     label: "Devis",     icon: FileText,   badge: counts.quotes || null },
    { href: `${base}/factures`,  label: "Factures",  icon: Receipt,    badge: counts.invoices || null },
    { href: `${base}/photos`,    label: "Photos",    icon: Camera,     badge: counts.photos || null },
    { href: `${base}/heures`,    label: "Heures",    icon: Clock,      badge: counts.timesheet || null },
    { href: `${base}/edit`,      label: "Modifier",  icon: Settings,   badge: null }
  ];
  return (
    <div className="bg-white border-b border-cream-300 sticky top-[88px] md:top-[88px] z-10 overflow-x-auto">
      <nav className="max-w-4xl mx-auto px-2 flex gap-1 min-w-max">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = t.href === base
            ? path === base   // l'onglet Aperçu n'est actif que si pile sur la racine
            : path === t.href || path.startsWith(t.href + "/");
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap",
                active
                  ? "border-gold text-ink"
                  : "border-transparent text-ink-300 hover:text-ink hover:border-cream-300"
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
              {t.badge != null && (
                <span className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                  active ? "bg-gold text-ink" : "bg-cream-300 text-ink-700"
                )}>{t.badge}</span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
