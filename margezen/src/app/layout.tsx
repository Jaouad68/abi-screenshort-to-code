import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MargeZen",
  description:
    "Photographie ta facture fournisseur. En 30 secondes, sache quels plats de ta carte ne sont plus rentables.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
