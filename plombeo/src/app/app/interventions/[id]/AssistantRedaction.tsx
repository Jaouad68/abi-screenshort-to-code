"use client";

import { useActionState, useState } from "react";
import { Bouton, Carte, Message, ZoneTexte } from "@/components/ui";
import { proposerMiseAuPropre, accepterProposition, type EtatIA } from "./ia-actions";

const etatInitial: EtatIA = {};

/**
 * Assistant de rédaction.
 *
 * Trois choses que cet écran doit dire sans détour, parce qu'elles sont la
 * contrepartie du §22 :
 *  - ce que l'assistant fait, et surtout ce qu'il ne fait pas ;
 *  - que rien ne s'enregistre sans validation explicite ;
 *  - que le caviardage ne garantit pas l'anonymat.
 */
export function AssistantRedaction({
  interventionId,
  disponible,
  texteActuel,
}: {
  interventionId: string;
  disponible: boolean;
  texteActuel: string;
}) {
  const [etat, envoyer, enCours] = useActionState(proposerMiseAuPropre, etatInitial);
  const [ouvert, setOuvert] = useState(false);

  if (!ouvert) {
    return (
      <Bouton type="button" variante="discret" onClick={() => setOuvert(true)}>
        Assistant de rédaction
      </Bouton>
    );
  }

  return (
    <Carte>
      <h2 className="font-semibold mb-1">Assistant de rédaction</h2>

      <div className="text-sm bg-fond border border-trait rounded-controle p-3 mb-3">
        <p className="font-semibold">Ce que fait l&apos;assistant</p>
        <p className="mt-1">
          Il met votre texte au propre : orthographe, grammaire, phrases claires. Il
          conserve vos faits sans en ajouter.
        </p>
        <p className="font-semibold mt-2">Ce qu&apos;il ne fait pas</p>
        <p className="mt-1">
          Il ne pose <strong>aucun diagnostic</strong>, n&apos;émet aucune hypothèse sur
          la cause d&apos;une panne et ne propose aucun prix. Le jugement professionnel
          reste le vôtre.
        </p>
        <p className="mt-2">
          Rien n&apos;est enregistré sans votre validation. Les numéros et adresses
          évidents sont retirés avant l&apos;envoi, mais un texte libre peut toujours
          contenir un nom : relisez avant d&apos;envoyer.
        </p>
      </div>

      {!disponible ? (
        <Message ton="erreur">
          L&apos;assistant n&apos;est pas disponible : aucun fournisseur d&apos;intelligence
          artificielle n&apos;est configuré. Rien n&apos;est simulé.
        </Message>
      ) : (
        <>
          {etat.erreur && <Message ton="erreur">{etat.erreur}</Message>}
          {etat.succes && <Message ton="succes">{etat.succes}</Message>}

          {!etat.proposition ? (
            <form action={envoyer} className="flex flex-col gap-4">
              <input type="hidden" name="interventionId" value={interventionId} />
              <ZoneTexte
                id="texte-ia"
                name="texte"
                libelle="Votre texte"
                rows={6}
                defaultValue={texteActuel}
              />
              <Bouton type="submit" disabled={enCours}>
                {enCours ? "Envoi…" : "Proposer une mise au propre"}
              </Bouton>
            </form>
          ) : (
            <div className="flex flex-col gap-3">
              <div>
                <p className="font-semibold text-sm">Proposition</p>
                <pre className="text-sm whitespace-pre-wrap font-sans bg-fond border border-trait rounded-controle p-3 mt-1">
                  {etat.proposition}
                </pre>
              </div>
              {/* Deux boutons, aucun par défaut : la validation est un acte. */}
              <form action={accepterProposition} className="flex flex-wrap gap-2">
                <input type="hidden" name="actionId" value={etat.actionId ?? ""} />
                <input type="hidden" name="interventionId" value={interventionId} />
                <input type="hidden" name="decision" value="ACCEPTEE" />
                <Bouton type="submit">Utiliser ce texte</Bouton>
              </form>
              <form action={accepterProposition}>
                <input type="hidden" name="actionId" value={etat.actionId ?? ""} />
                <input type="hidden" name="interventionId" value={interventionId} />
                <input type="hidden" name="decision" value="REJETEE" />
                <Bouton type="submit" variante="discret">
                  Rejeter
                </Bouton>
              </form>
            </div>
          )}
        </>
      )}

      <div className="mt-3">
        <Bouton type="button" variante="discret" onClick={() => setOuvert(false)}>
          Fermer
        </Bouton>
      </div>
    </Carte>
  );
}
