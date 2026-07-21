import Link from "next/link";
import { creerClientServeur } from "@/lib/supabase/server";

interface PlatAvecFiche {
  id: string;
  nom: string;
  categorie: string;
  prix_vente_ttc_cts: number | null;
  fiche_technique: { count: number }[];
}

function formaterPrix(cts: number | null): string {
  return cts === null ? "—" : `${(cts / 100).toFixed(2)} €`;
}

export default async function CartePage({
  searchParams,
}: {
  searchParams: Promise<{ etablissement?: string }>;
}) {
  const { etablissement: etablissementId } = await searchParams;

  if (!etablissementId) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[var(--color-fond)] px-6 text-center text-[var(--color-texte)]">
        <p>Aucun établissement sélectionné.</p>
        <Link
          href="/carte/importer"
          className="flex h-14 items-center justify-center rounded-md bg-[var(--color-positif)] px-6 text-[var(--color-fond)]"
        >
          Importer une carte
        </Link>
      </main>
    );
  }

  const supabase = await creerClientServeur();
  const { data: plats } = await supabase
    .from("plat")
    .select("id, nom, categorie, prix_vente_ttc_cts, fiche_technique(count)")
    .eq("etablissement_id", etablissementId)
    .eq("actif", true)
    .order("categorie", { ascending: true })
    .returns<PlatAvecFiche[]>();

  const listePlats = plats ?? [];
  const platsSansFiche = listePlats.filter(
    (plat) => (plat.fiche_technique?.[0]?.count ?? 0) === 0,
  );

  return (
    <main className="flex min-h-dvh flex-col bg-[var(--color-fond)] text-[var(--color-texte)]">
      <header className="px-4 py-4">
        <h1 className="font-[family-name:var(--font-display)] text-2xl">Ma carte</h1>
        <p className="mt-1 text-sm text-[var(--color-texte)]/70">
          {listePlats.length} plat{listePlats.length > 1 ? "s" : ""}
          {platsSansFiche.length > 0 &&
            ` — ${platsSansFiche.length} sans fiche technique`}
        </p>
      </header>

      {platsSansFiche.length > 0 && (
        <div className="px-4">
          <Link
            href={`/plats/${platsSansFiche[0]!.id}/fiche-technique`}
            className="flex h-14 items-center justify-center rounded-md bg-[var(--color-attention)] px-4 text-center font-semibold text-[var(--color-fond)]"
          >
            Continuer les fiches techniques ({platsSansFiche.length} restantes)
          </Link>
        </div>
      )}

      <ul className="flex-1 space-y-2 px-4 py-4">
        {listePlats.map((plat) => {
          const aUneFiche = (plat.fiche_technique?.[0]?.count ?? 0) > 0;
          return (
            <li key={plat.id}>
              <Link
                href={`/plats/${plat.id}/fiche-technique`}
                className="flex items-center justify-between rounded-md bg-[var(--color-surface)] p-3"
              >
                <span>
                  <span className="block text-sm font-medium">{plat.nom}</span>
                  <span className="block text-xs text-[var(--color-texte)]/60">
                    {plat.categorie}
                  </span>
                </span>
                <span className="flex items-center gap-2 font-[family-name:var(--font-mono)] text-sm">
                  {formaterPrix(plat.prix_vente_ttc_cts)}
                  {!aUneFiche && (
                    <span className="rounded bg-[var(--color-attention)]/20 px-2 py-0.5 text-xs text-[var(--color-attention)]">
                      sans fiche
                    </span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
