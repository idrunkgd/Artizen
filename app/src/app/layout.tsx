import "./globals.css";
import { Inter } from "next/font/google";
import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { SessionProviderWrapper } from "@/components/session-provider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Artizen — l'app de l'artisan",
  description: "Devis, chantiers, factures et heures, simplement."
};

// Viewport mobile-first : pas de zoom involontaire sur les inputs (iOS)
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0a0a0a"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={inter.variable}>
      <body className="font-sans bg-cream text-ink antialiased min-h-screen">
        <SessionProviderWrapper>
          {children}
          <Toaster position="top-center" richColors />
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
