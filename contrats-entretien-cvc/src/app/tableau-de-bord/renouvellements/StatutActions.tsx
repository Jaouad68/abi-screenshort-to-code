"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { changerStatutSimple, renouvelerContrat, type StatutActionState } from "./actions";
import { champ, label, btnPrimaire, btnSecondaire, btnPetit } from "@/lib/ui";
import { prochaineEcheance } from "@/lib/echeance";
import { toInputDate } from "@/lib/date";
import type { Periodicite, StatutRenouvellement } from "@/generated/prisma/client";

const initialState: StatutActionState = {};

/** Boutons de suivi du renouvellement — utilisés à la fois sur la fiche
 * contrat et dans la liste des renouvellements. */
export function StatutActions({
  contratId,
  statutActuel,
  dateEcheance,
  periodicite,
  compact = false,
}: {
  contratId: string;
  statutActuel: StatutRenouvellement;
  dateEcheance: Date;
  periodicite: Periodicite;
  compact?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [renouvellementOuvert, setRenouvellementOuvert] = useState(false);

  function simple(statut: "A_CONTACTER" | "CONTACTE" | "PERDU") {
    const commentaire = window.prompt("Commentaire (optionnel)") ?? "";
    startTransition(() => {
      changerStatutSimple(contratId, statut, commentaire);
    });
  }

  const btnCls = compact ? btnPetit : btnSecondaire;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {statutActuel !== "A_CONTACTER" && (
          <button type="button" disabled={pending} onClick={() => simple("A_CONTACTER")} className={btnCls}>
            À contacter
          </button>
        )}
        {statutActuel !== "CONTACTE" && (
          <button type="button" disabled={pending} onClick={() => simple("CONTACTE")} className={btnCls}>
            Marquer contacté
          </button>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={() => setRenouvellementOuvert((v) => !v)}
          className={compact ? btnPetit : btnPrimaire}
        >
          Renouvelé
        </button>
        {statutActuel !== "PERDU" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => simple("PERDU")}
            className={`${btnCls} text-danger`}
          >
            Perdu
          </button>
        )}
      </div>

      {renouvellementOuvert && (
        <FormulaireRenouvellement
          contratId={contratId}
          dateEcheance={dateEcheance}
          periodicite={periodicite}
          onTermine={() => setRenouvellementOuvert(false)}
        />
      )}
    </div>
  );
}

function FormulaireRenouvellement({
  contratId,
  dateEcheance,
  periodicite,
  onTermine,
}: {
  contratId: string;
  dateEcheance: Date;
  periodicite: Periodicite;
  onTermine: () => void;
}) {
  const [state, formAction, pending] = useActionState(renouvelerContrat.bind(null, contratId), initialState);
  const suggestion = prochaineEcheance(dateEcheance, periodicite);

  useEffect(() => {
    if (state.ok) onTermine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok]);

  return (
    <form action={formAction} className="rounded-control border border-line bg-bg p-4 flex flex-col gap-3">
      <p className="text-sm font-semibold text-ink-2">Confirmer le renouvellement</p>
      <div>
        <label className={label} htmlFor={`echeance-${contratId}`}>
          Nouvelle échéance
        </label>
        <input
          id={`echeance-${contratId}`}
          name="nouvelleEcheance"
          type="date"
          required
          defaultValue={suggestion ? toInputDate(suggestion) : ""}
          className={champ}
        />
      </div>
      <div>
        <label className={label} htmlFor={`commentaire-${contratId}`}>
          Commentaire (optionnel)
        </label>
        <input id={`commentaire-${contratId}`} name="commentaire" className={champ} />
      </div>
      {state.error && <p className="text-danger text-sm">{state.error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={btnPrimaire}>
          {pending ? "Enregistrement…" : "Confirmer"}
        </button>
        <button type="button" onClick={onTermine} className={btnSecondaire}>
          Annuler
        </button>
      </div>
    </form>
  );
}
