import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, IBM_Plex_Sans_Arabic } from "next/font/google";
import { cookies } from "next/headers";
import { TabBar } from "@/components/tab-bar";
import { CatalogueProvider } from "@/lib/client/catalogue";
import { LangueProvider } from "@/lib/client/langue";
import { COOKIE_LANGUE, type Langue } from "@/lib/format";
import { chargerCatalogue } from "@/lib/server/catalogue";
import "./globals.css";

const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"], weight: ["500", "700"] });
const plexArabic = IBM_Plex_Sans_Arabic({ variable: "--font-plex-arabic", subsets: ["arabic"], weight: ["400", "600"] });

export const metadata: Metadata = {
  title: { default: "Dar Tanja", template: "%s · Dar Tanja" },
  description: "Appartements neufs à Tanger pour les MRE : titre foncier vérifié et aide de l'État calculée.",
  applicationName: "Dar Tanja",
  appleWebApp: { capable: true, title: "Dar Tanja", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f6f8" },
    { media: "(prefers-color-scheme: dark)", color: "#09131a" },
  ],
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const langue: Langue = (await cookies()).get(COOKIE_LANGUE)?.value === "ar" ? "ar" : "fr";
  const catalogue = await chargerCatalogue();
  return (
    <html lang={langue} dir={langue === "ar" ? "rtl" : "ltr"} className={`${bricolage.variable} ${plexArabic.variable} h-full`}>
      <body className="min-h-full">
        <LangueProvider langue={langue}>
          <CatalogueProvider initial={catalogue}>
            <main className="mx-auto w-full max-w-2xl px-4 pt-[max(env(safe-area-inset-top),16px)] pb-32">{children}</main>
            <TabBar />
          </CatalogueProvider>
        </LangueProvider>
      </body>
    </html>
  );
}
