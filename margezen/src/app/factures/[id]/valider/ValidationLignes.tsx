"use client";

import { useState, useTransition } from "react";
import { validerFacture } from "./actions";

type Unite = "kg" | "L" | "piece" | "carton";

export interface LigneFactureRow {
  id: string;
  libelle_brut: string;
  quantite: number | null;
  unite: string | null;
  prix_unitaire_cts: number | null;
  confiance_ocr: number | null;
}

interface LigneEditable {
  id: string;
  libelleBrut: string;
  quantite: number | null;
  unite: Unite | null;
  prixUnitaireCts: number | null;
  confiance: number | null;
}

function versLigneEditable(ligne: LigneFactureRow): LigneEditable {
  return {
    id: ligne.id,
    libelleBrut: ligne.libelle_brut,
    quantite: ligne.quantite,
    unite: (ligne.unite as Unite | null) ?? null,
    prixUnitaireCts: ligne.prix_unitaire_cts,
    confiance: ligne.confiance_ocr,
  };
}

/** Lignes sous 0.7 en premier (à vérifier), puis par confiance croissante. */
function trierParConfiance(lignes: LigneFactureRow[]): LigneFactureRow[] {
  return [...lignes].sort(
    (a, b) => (a.confiance_ocr ?? 1) - (b.confiance_ocr ?? 1),
  );
}

function classeConfiance(confiance: number | null): string {
  if (confiance === null) {
    return "border-l-4 border-[var(--color-texte)]/30";
  }
  if (confiance < 0.7) {
    return "border-l-4 border-[var(--color-alerte)] bg-[var(--color-alerte)]/10";
  }
  if (confiance < 0.9) {
    return "border-l-4 border-[var(--color-attention)] bg-[var(--color-attention)]/10";
  }
  return "border-l-4 border-[var(--color-positif)] bg-[var(--color-positif)]/5";
}

export function ValidationLignes({
  factureId,
  fournisseur,
  lignesInitiales,
}: {
  factureId: string;
  fournisseur: string | null;
  lignesInitiales: LigneFactureRow[];
}) {
  const [lignes, setLignes] = useState<LigneEditable[]>(() =>
    trierParConfiance(lignesInitiales).map(versLigneEditable),
  );
  const [enCours, demarrerTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const [valide, setValide] = useState(false);

  function mettreAJourLigne(id: string, champs: Partial<LigneEditable>) {
    setLignes((precedent) =>
      precedent.map((ligne) => (ligne.id === id ? { ...ligne, ...champs } : ligne)),
    );
  }

  function surValidation() {
    setErreur(null);
    demarrerTransition(async () => {
      try {
        await validerFacture(
          factureId,
          lignes.map((ligne) => ({
            id: ligne.id,
            quantite: ligne.quantite,
            unite: ligne.unite,
            prixUnitaireCts: ligne.prixUnitaireCts,
          })),
        );
        setValide(true);
      } catch (erreurValidation) {
        setErreur(
          erreurValidation instanceof Error
            ? erreurValidation.message
            : "La validation a échoué.",
        );
      }
    });
  }

  if (valide) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-[var(--color-fond)] px-6 text-center text-[var(--color-texte)]">
        <p className="font-[family-name:var(--font-display)] text-2xl">
          Facture validée
        </p>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col bg-[var(--color-fond)] text-[var(--color-texte)]">
      <header className="px-4 py-4">
        <h1 className="font-[family-name:var(--font-display)] text-2xl">
          Valider la facture
        </h1>
        {fournisseur && (
          <p className="mt-1 text-sm text-[var(--color-texte)]/70">{fournisseur}</p>
        )}
      </header>

      <ul className="flex-1 space-y-2 px-4 pb-32">
        {lignes.map((ligne) => (
          <li
            key={ligne.id}
            className={`rounded-md bg-[var(--color-surface)] p-3 ${classeConfiance(ligne.confiance)}`}
          >
            <p className="text-sm font-medium">{ligne.libelleBrut}</p>
            {ligne.confiance !== null && ligne.confiance < 0.7 && (
              <p className="mt-0.5 text-xs text-[var(--color-alerte)]">
                Lecture incertaine — vérifie cette ligne
              </p>
            )}
            <div className="mt-2 grid grid-cols-3 gap-2">
              <label className="flex flex-col gap-1 text-xs text-[var(--color-texte)]/70">
                Quantité
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.001"
                  className="h-11 rounded border border-[var(--color-texte)]/20 bg-[var(--color-fond)] px-2 font-[family-name:var(--font-mono)] text-[var(--color-texte)]"
                  value={ligne.quantite ?? ""}
                  onChange={(evenement) =>
                    mettreAJourLigne(ligne.id, {
                      quantite:
                        evenement.target.value === ""
                          ? null
                          : Number(evenement.target.value),
                    })
                  }
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-[var(--color-texte)]/70">
                Unité
                <select
                  className="h-11 rounded border border-[var(--color-texte)]/20 bg-[var(--color-fond)] px-2 text-[var(--color-texte)]"
                  value={ligne.unite ?? ""}
                  onChange={(evenement) =>
                    mettreAJourLigne(ligne.id, {
                      unite: (evenement.target.value || null) as Unite | null,
                    })
                  }
                >
                  <option value="">—</option>
                  <option value="kg">kg</option>
                  <option value="L">L</option>
                  <option value="piece">pièce</option>
                  <option value="carton">carton</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-[var(--color-texte)]/70">
                Prix unit. HT (€)
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  className="h-11 rounded border border-[var(--color-texte)]/20 bg-[var(--color-fond)] px-2 font-[family-name:var(--font-mono)] text-[var(--color-texte)]"
                  value={
                    ligne.prixUnitaireCts !== null
                      ? (ligne.prixUnitaireCts / 100).toFixed(2)
                      : ""
                  }
                  onChange={(evenement) =>
                    mettreAJourLigne(ligne.id, {
                      prixUnitaireCts:
                        evenement.target.value === ""
                          ? null
                          : Math.round(Number(evenement.target.value) * 100),
                    })
                  }
                />
              </label>
            </div>
          </li>
        ))}
      </ul>

      <div className="fixed inset-x-0 bottom-0 border-t border-[var(--color-texte)]/10 bg-[var(--color-fond)] p-4">
        {erreur && (
          <p className="mb-2 text-sm text-[var(--color-alerte)]">{erreur}</p>
        )}
        <button
          type="button"
          onClick={surValidation}
          disabled={enCours}
          className="h-14 w-full rounded-md bg-[var(--color-positif)] text-base font-semibold text-[var(--color-fond)] disabled:opacity-60"
        >
          {enCours ? "Validation…" : "Valider la facture"}
        </button>
      </div>
    </main>
  );
}
