import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ClientForm } from "../ClientForm";
import { modifierClient, supprimerClient } from "../actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { DevisRow } from "@/components/DevisRow";
import { btnPrimaire, btnDanger } from "@/lib/ui";

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { user } = await requireUser();
  const { id } = await params;
  const { erreur } = await searchParams;

  const client = await prisma.client.findFirst({
    where: { id, userId: user.id },
    include: {
      devis: { orderBy: { dateDevis: "desc" } },
    },
  });
  if (!client) notFound();

  return (
    <div>
      <Link href="/tableau-de-bord/clients" className="text-sm text-muted hover:text-brand">
        ← Clients
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3 mt-2 mb-6">
        <h1 className="text-2xl font-bold">{client.nom}</h1>
        <Link
          href={`/tableau-de-bord/devis/nouveau?client=${client.id}`}
          className={btnPrimaire}
        >
          + Nouveau devis
        </Link>
      </div>

      {erreur === "devis" && (
        <p className="mb-5 rounded-control bg-danger-l text-danger px-4 py-3 text-sm">
          Impossible de supprimer ce client : il est rattaché à des devis. Supprimez
          d’abord ses devis.
        </p>
      )}

      <section className="mb-8">
        <h2 className="font-bold text-lg mb-3">Fiche client</h2>
        <ClientForm
          action={modifierClient.bind(null, client.id)}
          client={client}
          submitLabel="Enregistrer"
        />
      </section>

      <section className="mb-8">
        <h2 className="font-bold text-lg mb-3">
          Historique des devis ({client.devis.length})
        </h2>
        {client.devis.length === 0 ? (
          <p className="text-muted italic">Aucun devis pour ce client.</p>
        ) : (
          <ul className="grid gap-2">
            {client.devis.map((d) => (
              <li key={d.id}>
                <DevisRow devis={d} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border-t border-line pt-6">
        <ConfirmButton
          action={supprimerClient.bind(null, client.id)}
          message={`Supprimer définitivement le client « ${client.nom} » ?`}
          className={btnDanger}
        >
          Supprimer ce client
        </ConfirmButton>
      </section>
    </div>
  );
}
