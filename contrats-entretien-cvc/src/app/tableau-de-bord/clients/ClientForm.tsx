"use client";

import { useActionState } from "react";
import { champ, label, btnPrimaire, btnSecondaire } from "@/lib/ui";
import type { ClientFormState } from "./actions";

const initialState: ClientFormState = {};

export function ClientForm({
  action,
  valeurs,
  onAnnuler,
}: {
  action: (prev: ClientFormState, formData: FormData) => Promise<ClientFormState>;
  valeurs?: {
    nom: string;
    adresse: string;
    codePostal: string;
    ville: string;
    telephone: string;
    email: string;
    notes: string;
  };
  onAnnuler?: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label className={label} htmlFor="nom">
          Nom du client *
        </label>
        <input id="nom" name="nom" required defaultValue={valeurs?.nom} className={champ} placeholder="Dupont Jean" />
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="sm:col-span-3">
          <label className={label} htmlFor="adresse">
            Adresse
          </label>
          <input id="adresse" name="adresse" defaultValue={valeurs?.adresse} className={champ} />
        </div>
        <div>
          <label className={label} htmlFor="codePostal">
            Code postal
          </label>
          <input id="codePostal" name="codePostal" defaultValue={valeurs?.codePostal} className={champ} />
        </div>
        <div className="sm:col-span-2">
          <label className={label} htmlFor="ville">
            Ville
          </label>
          <input id="ville" name="ville" defaultValue={valeurs?.ville} className={champ} />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={label} htmlFor="telephone">
            Téléphone
          </label>
          <input
            id="telephone"
            name="telephone"
            type="tel"
            inputMode="tel"
            defaultValue={valeurs?.telephone}
            className={champ}
          />
        </div>
        <div>
          <label className={label} htmlFor="email">
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            defaultValue={valeurs?.email}
            className={champ}
          />
        </div>
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

      <div className="flex gap-3">
        <button type="submit" disabled={pending} className={btnPrimaire}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
        {onAnnuler && (
          <button type="button" onClick={onAnnuler} className={btnSecondaire}>
            Annuler
          </button>
        )}
      </div>
    </form>
  );
}
