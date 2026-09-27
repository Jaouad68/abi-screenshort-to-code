import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Devis — Francisco MELLADO",
  appleWebApp: { title: "MELLADO Devis", statusBarStyle: "default" },
  description:
    "Application de gestion de devis pour MELLADO Électricité : création, suivi et export PDF des devis.",
};

export const viewport: Viewport = {
  themeColor: "#03224e",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className="h-full">
      <body className="min-h-full bg-bg text-ink">{children}</body>
    </html>
  );
}
