import Link from "next/link";
import { requireSalon, getSession, mesSalons } from "@/lib/auth";
import { deconnecter } from "./actions";
import { SalonSwitcher } from "./salon-switcher";

export default async function TableauDeBordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const salon = await requireSalon();
  const session = await getSession();
  const salons = session ? await mesSalons(session.userId) : [salon];

  return (
    <div className="flex-1 flex flex-col">
      <header className="border-b border-line bg-paper/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <p className="font-serif text-xl">RésaZen</p>
            <div className="text-sm text-muted flex items-center gap-2 flex-wrap">
              <SalonSwitcher salons={salons} activeSalonId={salon.id} />
              {salons.length < 2 && <span>{salon.nom}</span>}
              <span>·</span>
              <Link href="/tableau-de-bord/salons/nouveau" className="text-sage-d hover:underline">
                + Ajouter un salon
              </Link>
              <span>·</span>
              <Link href={`/r/${salon.slug}`} className="text-sage-d hover:underline">
                Page de réservation
              </Link>
            </div>
          </div>
          <nav className="flex items-center gap-6 text-sm font-semibold">
            <Link href="/tableau-de-bord" className="hover:text-sage-d">
              Agenda
            </Link>
            <Link href="/tableau-de-bord/prestations" className="hover:text-sage-d">
              Prestations
            </Link>
            <Link href="/tableau-de-bord/horaires" className="hover:text-sage-d">
              Horaires
            </Link>
            <Link href="/tableau-de-bord/sms" className="hover:text-sage-d">
              Journal SMS
            </Link>
            <Link href="/tableau-de-bord/bilan" className="hover:text-sage-d">
              Bilan
            </Link>
            <Link href="/tableau-de-bord/clients" className="hover:text-sage-d">
              Clients
            </Link>
            <Link href="/tableau-de-bord/facturation" className="hover:text-sage-d">
              Facturation
            </Link>
            <form action={deconnecter}>
              <button type="submit" className="text-muted hover:text-danger">
                Déconnexion
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-10">{children}</main>
    </div>
  );
}
