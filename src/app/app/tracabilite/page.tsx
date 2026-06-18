import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { PageHeader, EmptyState, StatutBadge, ImmutableNote } from "@/components/ui";
import { formatDateTime, formatDate } from "@/lib/labels";
import { ProduitForm } from "./ProduitForm";
import { cloturerProduit } from "./actions";

export const dynamic = "force-dynamic";

export default async function TracabilitePage() {
  const user = await requireUser();
  const now = new Date();

  const produits = await prisma.produitOuvert.findMany({
    where: { etablissementId: user.etablissementId, statut: "OUVERT" },
    include: { utilisateur: true },
    orderBy: { dlcSecondaire: "asc" },
  });

  const depasses = produits.filter((p) => p.dlcSecondaire < now).length;

  return (
    <div>
      <PageHeader
        title="Traçabilité / DLC"
        subtitle="Étiquetez les produits ouverts. La DLC secondaire est calculée automatiquement."
        action={
          depasses > 0 ? (
            <StatutBadge label={`${depasses} DLC dépassée(s)`} tone="danger" />
          ) : (
            <StatutBadge label="À jour ✓" tone="ok" />
          )
        }
      />

      <ProduitForm />

      <h2 className="mb-3 mt-8 text-lg font-bold text-slate-800">
        Produits ouverts <span className="text-slate-400">({produits.length})</span>
      </h2>

      {produits.length === 0 ? (
        <EmptyState icon="🏷️" title="Aucun produit ouvert" hint="Les étiquettes numériques apparaîtront ici." />
      ) : (
        <ul className="space-y-2">
          {produits.map((p) => {
            const depasse = p.dlcSecondaire < now;
            return (
              <li
                key={p.id}
                className={`card px-4 py-3 ${depasse ? "ring-2 ring-red-300" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800">{p.nom}</p>
                    <p className="text-xs text-slate-500">
                      Ouvert le {formatDateTime(p.dateOuverture)} · {p.utilisateur.nom}
                    </p>
                    <p className={`mt-1 text-sm font-semibold ${depasse ? "text-red-600" : "text-brand-700"}`}>
                      {depasse ? "⚠️ DLC dépassée le " : "À consommer avant le "}
                      {formatDate(p.dlcSecondaire)}
                    </p>
                  </div>
                  {depasse && <StatutBadge label="Dépassée" tone="danger" />}
                </div>
                <div className="mt-3 flex gap-2">
                  <form action={cloturerProduit} className="flex-1">
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="statut" value="CONSOMME" />
                    <button className="btn-secondary w-full py-2 text-sm">Marquer consommé</button>
                  </form>
                  <form action={cloturerProduit} className="flex-1">
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="statut" value="JETE" />
                    <button className="btn-secondary w-full py-2 text-sm">Marquer jeté</button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ImmutableNote />
    </div>
  );
}
