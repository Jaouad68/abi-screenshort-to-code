import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { classerEcheance, FENETRE_LABEL, type FenetreEcheance } from "@/lib/echeance";
import { formatDateCourt } from "@/lib/date";
import { formatCents } from "@/lib/money";
import { carte, btnSecondaire, champ } from "@/lib/ui";
import { StatutRenouvellementBadge } from "@/components/StatutBadge";
import { EmptyState } from "@/components/EmptyState";
import { StatutActions } from "./StatutActions";
import { MessageModal } from "./MessageModal";

const HORIZONS = ["30", "60", "90"] as const;

export default async function RenouvellementsPage({
  searchParams,
}: {
  searchParams: Promise<{ horizon?: string; statut?: string }>;
}) {
  const { company } = await requireRole(["DIRIGEANT", "ADMINISTRATIF"]);
  const { horizon: horizonParam, statut = "" } = await searchParams;
  const horizon = (HORIZONS as readonly string[]).includes(horizonParam ?? "") ? horizonParam! : "30";

  const contrats = await prisma.contrat.findMany({
    where: {
      companyId: company.id,
      actif: true,
      statut: statut ? (statut as "A_CONTACTER" | "CONTACTE") : { in: ["A_CONTACTER", "CONTACTE"] },
    },
    include: { client: true, equipement: true },
    orderBy: { dateEcheance: "asc" },
  });

  const fenetresIncluses: FenetreEcheance[] =
    horizon === "30" ? ["echu", "30"] : horizon === "60" ? ["echu", "30", "60"] : ["echu", "30", "60", "90"];

  const groupes = new Map<FenetreEcheance, typeof contrats>();
  for (const c of contrats) {
    const f = classerEcheance(c.dateEcheance);
    if (!fenetresIncluses.includes(f)) continue;
    groupes.set(f, [...(groupes.get(f) ?? []), c]);
  }

  const total = [...groupes.values()].reduce((n, l) => n + l.length, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-ink">Renouvellements</h1>
          <p className="text-muted">{total} contrat(s) à traiter dans cette fenêtre.</p>
        </div>
        <Link href="/tableau-de-bord/contrats?statut=PERDU" className={btnSecondaire}>
          Voir les contrats perdus
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-1.5 rounded-control bg-line/50 p-1">
          {HORIZONS.map((h) => (
            <Link
              key={h}
              href={`?horizon=${h}${statut ? `&statut=${statut}` : ""}`}
              className={`px-3.5 py-2 text-sm font-semibold rounded-control min-h-[36px] flex items-center ${
                horizon === h ? "bg-card text-brand shadow-sm" : "text-muted"
              }`}
            >
              Sous {h} jours
            </Link>
          ))}
        </div>
        <form className="flex gap-2">
          <input type="hidden" name="horizon" value={horizon} />
          <select name="statut" defaultValue={statut} className={champ + " w-auto"}>
            <option value="">Tous statuts (à traiter)</option>
            <option value="A_CONTACTER">À contacter uniquement</option>
            <option value="CONTACTE">Contacté uniquement</option>
          </select>
          <button type="submit" className={btnSecondaire}>
            Filtrer
          </button>
        </form>
      </div>

      {total === 0 ? (
        <EmptyState
          titre="Rien à traiter"
          description="Aucun contrat n'arrive à échéance dans cette fenêtre. Bon signe !"
        />
      ) : (
        (["echu", "30", "60", "90"] as FenetreEcheance[])
          .filter((f) => fenetresIncluses.includes(f) && (groupes.get(f)?.length ?? 0) > 0)
          .map((f) => (
            <section key={f}>
              <h2 className="font-bold text-ink mb-3">
                {FENETRE_LABEL[f]} ({groupes.get(f)!.length})
              </h2>
              <ul className="flex flex-col gap-3">
                {groupes.get(f)!.map((c) => (
                  <li key={c.id} className={carte}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link href={`/tableau-de-bord/contrats/${c.id}`} className="font-semibold text-ink hover:text-brand">
                          {c.client.nom} — {c.type}
                        </Link>
                        <p className="text-sm text-muted">
                          Échéance {formatDateCourt(c.dateEcheance)} · {formatCents(c.montantCents)}
                          {c.equipement && ` · ${c.equipement.type}`}
                        </p>
                      </div>
                      <StatutRenouvellementBadge statut={c.statut} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      <StatutActions
                        contratId={c.id}
                        statutActuel={c.statut}
                        dateEcheance={c.dateEcheance}
                        periodicite={c.periodicite}
                        compact
                      />
                      <MessageModal
                        entrepriseNom={company.nom}
                        clientNom={c.client.nom}
                        clientEmail={c.client.email}
                        equipementLibelle={c.equipement?.type}
                        contratType={c.type}
                        dateEcheance={c.dateEcheance}
                        montantCents={c.montantCents}
                        compact
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))
      )}
    </div>
  );
}
