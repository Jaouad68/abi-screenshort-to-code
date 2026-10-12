import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { btnPrimaire, btnSecondaire } from "@/lib/ui";

export default async function AccueilPage() {
  const session = await getSession();
  if (session) redirect("/tableau-de-bord");

  return (
    <main className="min-h-dvh flex flex-col">
      <header className="px-5 sm:px-8 py-5 flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-control bg-brand text-white text-lg font-bold">
          S
        </span>
        <span className="text-lg font-bold">
          Suivi<span className="text-brand">CVC</span>
        </span>
      </header>

      <section className="flex-1 flex items-center">
        <div className="mx-auto w-full max-w-3xl px-5 sm:px-8 py-10 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-ink mb-4">
            Ne perdez plus un seul renouvellement de contrat
          </h1>
          <p className="text-muted text-lg mb-8 max-w-xl mx-auto">
            Clients, équipements, contrats d&apos;entretien, renouvellements et
            interventions : une application simple, pensée pour les petites
            entreprises de chauffage et de climatisation.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/inscription" className={btnPrimaire}>
              Créer le compte de mon entreprise
            </Link>
            <Link href="/connexion" className={btnSecondaire}>
              Se connecter
            </Link>
          </div>

          <dl className="grid sm:grid-cols-3 gap-4 mt-14 text-left">
            <div className="rounded-card border border-line bg-card p-5">
              <dt className="font-semibold text-ink mb-1">
                Clients, équipements, contrats
              </dt>
              <dd className="text-sm text-muted">
                Fiches complètes, import CSV avec détection des doublons.
              </dd>
            </div>
            <div className="rounded-card border border-line bg-card p-5">
              <dt className="font-semibold text-ink mb-1">Renouvellements</dt>
              <dd className="text-sm text-muted">
                Échéances à 30, 60 et 90 jours, messages prêts à envoyer.
              </dd>
            </div>
            <div className="rounded-card border border-line bg-card p-5">
              <dt className="font-semibold text-ink mb-1">Interventions</dt>
              <dd className="text-sm text-muted">
                Planification, checklist, photos et compte rendu en PDF.
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <footer className="px-5 sm:px-8 py-6 text-center text-xs text-muted">
        SuiviCVC — application de démonstration.
      </footer>
    </main>
  );
}
