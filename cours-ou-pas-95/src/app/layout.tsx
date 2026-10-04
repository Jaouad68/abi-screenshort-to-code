import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { TabBar } from "@/components/tab-bar";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Cours ou Pas ? 95", template: "%s · Cours ou Pas ? 95" },
  description: "Grèves et blocages dans les lycées du Val d'Oise : sache en temps réel s'il y a cours, lycée par lycée, jour par jour.",
  applicationName: "Cours ou Pas ?",
  appleWebApp: { capable: true, title: "Cours ou Pas ?", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f2f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${inter.variable} h-full`}>
      <body className="min-h-full">
        {children}
        <TabBar />
      </body>
    </html>
  );
}
