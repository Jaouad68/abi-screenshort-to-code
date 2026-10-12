"use client";

import { useActionState } from "react";
import { Bouton, Carte, Champ, Message, Selection } from "@/components/ui";
import { RESUME_ROLE } from "@/lib/roles";
import { inviterMembre, type EtatEquipe } from "./actions";

const etatInitial: EtatEquipe = {};

export function FormulaireInvitation({
  roles,
}: {
  roles: readonly { valeur: string; libelle: string }[];
}) {
  const [etat, action, enCours] = useActionState(inviterMembre, etatInitial);
  const cle = etat.tentative ?? 0;

  return (
    <Carte>
      <h2 className="font-semibold mb-1">Inviter quelqu&apos;un</h2>
      <p className="text-sm text-attenue mb-4">
        Aucun compte n&apos;est créé maintenant : la personne invitée choisit
        elle-même son mot de passe en acceptant le lien.
      </p>

      <form key={cle} action={action} className="flex flex-col gap-4" noValidate>
        <Champ
          id="email"
          name="email"
          type="email"
          libelle="Adresse e-mail"
          placeholder="apprenti@exemple.fr"
          inputMode="email"
          required
        />
        <Selection id="role" name="role" libelle="Rôle" options={roles} defaultValue="TECHNICIEN" />
        <p className="text-sm text-attenue -mt-2">
          Vous ne pouvez pas inviter à un rôle supérieur ou égal au vôtre.
        </p>

        {etat.erreur && <Message ton="erreur">{etat.erreur}</Message>}
        {etat.succes && <Message ton="succes">{etat.succes}</Message>}

        {/* Le lien n'est affiché QU'UNE FOIS : la base n'en garde que
            l'empreinte, exactement comme pour le portail client. */}
        {etat.lien && (
          <div className="rounded-controle border border-trait bg-fond p-3">
            <p className="text-sm font-semibold">Lien à transmettre</p>
            <p className="text-sm text-attenue mb-2">
              Copiez-le maintenant : il ne sera plus jamais affiché. Plombéo n&apos;envoie
              pas cet e-mail à votre place.
            </p>
            <code className="block text-xs break-all bg-white border border-trait rounded p-2">
              {etat.lien}
            </code>
          </div>
        )}

        <Bouton type="submit" disabled={enCours}>
          {enCours ? "Création…" : "Créer l'invitation"}
        </Bouton>
      </form>

      <details className="mt-4">
        <summary className="text-sm font-semibold cursor-pointer">
          Ce que permet chaque rôle
        </summary>
        <ul className="mt-2 flex flex-col gap-1.5">
          {roles.map((r) => (
            <li key={r.valeur} className="text-sm">
              <strong>{r.libelle}</strong> — {RESUME_ROLE[r.valeur]}
            </li>
          ))}
        </ul>
      </details>
    </Carte>
  );
}
