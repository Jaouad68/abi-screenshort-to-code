"use client";

import { useActionState } from "react";
import { champ, label, btnPrimaire } from "@/lib/ui";
import { TYPES_EQUIPEMENT_SUGGERES } from "@/lib/defaults";
import type { EquipementFormState } from "./actions";

const initialState: EquipementFormState = {};

export function EquipementForm({
  action,
  valeurs,
}: {
  action: (prev: EquipementFormState, formData: FormData) => Promise<EquipementFormState>;
  valeurs?: {
    type: string;
    marque: string;
    modele: string;
    numeroSerie: string;
    localisation: string;
    dateInstallation: string;
    notes: string;
  };
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <datalist id="types-equipement">
        {TYPES_EQUIPEMENT_SUGGERES.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>

      <div>
        <label className={label} htmlFor="type">
          Type d&apos;équipement
        </label>
        <input
          id="type"
          name="type"
          list="types-equipement"
          defaultValue={valeurs?.type}
          className={champ}
          placeholder="Chaudière gaz"
        />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={label} htmlFor="marque">
            Marque
          </label>
          <input id="marque" name="marque" defaultValue={valeurs?.marque} className={champ} />
        </div>
        <div>
          <label className={label} htmlFor="modele">
            Modèle
          </label>
          <input id="modele" name="modele" defaultValue={valeurs?.modele} className={champ} />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={label} htmlFor="numeroSerie">
            N° de série
          </label>
          <input id="numeroSerie" name="numeroSerie" defaultValue={valeurs?.numeroSerie} className={champ} />
        </div>
        <div>
          <label className={label} htmlFor="localisation">
            Localisation
          </label>
          <input
            id="localisation"
            name="localisation"
            defaultValue={valeurs?.localisation}
            className={champ}
            placeholder="Sous-sol, local technique…"
          />
        </div>
      </div>
      <div>
        <label className={label} htmlFor="dateInstallation">
          Date d&apos;installation
        </label>
        <input
          id="dateInstallation"
          name="dateInstallation"
          type="date"
          defaultValue={valeurs?.dateInstallation}
          className={champ}
        />
      </div>
      <div>
        <label className={label} htmlFor="notes">
          Notes
        </label>
        <textarea id="notes" name="notes" rows={3} defaultValue={valeurs?.notes} className={champ} />
      </div>

      {state.error && (
        <p className="text-danger text-sm" role="alert">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className={btnPrimaire}>
        {pending ? "Enregistrement…" : "Enregistrer"}
      </button>
    </form>
  );
}
