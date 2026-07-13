"use client";

import { useState, useTransition } from "react";
import { JOUR_LABELS, type Horaires, type Fenetre } from "@/lib/horaires";
import { enregistrerHoraires } from "./actions";

export function HorairesForm({ initialHoraires }: { initialHoraires: Horaires }) {
  const [horaires, setHoraires] = useState<Horaires>(initialHoraires);
  const [error, setError] = useState<string | undefined>();
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function updateFenetre(jourIndex: number, fenetreIndex: number, which: 0 | 1, value: string) {
    setSaved(false);
    setHoraires((prev) =>
      prev.map((jh, i) => {
        if (i !== jourIndex) return jh;
        const fenetres = jh.fenetres.map((f, j) => {
          if (j !== fenetreIndex) return f;
          const next: Fenetre = [...f] as Fenetre;
          next[which] = value;
          return next;
        });
        return { ...jh, fenetres };
      })
    );
  }

  function ajouterFenetre(jourIndex: number) {
    setSaved(false);
    setHoraires((prev) =>
      prev.map((jh, i) =>
        i === jourIndex ? { ...jh, fenetres: [...jh.fenetres, ["09:00", "18:00"]] } : jh
      )
    );
  }

  function retirerFenetre(jourIndex: number, fenetreIndex: number) {
    setSaved(false);
    setHoraires((prev) =>
      prev.map((jh, i) =>
        i === jourIndex
          ? { ...jh, fenetres: jh.fenetres.filter((_, j) => j !== fenetreIndex) }
          : jh
      )
    );
  }

  function enregistrer() {
    setError(undefined);
    startTransition(async () => {
      const result = await enregistrerHoraires(horaires);
      if (result.error) {
        setError(result.error);
      } else {
        setSaved(true);
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        {horaires.map((jh, jourIndex) => (
          <div
            key={jh.jour}
            className="bg-white rounded-card border border-line px-6 py-4 flex items-center gap-6"
          >
            <span className="w-28 font-semibold shrink-0">{JOUR_LABELS[jh.jour]}</span>

            <div className="flex-1 flex flex-wrap items-center gap-3">
              {jh.fenetres.length === 0 && (
                <span className="text-muted italic text-sm">Fermé</span>
              )}
              {jh.fenetres.map((fenetre, fenetreIndex) => (
                <div key={fenetreIndex} className="flex items-center gap-2">
                  <input
                    type="time"
                    value={fenetre[0]}
                    onChange={(e) => updateFenetre(jourIndex, fenetreIndex, 0, e.target.value)}
                    className="rounded-control border border-line px-2 py-1.5 min-h-[40px]"
                  />
                  <span className="text-muted">–</span>
                  <input
                    type="time"
                    value={fenetre[1]}
                    onChange={(e) => updateFenetre(jourIndex, fenetreIndex, 1, e.target.value)}
                    className="rounded-control border border-line px-2 py-1.5 min-h-[40px]"
                  />
                  <button
                    type="button"
                    onClick={() => retirerFenetre(jourIndex, fenetreIndex)}
                    aria-label="Retirer cette plage"
                    className="text-muted hover:text-danger px-1"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => ajouterFenetre(jourIndex)}
                className="text-sm font-semibold text-sage-d hover:underline"
              >
                + Ajouter une plage
              </button>
            </div>
          </div>
        ))}
      </div>

      {error && <p className="text-danger text-sm">{error}</p>}
      {saved && !pending && <p className="text-sage-d text-sm">Horaires enregistrés.</p>}

      <div>
        <button
          type="button"
          onClick={enregistrer}
          disabled={pending}
          className="rounded-pill bg-ink text-white px-6 py-3 font-semibold hover:bg-ink-2 transition-colors min-h-[48px] disabled:opacity-60"
        >
          {pending ? "Enregistrement..." : "Enregistrer les horaires"}
        </button>
      </div>
    </div>
  );
}
