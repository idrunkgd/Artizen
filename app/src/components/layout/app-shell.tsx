"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Hammer, FileText, Receipt, Package, Wrench, Clock,
  Menu, X, LogOut, ShoppingBag, Truck, Settings, Tag
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { CommandPalette, SearchTrigger } from "@/components/layout/command-palette";
import { Search } from "lucide-react";

const NAV = [
  { href: "/dashboard",     label: "Accueil",    icon: LayoutDashboard },
  { href: "/chantiers",     label: "Chantiers",  icon: Hammer },
  { href: "/devis",         label: "Devis",      icon: FileText },
  { href: "/factures",      label: "Factures",   icon: Receipt },
  { href: "/clients",       label: "Clients",    icon: Users },
  { href: "/timesheet",     label: "Heures",     icon: Clock },
  { href: "/materiel",      label: "Matériel",   icon: Package },
  { href: "/outillage",     label: "Outils",     icon: Wrench },
  { href: "/commandes",     label: "Commandes",  icon: ShoppingBag },
  { href: "/fournisseurs",  label: "Fournisseurs", icon: Truck },
  { href: "/catalogue",     label: "Catalogue",  icon: Tag },
  { href: "/settings",      label: "Ma boîte",   icon: Settings }
];

// Tabs visibles dans la bottom-bar mobile (5 max, le reste va dans "Plus")
const BOTTOM_TABS = ["/dashboard", "/chantiers", "/devis", "/factures"];

export function AppShell({
  children, userName, organizationName, role
}: {
  children: React.ReactNode;
  userName: string;
  organizationName: string;
  role: string;
}) {
  const path = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar desktop (md+) */}
      <aside className="hidden md:flex md:flex-col w-64 bg-ink text-cream sticky top-0 h-screen overflow-y-auto">
        <Brand organizationName={organizationName} />
        {/* Bouton recherche en haut de la sidebar — Cmd+K également actif partout */}
        <div className="px-3 pt-3">
          <SearchTrigger />
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = path === n.href || path.startsWith(n.href + "/");
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-colors",
                  active
                    ? "bg-gold text-ink"
                    : "text-cream/80 hover:bg-ink-800 hover:text-cream"
                )}
              >
                <Icon className="w-5 h-5" />
                <span>{n.label}</span>
              </Link>
            );
          })}
        </nav>
        <UserBlock userName={userName} role={role} />
      </aside>

      {/* Header mobile */}
      <header className="md:hidden sticky top-0 z-30 bg-ink text-cream flex items-center justify-between px-4 py-3 shadow-soft">
        <div className="flex items-center gap-2">
          <BrandLogo />
          <div>
            <div className="text-sm font-bold leading-none">Artizen</div>
            <div className="text-[11px] text-cream/60 leading-none mt-0.5">{organizationName}</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* Loupe mobile : ouvre la palette Cmd+K (utile sans clavier physique) */}
          <button
            onClick={() => (window as any).openCommandPalette?.()}
            className="p-2"
            aria-label="Rechercher"
          >
            <Search className="w-6 h-6" />
          </button>
          <button
            onClick={() => setMenuOpen(true)}
            className="p-2 -mr-2"
            aria-label="Menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Drawer menu mobile (déclenché par le burger) */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/60" onClick={() => setMenuOpen(false)}>
          <div
            className="absolute right-0 top-0 bottom-0 w-72 bg-ink text-cream flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-ink-700">
              <span className="font-bold">{organizationName}</span>
              <button onClick={() => setMenuOpen(false)} className="p-2 -mr-2" aria-label="Fermer">
                <X className="w-6 h-6" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {NAV.map((n) => {
                const Icon = n.icon;
                const active = path === n.href || path.startsWith(n.href + "/");
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-colors",
                      active ? "bg-gold text-ink" : "text-cream/80 hover:bg-ink-800"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{n.label}</span>
                  </Link>
                );
              })}
            </nav>
            <UserBlock userName={userName} role={role} />
          </div>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 min-w-0 pb-20 md:pb-0">{children}</main>

      {/* Palette de commandes globale (Cmd+K / Ctrl+K) — montée une fois ici */}
      <CommandPalette />

      {/* Bottom tabs mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-cream-300 grid grid-cols-5">
        {BOTTOM_TABS.map((href) => {
          const item = NAV.find((n) => n.href === href);
          if (!item) return null;
          const Icon = item.icon;
          const active = path === href || path.startsWith(href + "/");
          return (
            <Link key={href} href={href} className={cn("bottom-tab", active && "active")}>
              <Icon className="w-6 h-6" />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setMenuOpen(true)}
          className="bottom-tab"
        >
          <Menu className="w-6 h-6" />
          <span>Plus</span>
        </button>
      </nav>
    </div>
  );
}

function Brand({ organizationName }: { organizationName: string }) {
  return (
    <div className="p-5 border-b border-ink-700 flex items-center gap-3">
      <BrandLogo />
      <div>
        <div className="font-bold text-lg leading-none">Artizen</div>
        <div className="text-[11px] text-cream/60 mt-1">{organizationName}</div>
      </div>
    </div>
  );
}

function BrandLogo() {
  return (
    <div className="w-9 h-9 rounded-lg bg-gold flex items-center justify-center font-black text-ink text-lg shadow-soft">
      A
    </div>
  );
}

function UserBlock({ userName, role }: { userName: string; role: string }) {
  return (
    <div className="p-3 border-t border-ink-700">
      <div className="flex items-center gap-3 px-2 py-2">
        <div className="w-9 h-9 rounded-full bg-gold text-ink font-bold flex items-center justify-center">
          {userName.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{userName}</div>
          <div className="text-[11px] text-cream/60">{role === "PATRON" ? "Patron" : "Apprenti"}</div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="p-2 text-cream/60 hover:text-gold"
          aria-label="Se déconnecter"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
