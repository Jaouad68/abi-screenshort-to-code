import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { peutGererActivite } from "@/lib/permissions";
import { champ, btnPrimaire, btnSecondaire, carte } from "@/lib/ui";
import { EmptyState } from "@/components/EmptyState";

const PAGE_SIZE = 30;

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { user, company } = await requireUser();
  const { q = "", page: pageStr } = await searchParams;
  const page = Math.max(1, Number(pageStr) || 1);

  const where = {
    companyId: company.id,
    ...(q.trim()
      ? {
          OR: [
            { nom: { contains: q, mode: "insensitive" as const } },
            { ville: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
            { telephone: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      where,
      orderBy: { nom: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { _count: { select: { contrats: true, equipements: true } } },
    }),
    prisma.client.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">Clients</h1>
        {peutGererActivite(user.role) && (
          <div className="flex gap-2">
            <Link href="/tableau-de-bord/clients/import" className={btnSecondaire}>
              Importer (CSV)
            </Link>
            <Link href="/tableau-de-bord/clients/nouveau" className={btnPrimaire}>
              Nouveau client
            </Link>
          </div>
        )}
      </div>

      <form className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Rechercher un nom, une ville, un téléphone…"
          className={champ}
        />
        <button type="submit" className={btnSecondaire}>
          Rechercher
        </button>
      </form>

      {clients.length === 0 ? (
        <EmptyState
          titre={q ? "Aucun résultat" : "Aucun client pour le moment"}
          description={
            q
              ? "Essayez un autre terme de recherche."
              : "Créez votre premier client, ou importez une liste depuis Excel."
          }
          actionHref={!q && peutGererActivite(user.role) ? "/tableau-de-bord/clients/nouveau" : undefined}
          actionLabel="Nouveau client"
        />
      ) : (
        <ul className="flex flex-col gap-2.5">
          {clients.map((c) => (
            <li key={c.id}>
              <Link href={`/tableau-de-bord/clients/${c.id}`} className={`${carte} block hover:border-brand`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink truncate">{c.nom}</p>
                    <p className="text-sm text-muted truncate">
                      {[c.ville, c.telephone].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <div className="text-right text-xs text-muted shrink-0">
                    <p>{c._count.contrats} contrat(s)</p>
                    <p>{c._count.equipements} équipement(s)</p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <nav className="flex items-center justify-center gap-3 text-sm">
          {page > 1 && (
            <Link href={`?q=${encodeURIComponent(q)}&page=${page - 1}`} className={btnSecondaire}>
              ← Précédent
            </Link>
          )}
          <span className="text-muted">
            Page {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link href={`?q=${encodeURIComponent(q)}&page=${page + 1}`} className={btnSecondaire}>
              Suivant →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
