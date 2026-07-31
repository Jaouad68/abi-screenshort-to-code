"use client";

import { useState } from "react";
import { renommerPraticien, basculerActifPraticien, supprimerPraticien } from "./actions";

export function PraticienRow({
  praticien,
}: {
  praticien: { id: string; nom: string; actif: boolean };
}) {
  const [enEdition, setEnEdition] = useState(false);

  if (enEdition) {
    return (
      <form
        action={async (formData) => {
          await renommerPraticien(praticien.id, formData);
          setEnEdition(false);
        }}
        className="flex items-center gap-3 bg-paper rounded-card border border-line px-6 py-4"
      >
        <input
          name="nom"
          defaultValue={praticien.nom}
          required
          minLength={2}
          autoFocus
          className="rounded-control border border-line px-3 py-2 min-h-[40px] flex-1"
        />
        <button type="submit" className="text-sm font-semibold text-sage-d hover:underline">
          Enregistrer
        </button>
        <button
          type="button"
          onClick={() => setEnEdition(false)}
          className="text-sm font-semibold text-muted hover:text-ink"
        >
          Annuler
        </button>
      </form>
    );
  }

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 bg-paper rounded-card border border-line px-6 py-4 ${
        praticien.actif ? "" : "opacity-50"
      }`}
    >
      <p className="font-semibold">
        {praticien.nom}
        {!praticien.actif && <span className="ml-2 text-xs uppercase text-muted">Désactivé</span>}
      </p>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => setEnEdition(true)}
          className="text-sm font-semibold text-sage-d hover:underline"
        >
          Renommer
        </button>
        <form action={basculerActifPraticien.bind(null, praticien.id)}>
          <button type="submit" className="text-sm font-semibold text-muted hover:text-ink">
            {praticien.actif ? "Désactiver" : "Activer"}
          </button>
        </form>
        <form action={supprimerPraticien.bind(null, praticien.id)}>
          <button type="submit" className="text-sm font-semibold text-danger hover:underline">
            Supprimer
          </button>
        </form>
      </div>
    </div>
  );
}
