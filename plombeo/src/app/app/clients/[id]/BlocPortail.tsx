"use client";

import { useActionState } from "react";
import { Bouton, Carte, Message } from "@/components/ui";
import { creerAccesPortail, revoquerAccesPortail, type EtatAcces } from "../acces-actions";

const etatInitial: EtatAcces = {};

export function BlocPortail({
  clientId,
  actif,
  vuLe,
}: {
  clientId: string;
  actif: boolean;
  vuLe: Date | null;
}) {
  const [etat, envoyer, enCours] = useActionState(creerAccesPortail, etatInitial);

  return (
    <Carte>
      <h2 className="font-semibold mb-1">Espace client</h2>
      <p className="text-sm text-attenue mb-3">
        {actif
          ? "Un lien est actif. Votre client peut consulter ses devis et ses factures, et accepter un devis."
          : "Créez un lien personnel pour que votre client consulte ses documents sans vous appeler."}
      </p>
      {actif && (
        <p className="text-sm text-attenue mb-3">
          {vuLe
            ? `Dernière consultation le ${new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(vuLe)}.`
            : "Jamais consulté pour l'instant."}
        </p>
      )}

      {etat.erreur && <Message ton="erreur">{etat.erreur}</Message>}
      {etat.succes && <Message ton="succes">{etat.succes}</Message>}

      {/* Le lien n'est montré QU'UNE FOIS : la base n'en garde que l'empreinte,
          il est donc impossible de le réafficher plus tard. */}
      {etat.lien && (
        <div className="mt-3">
          <p className="text-sm font-semibold">Copiez ce lien maintenant :</p>
          <p className="text-sm break-all bg-fond border border-trait rounded-controle p-3 mt-1">
            {etat.lien}
          </p>
          <p className="text-sm text-attenue mt-2">
            Il ne sera plus affiché. Traitez-le comme un mot de passe : il donne accès aux
            documents de ce client.
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mt-3">
        <form action={envoyer}>
          <input type="hidden" name="clientId" value={clientId} />
          <Bouton type="submit" variante="discret" disabled={enCours}>
            {enCours ? "Création…" : actif ? "Créer un nouveau lien" : "Créer un lien"}
          </Bouton>
        </form>
        {actif && (
          <form action={revoquerAccesPortail}>
            <input type="hidden" name="clientId" value={clientId} />
            <Bouton type="submit" variante="discret">
              Révoquer l&apos;accès
            </Bouton>
          </form>
        )}
      </div>
    </Carte>
  );
}
