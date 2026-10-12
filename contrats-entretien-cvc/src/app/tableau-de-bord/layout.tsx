import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { peutGererActivite, peutGererEquipe, ROLE_LABEL } from "@/lib/permissions";
import { deconnecter } from "./actions";
import { BottomNav } from "./BottomNav";
import { DemoBanner } from "@/components/DemoBanner";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, company } = await requireUser();

  // Le technicien a un accès en lecture à Clients/Contrats (utile sur le
  // terrain) mais pas à Renouvellements/Équipe/Export, réservés à la gestion
  // — la navigation ne doit donc pas proposer de liens qui le renverraient
  // aussitôt vers l'accueil.
  const nav = [
    { href: "/tableau-de-bord", label: "Accueil" },
    { href: "/tableau-de-bord/clients", label: "Clients" },
    { href: "/tableau-de-bord/contrats", label: "Contrats" },
    ...(peutGererActivite(user.role) ? [{ href: "/tableau-de-bord/renouvellements", label: "Renouvellements" }] : []),
    { href: "/tableau-de-bord/interventions", label: "Interventions" },
    ...(peutGererEquipe(user.role) ? [{ href: "/tableau-de-bord/equipe", label: "Équipe" }] : []),
    ...(peutGererActivite(user.role) ? [{ href: "/tableau-de-bord/export", label: "Export" }] : []),
  ];

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="no-print sticky top-0 z-10 border-b border-line bg-card/90 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <Link href="/tableau-de-bord" className="flex items-center gap-2 min-w-0">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-control bg-brand text-white text-sm font-bold">
              S
            </span>
            <span className="font-bold text-ink truncate">{company.nom}</span>
          </Link>

          <nav className="hidden md:flex items-center gap-3.5 text-sm font-semibold overflow-x-auto">
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className="text-ink-2 hover:text-brand whitespace-nowrap">
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3 shrink-0">
            <Link
              href="/tableau-de-bord/mon-compte"
              className="text-sm text-muted hover:text-brand whitespace-nowrap"
              title={`${user.nom} · ${ROLE_LABEL[user.role]}`}
            >
              {user.nom.split(" ")[0]} · {ROLE_LABEL[user.role]}
            </Link>
            <form action={deconnecter}>
              <button type="submit" className="text-sm font-semibold text-muted hover:text-danger whitespace-nowrap">
                Déconnexion
              </button>
            </form>
          </div>

          <form action={deconnecter} className="md:hidden">
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

      <main className="flex-1 mx-auto w-full max-w-5xl px-4 sm:px-6 py-5 sm:py-8 pb-24 sm:pb-8">
        {company.demo && <DemoBanner />}
        {children}
      </main>

      <BottomNav role={user.role} />
    </div>
  );
}
