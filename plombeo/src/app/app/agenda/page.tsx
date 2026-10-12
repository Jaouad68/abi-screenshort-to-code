import Link from "next/link";
import { Badge, Bouton, Carte, ListeVide } from "@/components/ui";
import { listerRendezVousDuJour } from "@/lib/terrain";
import { sessionCourante } from "@/lib/dal";
import { roleAutorise } from "@/lib/permissions";
import { adresseCourte } from "@/lib/libelles";
import { formaterHeure, formaterJour, versParametreDate } from "@/lib/format";
import { demarrerIntervention } from "./actions";

export const metadata = { title: "Agenda — Plombéo" };

const LIBELLE_STATUT = {
  PLANIFIE: "Planifié",
  CONFIRME: "Confirmé",
  EN_COURS: "En cours",
  TERMINE: "Terminé",
  ANNULE: "Annulé",
} as const;

const LIBELLE_URGENCE = {
  NORMAL: null,
  RAPIDE: "À faire vite",
  URGENT: "Urgent",
  CRITIQUE: "Critique",
} as const;

function decalerJour(date: Date, jours: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + jours);
  return d;
}

export default async function PageAgenda(props: PageProps<"/app/agenda">) {
  const parametres = await props.searchParams;
  const parametreJour = typeof parametres["jour"] === "string" ? parametres["jour"] : "";
  // Vue jour par défaut : c'est l'horizon réel d'un artisan sur son téléphone.
  const jour =
    parametreJour && !Number.isNaN(Date.parse(parametreJour))
      ? new Date(`${parametreJour}T12:00:00`)
      : new Date();

  const rendezVous = await listerRendezVousDuJour(jour);
  const contexte = await sessionCourante();
  const peutModifier = contexte ? roleAutorise(contexte.role, "intervention:modifier") : false;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Agenda</h1>
          <p className="text-attenue mt-1 first-letter:uppercase">{formaterJour(jour)}</p>
        </div>
        {peutModifier && (
          <Link
            href="/app/agenda/nouveau"
            className="inline-flex items-center justify-center min-h-11 px-4 rounded-controle
                       font-semibold bg-action text-white hover:bg-action-fonce shrink-0"
          >
            + Rendez-vous
          </Link>
        )}
      </header>

      <nav className="flex items-center justify-between gap-2" aria-label="Navigation par jour">
        <Link
          href={`/app/agenda?jour=${versParametreDate(decalerJour(jour, -1))}`}
          className="inline-flex items-center justify-center min-h-11 px-4 rounded-controle
                     font-semibold bg-white text-encre border border-trait hover:bg-fond"
        >
          ‹ Veille
        </Link>
        <Link
          href="/app/agenda"
          className="inline-flex items-center justify-center min-h-11 px-4 rounded-controle
                     text-sm font-semibold text-encre underline"
        >
          Aujourd&apos;hui
        </Link>
        <Link
          href={`/app/agenda?jour=${versParametreDate(decalerJour(jour, 1))}`}
          className="inline-flex items-center justify-center min-h-11 px-4 rounded-controle
                     font-semibold bg-white text-encre border border-trait hover:bg-fond"
        >
          Lendemain ›
        </Link>
      </nav>

      {rendezVous.length === 0 ? (
        <ListeVide titre="Aucun rendez-vous ce jour-là">
          Profitez-en, ou planifiez une intervention.
        </ListeVide>
      ) : (
        <ul className="flex flex-col gap-2">
          {rendezVous.map((rdv) => {
            const adresse = rdv.property ? adresseCourte(rdv.property) : "";
            const urgence = LIBELLE_URGENCE[rdv.urgence];
            return (
              <li key={rdv.id}>
                <Carte>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">
                        {formaterHeure(rdv.debut)} – {formaterHeure(rdv.fin)}
                      </p>
                      <p className="text-sm font-medium truncate">
                        {rdv.client.nomAffichage}
                      </p>
                      {rdv.titre && <p className="text-sm text-attenue">{rdv.titre}</p>}
                      {adresse && <p className="text-sm text-attenue truncate">{adresse}</p>}
                      {rdv.trajetMin > 0 && (
                        <p className="text-sm text-attenue">
                          Trajet estimé {rdv.trajetMin} min
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {urgence && <Badge ton="danger">{urgence}</Badge>}
                      <Badge ton={rdv.statut === "EN_COURS" ? "alerte" : "neutre"}>
                        {LIBELLE_STATUT[rdv.statut]}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-3">
                    {rdv.intervention ? (
                      <Link
                        href={`/app/interventions/${rdv.intervention.id}`}
                        className="inline-flex items-center justify-center min-h-11 px-4 rounded-controle
                                   font-semibold bg-encre text-white hover:bg-encre-clair"
                      >
                        Ouvrir l&apos;intervention
                      </Link>
                    ) : (
                      peutModifier &&
                      rdv.statut !== "ANNULE" && (
                        // Un seul appui pour « j'arrive sur place » : pas de
                        // formulaire intermédiaire sur un chantier.
                        <form action={demarrerIntervention}>
                          <input type="hidden" name="appointmentId" value={rdv.id} />
                          <Bouton type="submit">Démarrer l&apos;intervention</Bouton>
                        </form>
                      )
                    )}
                    {adresse && (
                      <a
                        href={`https://maps.google.com/?q=${encodeURIComponent(adresse)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center min-h-11 px-4 rounded-controle
                                   font-semibold bg-white text-encre border border-trait hover:bg-fond"
                      >
                        GPS
                      </a>
                    )}
                    {rdv.client.telephone && (
                      <a
                        href={`tel:${rdv.client.telephone}`}
                        className="inline-flex items-center justify-center min-h-11 px-4 rounded-controle
                                   font-semibold bg-white text-encre border border-trait hover:bg-fond"
                      >
                        Appeler
                      </a>
                    )}
                  </div>
                </Carte>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
