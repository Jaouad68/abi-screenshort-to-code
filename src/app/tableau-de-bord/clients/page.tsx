import { requireSalon } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Pagination } from "../Pagination";
import { anonymiserClient } from "./actions";

const PAR_PAGE = 20;

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const salon = await requireSalon();
  const { page: pageParam } = await searchParams;
  const pageDemandee = Number(pageParam ?? "1");
  const page = Number.isInteger(pageDemandee) && pageDemandee > 0 ? pageDemandee : 1;

  const total = await prisma.client.count({ where: { salonId: salon.id } });
  const totalPages = Math.max(1, Math.ceil(total / PAR_PAGE));
  const pageActuelle = Math.min(page, totalPages);

  const clients = await prisma.client.findMany({
    where: { salonId: salon.id },
    orderBy: { prenom: "asc" },
    skip: (pageActuelle - 1) * PAR_PAGE,
    take: PAR_PAGE,
  });

  return (
    <div>
      <h1 className="font-serif text-3xl mb-2">Clients</h1>
      <p className="text-muted mb-8">
        {total} client{total > 1 ? "s" : ""}. Export CSV disponible depuis le{" "}
        <a href="/tableau-de-bord/bilan" className="text-sage-d hover:underline">
          Bilan
        </a>
        .
      </p>

      <div className="flex flex-col gap-2">
        {clients.length === 0 && <p className="text-muted italic">Aucun client pour le moment.</p>}
        {clients.map((client) => {
          const anonymise = client.telephone.startsWith("supprime-");
          return (
            <div
              key={client.id}
              className="bg-paper rounded-card border border-line px-6 py-4 flex flex-wrap items-center justify-between gap-3"
            >
              <div>
                <p className="font-semibold">{client.prenom}</p>
                <p className="text-sm text-muted">
                  {anonymise ? "—" : client.telephone} ·{" "}
                  {client.consentementSms ? "consentement SMS" : "sans consentement SMS"}
                  {client.noShowCount > 0 && ` · ${client.noShowCount} non venue(s)`}
                  {client.honoredCount > 0 && ` · ${client.honoredCount} honoré(s)`}
                </p>
              </div>
              {!anonymise && (
                <form action={anonymiserClient.bind(null, client.id)}>
                  <button
                    type="submit"
                    className="rounded-control border border-danger text-danger px-3 py-1.5 text-sm font-semibold hover:bg-danger/10 min-h-[36px]"
                  >
                    Supprimer les données personnelles
                  </button>
                </form>
              )}
            </div>
          );
        })}
      </div>

      <Pagination
        page={pageActuelle}
        totalPages={totalPages}
        hrefPourPage={(p) => `/tableau-de-bord/clients?page=${p}`}
      />
    </div>
  );
}
