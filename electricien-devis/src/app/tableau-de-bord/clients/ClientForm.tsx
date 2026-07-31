"use client";

import { useActionState } from "react";
import type { Client } from "@/generated/prisma/client";
import type { ClientFormState } from "./actions";
import { champ, label, btnPrimaire } from "@/lib/ui";

type Action = (prev: ClientFormState, formData: FormData) => Promise<ClientFormState>;

const initialState: ClientFormState = {};

export function ClientForm({
  action,
  client,
  submitLabel,
}: {
  action: Action;
  client?: Client;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="grid gap-4">
      <div>
        <label className={label} htmlFor="nom">
          Nom du client / chantier *
        </label>
        <input id="nom" name="nom" required defaultValue={client?.nom ?? ""} className={champ} placeholder="M. et Mme Dupont" />
      </div>
      <div>
        <label className={label} htmlFor="adresse">
          Adresse
        </label>
        <input id="adresse" name="adresse" defaultValue={client?.adresse ?? ""} className={champ} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={label} htmlFor="codePostal">
            Code postal
          </label>
          <input id="codePostal" name="codePostal" defaultValue={client?.codePostal ?? ""} className={champ} inputMode="numeric" />
        </div>
        <div className="col-span-2">
          <label className={label} htmlFor="ville">
            Ville
          </label>
          <input id="ville" name="ville" defaultValue={client?.ville ?? ""} className={champ} />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className={label} htmlFor="telephone">
            Téléphone
          </label>
          <input id="telephone" name="telephone" defaultValue={client?.telephone ?? ""} className={champ} inputMode="tel" />
        </div>
        <div>
          <label className={label} htmlFor="email">
            E-mail
          </label>
          <input id="email" name="email" defaultValue={client?.email ?? ""} className={champ} inputMode="email" />
        </div>
      </div>
      <div>
        <label className={label} htmlFor="notes">
          Notes (accès, étage, code…)
        </label>
        <textarea id="notes" name="notes" rows={3} defaultValue={client?.notes ?? ""} className={champ} />
      </div>

      {state.error && <p className="text-danger text-sm" role="alert">{state.error}</p>}
      {state.ok && <p className="text-ok text-sm font-semibold">✓ Enregistré</p>}

      <div>
        <button type="submit" disabled={pending} className={btnPrimaire}>
          {pending ? "Enregistrement…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
