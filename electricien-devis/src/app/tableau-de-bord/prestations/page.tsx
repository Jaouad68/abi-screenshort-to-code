import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/money";
import { btnPrimaire } from "@/lib/ui";

export default async function PrestationsPage() {
  const { user } = await requireUser();

  const prestations = await prisma.prestation.findMany({
    where: { userId: user.id },
    orderBy: { libelle: "asc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-2">
        <h1 className="text-2xl font-bold">Catalogue</h1>
        <Link href="/tableau-de-bord/prestations/nouvelle" className={btnPrimaire}>
          + Prestation
        </Link>
      </div>
      <p className="text-muted mb-6">
        Vos prestations pré-enregistrées, ajoutables en un tap dans un devis.
      </p>

      {prestations.length === 0 ? (
        <p className="text-muted italic">Aucune prestation.</p>
      ) : (
        <ul className="grid gap-2">
          {prestations.map((p) => (
            <li key={p.id}>
              <Link
                href={`/tableau-de-bord/prestations/${p.id}`}
                className={`flex items-center justify-between gap-3 rounded-card border bg-card px-4 py-3.5 hover:border-brand transition ${
                  p.actif ? "border-line" : "border-line opacity-60"
                }`}
              >
                <div className="min-w-0">
                  <p className="font-semibold truncate">{p.libelle}</p>
                  <p className="text-sm text-muted">
                    TVA {p.tauxTva} %{!p.actif && " · masquée"}
                  </p>
                </div>
                <span className="shrink-0 text-right">
                  <span className="font-semibold tabular-nums">
                    {formatCents(p.prixUnitaireCents)}
                  </span>
                  <span className="text-muted text-sm"> /{p.unite}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
