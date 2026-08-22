import type { Metadata, Viewport } from "next";
import "./globals.css";
import { EnregistrerServiceWorker } from "@/components/EnregistrerServiceWorker";

export const metadata: Metadata = {
  title: "Plombéo — Votre métier. Simplement mieux géré.",
  description:
    "L'assistant tout-en-un du plombier indépendant : clients, interventions, devis et factures.",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Plombéo" },
};

export const viewport: Viewport = {
  themeColor: "#0f2f44",
  // `viewport-fit=cover` + les zones sûres du layout évitent que la barre de
  // navigation iOS recouvre les actions en bas d'écran.
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-dvh flex flex-col antialiased">
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded
                     focus:bg-encre focus:px-4 focus:py-2 focus:text-white"
        >
          Aller au contenu principal
        </a>
        {children}
        <EnregistrerServiceWorker />
      </body>
    </html>
  );
}
