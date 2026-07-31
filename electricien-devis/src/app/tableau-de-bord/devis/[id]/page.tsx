import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { changerStatut, dupliquerDevis, supprimerDevis } from "../actions";
import { DevisEditor, type DevisInitial } from "./DevisEditor";
import { ConfirmButton } from "@/components/ConfirmButton";
import { StatutBadge } from "@/components/StatutBadge";
import { STATUT_LABEL, TRANSITIONS } from "@/lib/statut";
import { toInputDate } from "@/lib/date";
import { btnSecondaire, btnDanger } from "@/lib/ui";

const centsToEuros = (c: number) => (c / 100).toString().replace(".", ",");
const milliToQuantite = (m: number) =>
  (m / 1000).toString().replace(".", ",");

export default async function DevisEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await requireUser();
  const { id } = await params;

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
        <Link
          href={`/tableau-de-bord/devis/${devis.id}/imprimer`}
          target="_blank"
          className="no-print inline-flex items-center gap-2 rounded-control bg-accent px-4 py-2.5 font-semibold text-white hover:bg-accent-d min-h-[44px]"
        >
          Aperçu / PDF
        </Link>
      </div>

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
