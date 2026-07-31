import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  changerStatut,
  dupliquerDevis,
  supprimerDevis,
  envoyerParEmail,
  convertirEnFacture,
} from "../actions";
import { DevisEditor, type DevisInitial } from "./DevisEditor";
import { ConfirmButton } from "@/components/ConfirmButton";
import { StatutBadge } from "@/components/StatutBadge";
import { STATUT_LABEL, TRANSITIONS } from "@/lib/statut";
import { toInputDate } from "@/lib/date";
import { btnPrimaire, btnSecondaire, btnDanger } from "@/lib/ui";

const centsToEuros = (c: number) => (c / 100).toString().replace(".", ",");
const milliToQuantite = (m: number) =>
  (m / 1000).toString().replace(".", ",");

export default async function DevisEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ email?: string; facture?: string }>;
}) {
  const { user } = await requireUser();
  const { id } = await params;
  const { email: emailStatut, facture: factureStatut } = await searchParams;

  const devis = await prisma.devis.findFirst({
    where: { id, userId: user.id },
    include: {
      client: { select: { id: true, nom: true } },
      lignes: { orderBy: { ordre: "asc" } },
    },
  });
  if (!devis) notFound();

  const prestations = await prisma.prestation.findMany({
    where: { userId: user.id, actif: true },
    orderBy: { libelle: "asc" },
    select: {
      id: true,
      libelle: true,
      description: true,
      unite: true,
      prixUnitaireCents: true,
      tauxTva: true,
    },
  });

  const initial: DevisInitial = {
    objet: devis.objet,
    dateDevis: toInputDate(devis.dateDevis),
    dureeValidite: devis.dureeValidite,
    acomptePct: devis.acomptePct,
    numeroCommande: devis.numeroCommande,
    notes: devis.notes,
    conditions: devis.conditions,
    lignes: devis.lignes.map((l) => ({
      key: l.id,
      libelle: l.libelle,
      description: l.description,
      quantite: milliToQuantite(l.quantiteMilli),
      unite: l.unite,
      prix: centsToEuros(l.prixUnitaireCents),
      tauxTva: l.tauxTva,
    })),
  };

  const transitions = TRANSITIONS[devis.statut];

  return (
    <div>
      <Link href="/tableau-de-bord/devis" className="no-print text-sm text-muted hover:text-brand">
        ← Devis
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3 mt-2 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{devis.numero}</h1>
            <StatutBadge statut={devis.statut} />
          </div>
          <Link
            href={`/tableau-de-bord/clients/${devis.client.id}`}
            className="text-muted hover:text-brand"
          >
            {devis.client.nom}
          </Link>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          <form action={envoyerParEmail.bind(null, devis.id)}>
            <button type="submit" className={btnSecondaire}>
              Envoyer par email
            </button>
          </form>
          <Link
            href={`/tableau-de-bord/devis/${devis.id}/imprimer`}
            target="_blank"
            className="inline-flex items-center gap-2 rounded-control bg-accent px-4 py-2.5 font-semibold text-white hover:bg-accent-d min-h-[44px]"
          >
            Aperçu / PDF
          </Link>
        </div>
      </div>

      {/* Retour d'envoi email */}
      {emailStatut && (
        <div
          className={`no-print mb-5 rounded-control px-4 py-3 text-sm ${
            emailStatut === "ok"
              ? "bg-ok-l text-ok"
              : emailStatut === "simule"
                ? "bg-brand-l text-brand-d"
                : "bg-danger-l text-danger"
          }`}
        >
          {emailStatut === "ok" && `Devis envoyé par email à ${devis.client.nom}.`}
          {emailStatut === "simule" &&
            "Envoi simulé : configurez RESEND_API_KEY et EMAIL_FROM pour un envoi réel. Le devis est passé en « Envoyé »."}
          {emailStatut === "sans-adresse" &&
            "Ce client n'a pas d'adresse email. Ajoutez-la dans sa fiche."}
          {emailStatut === "erreur" && "L'envoi de l'email a échoué. Réessayez."}
        </div>
      )}
      {factureStatut === "statut" && (
        <div className="no-print mb-5 rounded-control bg-danger-l text-danger px-4 py-3 text-sm">
          Seul un devis au statut « Accepté » peut être converti en facture.
        </div>
      )}

      {/* Actions de statut */}
      {transitions.length > 0 && (
        <div className="no-print flex flex-wrap gap-2 mb-6">
          {transitions.map((cible) => (
            <form key={cible} action={changerStatut.bind(null, devis.id, cible)}>
              <button type="submit" className={btnSecondaire}>
                → {STATUT_LABEL[cible]}
              </button>
            </form>
          ))}
        </div>
      )}

      {/* Éditeur */}
      <DevisEditor devisId={devis.id} initial={initial} prestations={prestations} />

      {/* Conversion en facture (devis accepté) */}
      {devis.statut === "ACCEPTE" && (
        <section className="no-print mt-8 rounded-card border border-brand/30 bg-brand-l p-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-brand-d font-medium">
            Ce devis est accepté : vous pouvez le convertir en facture.
          </p>
          <form action={convertirEnFacture.bind(null, devis.id)}>
            <button type="submit" className={btnPrimaire}>
              Convertir en facture
            </button>
          </form>
        </section>
      )}

      {/* Actions destructrices / duplication */}
      <section className="no-print border-t border-line mt-8 pt-6 flex flex-wrap gap-3">
        <form action={dupliquerDevis.bind(null, devis.id)}>
          <button type="submit" className={btnSecondaire}>
            Dupliquer ce devis
          </button>
        </form>
        <ConfirmButton
          action={supprimerDevis.bind(null, devis.id)}
          message={`Supprimer définitivement le devis ${devis.numero} ?`}
          className={btnDanger}
        >
          Supprimer
        </ConfirmButton>
      </section>
    </div>
  );
}
