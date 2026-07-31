import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { creerDevis } from "../actions";
import { champ, label, btnPrimaire } from "@/lib/ui";

export default async function NouveauDevisPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; erreur?: string }>;
}) {
  const { user } = await requireUser();
  const { client: clientPreselect, erreur } = await searchParams;

  const clients = await prisma.client.findMany({
    where: { userId: user.id },
    orderBy: { nom: "asc" },
    select: { id: true, nom: true },
  });

  return (
    <div>
      <Link href="/tableau-de-bord/devis" className="text-sm text-muted hover:text-brand">
        ← Devis
      </Link>
      <h1 className="text-2xl font-bold mt-2 mb-6">Nouveau devis</h1>

      {clients.length === 0 ? (
        <div className="rounded-card border border-line bg-card p-6">
          <p className="mb-4">Créez d’abord un client pour établir un devis.</p>
          <Link href="/tableau-de-bord/clients/nouveau" className={btnPrimaire}>
            + Créer un client
          </Link>
        </div>
      ) : (
        <form action={creerDevis} className="grid gap-4 max-w-lg">
          {erreur === "client" && (
            <p className="text-danger text-sm">Veuillez sélectionner un client.</p>
          )}
          <div>
            <label className={label} htmlFor="clientId">
              Client *
            </label>
            <select
              id="clientId"
              name="clientId"
              required
              defaultValue={clientPreselect ?? ""}
              className={champ}
            >
              <option value="" disabled>
                Choisir un client…
              </option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="objet">
              Objet des travaux (optionnel)
            </label>
            <input
              id="objet"
              name="objet"
              className={champ}
              placeholder="Rénovation électrique appartement"
            />
          </div>
          <div>
            <button type="submit" className={btnPrimaire}>
              Créer et remplir le devis
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
