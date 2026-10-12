import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["500", "700"],
});

export const metadata: Metadata = {
  title: "Atelier Radar — Agents automatiques pour garages indépendants",
  description:
    "Rappel du contrôle technique et relance des devis dormants, envoyés automatiquement à la place du comptoir.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${plusJakartaSans.variable} ${jetBrainsMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-bg text-text font-sans font-medium">{children}</body>
    </html>
  );
}
