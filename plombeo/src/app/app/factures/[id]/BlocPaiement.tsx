"use client";

import { useActionState, useState } from "react";
import { Bouton, Carte, Champ, Message, Selection } from "@/components/ui";
import { formaterEuros } from "@/lib/calcul";
import { enregistrerPaiement, type EtatFacture } from "../actions";

const etatInitial: EtatFacture = {};

const MOYENS = [
  { valeur: "VIREMENT", libelle: "Virement" },
  { valeur: "CHEQUE", libelle: "Chèque" },
  { valeur: "ESPECES", libelle: "Espèces" },
  { valeur: "CARTE", libelle: "Carte" },
  { valeur: "AUTRE", libelle: "Autre" },
];

/**
 * Encaissements RÉELLEMENT perçus.
 *
 * Le paiement en ligne par lien exige un prestataire configuré : tant qu'il ne
 * l'est pas, aucun bouton ne le propose. Plombéo ne prétendra jamais avoir
 * encaissé un paiement qui n'a pas eu lieu (§76).
 */
export function BlocPaiement({
  invoiceId,
  resteCents,
  paiements,
  supprimerPaiement,
}: {
  invoiceId: string;
  resteCents: number;
  paiements: { id: string; montantCents: number; moyen: string; date: string; reference: string }[];
  supprimerPaiement: (donnees: FormData) => Promise<void>;
}) {
  const [etat, envoyer, enCours] = useActionState(enregistrerPaiement, etatInitial);
  const [ouvert, setOuvert] = useState(false);
  const v = etat.valeurs ?? {};
  const cle = etat.tentative ?? 0;

  return (
    <Carte>
      <h2 className="font-semibold mb-3">Encaissements</h2>

      {/* Les retours d'action sont rendus HORS du formulaire repliable : un
          paiement qui solde la facture fait disparaître le formulaire, et le
          message de confirmation partirait avec lui — l'artisan n'aurait alors
          aucun retour sur une opération qui a pourtant abouti. */}
      {etat.erreur && <Message ton="erreur">{etat.erreur}</Message>}
      {etat.succes && <Message ton="succes">{etat.succes}</Message>}

      {paiements.length === 0 ? (
        <p className="text-sm text-attenue mb-3">Aucun paiement enregistré.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-trait mb-3">
          {paiements.map((p) => (
            <li key={p.id} className="py-2 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{formaterEuros(p.montantCents)}</p>
                <p className="text-sm text-attenue">
                  {p.moyen} · {p.date}
                  {p.reference && ` · ${p.reference}`}
                </p>
              </div>
              <form action={supprimerPaiement}>
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="invoiceId" value={invoiceId} />
                <button type="submit" className="text-sm text-danger underline min-h-11 px-1">
                  Retirer
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      {resteCents > 0 &&
        (!ouvert ? (
          <Bouton type="button" onClick={() => setOuvert(true)}>
            + Enregistrer un paiement
          </Bouton>
        ) : (
          <form key={cle} action={envoyer} className="flex flex-col gap-3 border-t border-trait pt-3" noValidate>
            <input type="hidden" name="invoiceId" value={invoiceId} />
            <Champ
              id="montant"
              name="montant"
              libelle="Montant reçu (€)"
              aide={`Reste à payer : ${formaterEuros(resteCents)}`}
              inputMode="decimal"
              defaultValue={v["montant"] ?? (resteCents / 100).toFixed(2).replace(".", ",")}
            />
            <Selection id="moyen" name="moyen" libelle="Moyen" defaultValue="VIREMENT" options={MOYENS} />
            <Champ id="datePaiement" name="datePaiement" libelle="Date" type="date" />
            <Champ id="reference" name="reference" libelle="Référence" aide="N° de chèque, libellé du virement…" defaultValue={v["reference"] ?? ""} />

            <div className="flex flex-col gap-3 sm:flex-row">
              <Bouton type="submit" disabled={enCours}>{enCours ? "Enregistrement…" : "Enregistrer"}</Bouton>
              <Bouton type="button" variante="discret" onClick={() => setOuvert(false)}>Fermer</Bouton>
            </div>
          </form>
        ))}

      <p className="text-xs text-attenue mt-3">
        N&apos;enregistrez ici que des paiements réellement reçus. Le paiement en ligne par
        lien sécurisé nécessite un prestataire configuré : il n&apos;est pas encore actif, et
        rien ne le simule.
      </p>
    </Carte>
  );
}
