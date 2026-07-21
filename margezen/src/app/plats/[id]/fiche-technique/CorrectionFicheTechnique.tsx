"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  coefficientMultiplicateur,
  coutMatierePortion,
  margeBrutePct,
  prixVenteHT,
  type LigneFicheTechnique,
  type PrixIngredient,
} from "@/lib/marge";
import { validerFicheTechnique, type LigneFicheAValider } from "./actions";

export type Unite = "kg" | "L" | "piece";

export interface LigneCorrigible {
  cle: string;
  ingredientId: string | null;
  nomIngredient: string;
  quantite: number;
  unite: Unite;
  prixUnitaireCts: number | null;
}

function limitesCurseur(ligne: LigneCorrigible): { max: number; step: number } {
  if (ligne.unite === "piece") {
    return { max: Math.max(ligne.quantite * 3, 5), step: 1 };
  }
  return { max: Math.max(ligne.quantite * 3, 0.05), step: 0.005 };
}

function formaterCentimes(centimes: number | null): string {
  if (centimes === null) return "—";
  return `${(centimes / 100).toFixed(2)} €`;
}

export function CorrectionFicheTechnique({
  platId,
  etablissementId,
  platNom,
  prixVenteTtcCts,
  tauxTva,
  margeCibleSolidesPct,
  noteIA,
  lignesInitiales,
  platSuivantId,
}: {
  platId: string;
  etablissementId: string;
  platNom: string;
  prixVenteTtcCts: number | null;
  tauxTva: number;
  margeCibleSolidesPct: number;
  noteIA: string | null;
  lignesInitiales: LigneCorrigible[];
  platSuivantId: string | null;
}) {
  const router = useRouter();
  const [lignes, setLignes] = useState<LigneCorrigible[]>(lignesInitiales);
  const [enCours, demarrerTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);

  function mettreAJour(cle: string, champs: Partial<LigneCorrigible>) {
    setLignes((precedent) =>
      precedent.map((ligne) => (ligne.cle === cle ? { ...ligne, ...champs } : ligne)),
    );
  }

  function supprimerLigne(cle: string) {
    setLignes((precedent) => precedent.filter((ligne) => ligne.cle !== cle));
  }

  function ajouterLigne() {
    setLignes((precedent) => [
      ...precedent,
      {
        cle: `nouveau-${Date.now()}`,
        ingredientId: null,
        nomIngredient: "",
        quantite: 0,
        unite: "kg",
        prixUnitaireCts: null,
      },
    ]);
  }

  const { resultatCout, margePct, coefficient } = useMemo(() => {
    const fiche: LigneFicheTechnique[] = lignes.map((ligne) => ({
      ingredientId: ligne.cle,
      quantite: ligne.quantite,
      unite: ligne.unite,
    }));
    const prixIngredients: Record<string, PrixIngredient> = {};
    for (const ligne of lignes) {
      if (ligne.prixUnitaireCts !== null) {
        prixIngredients[ligne.cle] = {
          prixUnitaireCts: ligne.prixUnitaireCts,
          uniteRef: ligne.unite,
        };
      }
    }
    const cout = coutMatierePortion(fiche, prixIngredients);

    if (!cout.complet || cout.coutCts === null || prixVenteTtcCts === null) {
      return { resultatCout: cout, margePct: null, coefficient: null };
    }

    const prixHT = prixVenteHT(prixVenteTtcCts, tauxTva);
    return {
      resultatCout: cout,
      margePct: margeBrutePct(prixHT, cout.coutCts),
      coefficient: coefficientMultiplicateur(prixVenteTtcCts, cout.coutCts),
    };
  }, [lignes, prixVenteTtcCts, tauxTva]);

  const margeSousCible = margePct !== null && margePct < margeCibleSolidesPct;

  function surValidation() {
    setErreur(null);
    demarrerTransition(async () => {
      try {
        const lignesAValider: LigneFicheAValider[] = lignes
          .filter((ligne) => ligne.nomIngredient.trim().length > 0 && ligne.quantite > 0)
          .map((ligne) => ({
            ingredientId: ligne.ingredientId,
            nomIngredient: ligne.nomIngredient,
            quantite: ligne.quantite,
            unite: ligne.unite,
            prixUnitaireCts: ligne.prixUnitaireCts,
          }));

        await validerFicheTechnique(platId, etablissementId, lignesAValider);

        router.push(
          platSuivantId ? `/plats/${platSuivantId}/fiche-technique` : "/carte",
        );
      } catch (erreurValidation) {
        setErreur(
          erreurValidation instanceof Error
            ? erreurValidation.message
            : "L'enregistrement a échoué.",
        );
      }
    });
  }

  return (
    <main className="flex min-h-dvh flex-col bg-[var(--color-fond)] text-[var(--color-texte)]">
      <header className="px-4 py-4">
        <h1 className="font-[family-name:var(--font-display)] text-2xl">{platNom}</h1>
        <p className="mt-1 text-sm text-[var(--color-texte)]/70">
          Corrige la fiche technique proposée par plat.
        </p>
        {noteIA && (
          <p className="mt-2 rounded bg-[var(--color-surface)] p-2 text-xs text-[var(--color-attention)]">
            {noteIA}
          </p>
        )}
      </header>

      <div className="mx-4 mb-3 grid grid-cols-3 gap-2 rounded-md bg-[var(--color-surface)] p-3 text-center font-[family-name:var(--font-mono)]">
        <div>
          <p className="text-[10px] uppercase text-[var(--color-texte)]/60">Coût matière</p>
          <p className="text-lg">{formaterCentimes(resultatCout.coutCts)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-[var(--color-texte)]/60">Marge brute</p>
          <p
            className={`text-lg ${
              margePct === null
                ? ""
                : margeSousCible
                  ? "text-[var(--color-alerte)]"
                  : "text-[var(--color-positif)]"
            }`}
          >
            {margePct === null ? "—" : `${margePct.toFixed(1)} %`}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-[var(--color-texte)]/60">Coefficient</p>
          <p className="text-lg">{coefficient === null ? "—" : `× ${coefficient.toFixed(1)}`}</p>
        </div>
      </div>

      <ul className="flex-1 space-y-3 px-4 pb-40">
        {lignes.map((ligne) => {
          const { max, step } = limitesCurseur(ligne);
          return (
            <li key={ligne.cle} className="rounded-md bg-[var(--color-surface)] p-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Nom de l'ingrédient"
                  className="h-11 flex-1 rounded border border-[var(--color-texte)]/20 bg-[var(--color-fond)] px-2 text-sm text-[var(--color-texte)]"
                  value={ligne.nomIngredient}
                  onChange={(evenement) =>
                    mettreAJour(ligne.cle, { nomIngredient: evenement.target.value })
                  }
                />
                <button
                  type="button"
                  aria-label="Retirer cet ingrédient"
                  onClick={() => supprimerLigne(ligne.cle)}
                  className="flex h-11 w-11 items-center justify-center rounded text-[var(--color-alerte)]"
                >
                  ✕
                </button>
              </div>

              {!ligne.ingredientId && (
                <p className="mt-1 text-xs text-[var(--color-attention)]">Nouvel ingrédient</p>
              )}

              <div className="mt-2 flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={max}
                  step={step}
                  value={ligne.quantite}
                  onChange={(evenement) =>
                    mettreAJour(ligne.cle, { quantite: Number(evenement.target.value) })
                  }
                  className="h-11 flex-1"
                />
                <input
                  type="number"
                  inputMode="decimal"
                  step={step}
                  className="h-11 w-24 rounded border border-[var(--color-texte)]/20 bg-[var(--color-fond)] px-2 font-[family-name:var(--font-mono)] text-[var(--color-texte)]"
                  value={ligne.quantite}
                  onChange={(evenement) =>
                    mettreAJour(ligne.cle, { quantite: Number(evenement.target.value) })
                  }
                />
                <select
                  className="h-11 rounded border border-[var(--color-texte)]/20 bg-[var(--color-fond)] px-2 text-[var(--color-texte)]"
                  value={ligne.unite}
                  onChange={(evenement) =>
                    mettreAJour(ligne.cle, { unite: evenement.target.value as Unite })
                  }
                >
                  <option value="kg">kg</option>
                  <option value="L">L</option>
                  <option value="piece">pièce</option>
                </select>
              </div>

              <div className="mt-2 flex items-center gap-2 text-xs text-[var(--color-texte)]/70">
                <label className="flex flex-1 items-center gap-2">
                  Prix unitaire (€/{ligne.unite === "piece" ? "pièce" : ligne.unite})
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    placeholder="—"
                    className="h-11 flex-1 rounded border border-[var(--color-texte)]/20 bg-[var(--color-fond)] px-2 font-[family-name:var(--font-mono)] text-[var(--color-texte)]"
                    value={
                      ligne.prixUnitaireCts !== null
                        ? (ligne.prixUnitaireCts / 100).toFixed(2)
                        : ""
                    }
                    onChange={(evenement) =>
                      mettreAJour(ligne.cle, {
                        prixUnitaireCts:
                          evenement.target.value === ""
                            ? null
                            : Math.round(Number(evenement.target.value) * 100),
                      })
                    }
                  />
                </label>
              </div>
              {ligne.prixUnitaireCts === null && (
                <p className="mt-1 text-xs text-[var(--color-alerte)]">
                  Prix inconnu — complète-le pour inclure cet ingrédient dans le coût.
                </p>
              )}
            </li>
          );
        })}

        <li>
          <button
            type="button"
            onClick={ajouterLigne}
            className="h-11 w-full rounded-md border border-dashed border-[var(--color-texte)]/30 text-sm text-[var(--color-texte)]/70"
          >
            + Ajouter un ingrédient
          </button>
        </li>
      </ul>

      <div className="fixed inset-x-0 bottom-0 border-t border-[var(--color-texte)]/10 bg-[var(--color-fond)] p-4">
        {erreur && <p className="mb-2 text-sm text-[var(--color-alerte)]">{erreur}</p>}
        <button
          type="button"
          onClick={surValidation}
          disabled={enCours}
          className="h-14 w-full rounded-md bg-[var(--color-positif)] text-base font-semibold text-[var(--color-fond)] disabled:opacity-60"
        >
          {enCours ? "Enregistrement…" : "Cette fiche est bonne"}
        </button>
      </div>
    </main>
  );
}
