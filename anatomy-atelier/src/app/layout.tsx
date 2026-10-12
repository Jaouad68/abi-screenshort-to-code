import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { TopNav } from "@/components/TopNav";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Anatomy Atelier — Learn anatomy like an artist",
  description:
    "Interactive 3D anatomy education: explore organs, see where they sit in the body, and learn through clickable hotspots.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${manrope.variable} h-full antialiased`}>
      <body className="flex h-full min-h-screen flex-col bg-cream text-ink">
        <TopNav />
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}
