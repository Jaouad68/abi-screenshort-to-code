import { APrevoir, Badge, Carte } from "@/components/ui";
import { exigerSession, organisationCourante } from "@/lib/dal";
import { LIBELLE_ROLE } from "@/lib/permissions";

/**
 * Tableau de bord — Phase 1.
 *
 * L'écran d'accueil défini au §74 (prochain rendez-vous, urgences, devis à
 * traiter…) suppose des données qui n'existent pas encore. Plutôt que de le
 * remplir de chiffres inventés — ce que le §77 interdit — on annonce
 * explicitement ce qui arrive et à quelle phase.
 */
export default async function TableauDeBord() {
  const contexte = await exigerSession();
  const organisation = await organisationCourante();

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-bold">{organisation.nom}</h1>
        <p className="text-attenue mt-1">
          Connecté en tant que {contexte.email}{" "}
          <Badge>{LIBELLE_ROLE[contexte.role]}</Badge>
        </p>
      </header>

      <Carte>
        <h2 className="font-semibold mb-1">Votre compte est prêt</h2>
        <p className="text-sm text-attenue">
          Les fondations de Plombéo sont en place : votre entreprise est créée, vos accès
          sont sécurisés et l&apos;application est installable sur votre téléphone. Les
          modules métier arrivent progressivement.
        </p>
      </Carte>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold text-sm uppercase tracking-wide text-attenue">
          Prochainement
        </h2>
        <APrevoir titre="Clients et logements" phase="Phase 2" />
        <APrevoir titre="Agenda et interventions" phase="Phase 3" />
        <APrevoir titre="Devis" phase="Phase 4" />
        <APrevoir titre="Factures et paiements" phase="Phase 5" />
      </section>
    </div>
  );
}
