import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SuiviCVC — Contrats d'entretien chauffage & climatisation",
  description:
    "Suivi des contrats d'entretien, des renouvellements et des interventions pour les entreprises de chauffage et de climatisation.",
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
