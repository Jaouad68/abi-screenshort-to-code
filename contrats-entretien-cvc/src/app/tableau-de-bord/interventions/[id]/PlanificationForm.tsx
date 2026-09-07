"use client";

import { useActionState } from "react";
import { champ, label, btnPrimaire } from "@/lib/ui";
import { modifierPlanification, type InterventionFormState } from "../actions";
import { toInputDateTime } from "@/lib/date";

const initialState: InterventionFormState = {};

export function PlanificationForm({
  interventionId,
  titre,
  datePrevue,
  technicienId,
  techniciens,
}: {
  interventionId: string;
  titre: string;
  datePrevue: Date;
  technicienId: string;
  techniciens: { id: string; nom: string }[];
}) {
  const [state, formAction, pending] = useActionState(modifierPlanification.bind(null, interventionId), initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label className={label} htmlFor="titre">
          Titre
        </label>
        <input id="titre" name="titre" required defaultValue={titre} className={champ} />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={label} htmlFor="datePrevue">
            Date et heure
          </label>
          <input
            id="datePrevue"
            name="datePrevue"
            type="datetime-local"
            required
            defaultValue={toInputDateTime(datePrevue)}
            className={champ}
          />
        </div>
        <div>
          <label className={label} htmlFor="technicienId">
            Technicien affecté
          </label>
          <select id="technicienId" name="technicienId" defaultValue={technicienId} className={champ}>
            <option value="">Non affecté</option>
            {techniciens.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nom}
              </option>
            ))}
          </select>
        </div>
      </div>
      {state.error && <p className="text-danger text-sm">{state.error}</p>}
      <button type="submit" disabled={pending} className={btnPrimaire}>
        {pending ? "Enregistrement…" : "Mettre à jour"}
      </button>
    </form>
  );
}
