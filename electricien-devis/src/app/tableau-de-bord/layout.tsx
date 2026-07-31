import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { deconnecter } from "./actions";
import { BottomNav } from "./BottomNav";

const NAV = [
  { href: "/tableau-de-bord", label: "Accueil" },
  { href: "/tableau-de-bord/devis", label: "Devis" },
  { href: "/tableau-de-bord/clients", label: "Clients" },
  { href: "/tableau-de-bord/prestations", label: "Catalogue" },
  { href: "/tableau-de-bord/parametres", label: "Réglages" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { company } = await requireUser();

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="no-print sticky top-0 z-10 border-b border-line bg-card/90 backdrop-blur">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <Link href="/tableau-de-bord" className="flex items-center gap-2 min-w-0">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-control bg-brand text-white text-sm font-bold">
              M
            </span>
            <span className="font-bold text-ink truncate">{company.nom}</span>
          </Link>

          <nav className="hidden sm:flex items-center gap-5 text-sm font-semibold">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="text-ink-2 hover:text-brand">
                {item.label}
              </Link>
            ))}
            <form action={deconnecter}>
              <button type="submit" className="text-muted hover:text-danger">
                Déconnexion
              </button>
            </form>
          </nav>

          <form action={deconnecter} className="sm:hidden">
            <button
              type="submit"
              className="text-sm font-semibold text-muted hover:text-danger"
              aria-label="Se déconnecter"
            >
              Quitter
            </button>
          </form>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-4xl px-4 sm:px-6 py-5 sm:py-8 pb-24 sm:pb-8">
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
