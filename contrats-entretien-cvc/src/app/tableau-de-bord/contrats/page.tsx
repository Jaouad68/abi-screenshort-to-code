import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { peutGererActivite } from "@/lib/permissions";
import { formatDateCourt } from "@/lib/date";
import { formatCents } from "@/lib/money";
import { champ, btnPrimaire, btnSecondaire, carte } from "@/lib/ui";
import { StatutRenouvellementBadge } from "@/components/StatutBadge";
import { EmptyState } from "@/components/EmptyState";
import type { StatutRenouvellement } from "@/generated/prisma/client";

const PAGE_SIZE = 30;

export default async function ContratsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; statut?: string; page?: string }>;
}) {
  const { user, company } = await requireUser();
  const { q = "", statut = "", page: pageStr } = await searchParams;
  const page = Math.max(1, Number(pageStr) || 1);

  const where = {
    companyId: company.id,
    ...(statut ? { statut: statut as StatutRenouvellement } : {}),
    ...(q.trim()
      ? {
          OR: [
            { reference: { contains: q, mode: "insensitive" as const } },
            { type: { contains: q, mode: "insensitive" as const } },
            { client: { nom: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [contrats, total] = await Promise.all([
    prisma.contrat.findMany({
      where,
      orderBy: { dateEcheance: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { client: true },
    }),
    prisma.contrat.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">Contrats</h1>
        {peutGererActivite(user.role) && (
          <Link href="/tableau-de-bord/contrats/nouveau" className={btnPrimaire}>
            Nouveau contrat
          </Link>
        )}
      </div>

      <form className="flex flex-wrap gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Référence, type, client…"
          className={`${champ} flex-1 min-w-[200px]`}
        />
        <select name="statut" defaultValue={statut} className={champ + " w-auto"}>
          <option value="">Tous les statuts</option>
          <option value="A_CONTACTER">À contacter</option>
          <option value="CONTACTE">Contacté</option>
          <option value="RENOUVELE">Renouvelé</option>
          <option value="PERDU">Perdu</option>
        </select>
        <button type="submit" className={btnSecondaire}>
          Filtrer
        </button>
      </form>

      {contrats.length === 0 ? (
        <EmptyState
          titre="Aucun contrat"
          description="Créez un contrat depuis la fiche d'un client, ou importez-les via CSV."
        />
      ) : (
        <ul className="flex flex-col gap-2.5">
          {contrats.map((c) => (
            <li key={c.id}>
              <Link href={`/tableau-de-bord/contrats/${c.id}`} className={`${carte} block hover:border-brand`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink truncate">
                      {c.reference} — {c.client.nom}
                    </p>
                    <p className="text-sm text-muted truncate">
                      {c.type} · Échéance {formatDateCourt(c.dateEcheance)} · {formatCents(c.montantCents)}
                      {!c.actif && " · Inactif"}
                    </p>
                  </div>
                  <StatutRenouvellementBadge statut={c.statut} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <nav className="flex items-center justify-center gap-3 text-sm">
          {page > 1 && (
            <Link href={`?q=${encodeURIComponent(q)}&statut=${statut}&page=${page - 1}`} className={btnSecondaire}>
              ← Précédent
            </Link>
          )}
          <span className="text-muted">
            Page {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link href={`?q=${encodeURIComponent(q)}&statut=${statut}&page=${page + 1}`} className={btnSecondaire}>
              Suivant →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
