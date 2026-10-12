"use client";

import { useActionState } from "react";
import { champ, label, btnPrimaire } from "@/lib/ui";
import { creerUtilisateur, type CreerUtilisateurState } from "./actions";

const initialState: CreerUtilisateurState = {};

export function CreerUtilisateurForm() {
  const [state, formAction, pending] = useActionState(creerUtilisateur, initialState);

  return (
    <div>
      <form action={formAction} className="flex flex-col gap-4" key={state.cree?.email ?? "form"}>
        <div>
          <label className={label} htmlFor="nom">
            Nom
          </label>
          <input id="nom" name="nom" required className={champ} placeholder="Marie Martin" />
        </div>
        <div>
          <label className={label} htmlFor="email">
            E-mail
          </label>
          <input id="email" type="email" name="email" required className={champ} placeholder="marie@entreprise.fr" />
        </div>
        <div>
          <label className={label} htmlFor="role">
            Rôle
          </label>
          <select id="role" name="role" defaultValue="TECHNICIEN" className={champ}>
            <option value="ADMINISTRATIF">Administratif</option>
            <option value="TECHNICIEN">Technicien</option>
          </select>
        </div>
        {state.error && <p className="text-danger text-sm">{state.error}</p>}
        <button type="submit" disabled={pending} className={btnPrimaire}>
          {pending ? "Création…" : "Créer le compte"}
        </button>
      </form>

      {state.cree && (
        <div className="mt-4 rounded-control bg-ok-l border border-ok/30 p-4 text-sm">
          <p className="font-semibold text-ink mb-1">Compte créé pour {state.cree.nom}</p>
          <p>
            E-mail : <span className="font-mono">{state.cree.email}</span>
          </p>
          <p>
            Mot de passe temporaire : <span className="font-mono font-bold">{state.cree.motDePasse}</span>
          </p>
          <p className="text-xs text-ink-2 mt-2">
            Notez-le maintenant : il ne sera plus affiché. Transmettez-le à la
            personne par un canal sécurisé (aucun e-mail n&apos;est envoyé
            automatiquement dans cette version).
          </p>
        </div>
      )}
    </div>
  );
}
