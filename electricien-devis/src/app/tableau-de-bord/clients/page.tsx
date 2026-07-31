import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { btnPrimaire } from "@/lib/ui";

export default async function ClientsPage() {
  const { user } = await requireUser();

  const clients = await prisma.client.findMany({
    where: { userId: user.id },
    orderBy: { nom: "asc" },
    include: { _count: { select: { devis: true } } },
  });

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-muted">
            {clients.length} client{clients.length > 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/tableau-de-bord/clients/nouveau" className={btnPrimaire}>
          + Client
        </Link>
      </div>

      {clients.length === 0 ? (
        <p className="text-muted italic">Aucun client pour le moment.</p>
      ) : (
        <ul className="grid gap-2">
          {clients.map((client) => (
            <li key={client.id}>
              <Link
                href={`/tableau-de-bord/clients/${client.id}`}
                className="flex items-center justify-between gap-3 rounded-card border border-line bg-card px-4 py-3.5 hover:border-brand transition"
              >
                <div className="min-w-0">
                  <p className="font-semibold truncate">{client.nom}</p>
                  <p className="text-sm text-muted truncate">
                    {[client.ville, client.telephone].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
                <span className="shrink-0 text-sm text-muted">
                  {client._count.devis} devis
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
