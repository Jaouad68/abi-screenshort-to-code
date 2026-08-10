"use client";

import { useActionState } from "react";
import { Bouton, Carte, Champ, Message } from "@/components/ui";
import {
  activerMfa,
  desactiverMfa,
  preparerMfa,
  type EtatEquipe,
} from "@/app/app/equipe/actions";

const etatInitial: EtatEquipe = {};

/** Le secret est plus lisible par groupes de quatre lorsqu'on le saisit à la main. */
function grouper(secret: string): string {
  return secret.match(/.{1,4}/g)?.join(" ") ?? secret;
}

/**
 * L'état de l'activation est tenu ICI, au-dessus de la bascule `actif`.
 *
 * Il l'a été à ses dépens : lorsqu'il vivait dans le sous-composant, la
 * revalidation déclenchée par l'activation faisait repasser `actif` à vrai,
 * démontait ce sous-composant — et les codes de récupération disparaissaient
 * sans avoir jamais été lus. L'utilisateur se retrouvait protégé par un facteur
 * dont il n'avait aucun moyen de secours. Défaut trouvé au navigateur, invisible
 * pour les tests d'intégration : l'action, elle, renvoyait bien les codes.
 */
export function SecondFacteur({ actif }: { actif: boolean }) {
  const [active, activer, activation] = useActionState(activerMfa, etatInitial);

  // Les codes priment sur tout le reste : c'est le seul instant où ils existent
  // en clair. La base n'en garde que l'empreinte.
  if (active.codes) return <CodesRecuperation codes={active.codes} />;
  if (actif) return <Desactivation />;
  return <Activation active={active} activer={activer} activation={activation} />;
}

function CodesRecuperation({ codes }: { codes: string[] }) {
  return (
    <Carte>
      <h2 className="font-semibold mb-1">Second facteur activé</h2>
      <Message ton="succes">
        Notez ces codes de récupération maintenant : ils ne seront plus jamais affichés.
      </Message>
      <ul className="grid grid-cols-2 gap-2 mt-3">
        {codes.map((code) => (
          <li
            key={code}
            className="font-mono text-sm bg-fond border border-trait rounded p-2 text-center"
          >
            {code}
          </li>
        ))}
      </ul>
      <p className="text-sm text-attenue mt-3">
        Chacun ne sert qu&apos;une fois. Sans eux, un téléphone perdu fermerait
        définitivement votre compte.
      </p>
    </Carte>
  );
}

function Activation({
  active,
  activer,
  activation,
}: {
  active: EtatEquipe;
  activer: (donnees: FormData) => void;
  activation: boolean;
}) {
  const [prepare, preparer, preparation] = useActionState(preparerMfa, etatInitial);

  return (
    <Carte>
      <h2 className="font-semibold mb-1">Second facteur (recommandé)</h2>
      <p className="text-sm text-attenue mb-4">
        Un code à six chiffres, en plus de votre mot de passe. Il est produit par une
        application d&apos;authentification sur votre téléphone — Plombéo n&apos;envoie
        aucun SMS et ne fait appel à aucun prestataire.
      </p>

      {!prepare.secret ? (
        <form action={preparer}>
          <Bouton type="submit" disabled={preparation}>
            {preparation ? "Préparation…" : "Activer le second facteur"}
          </Bouton>
          {prepare.erreur && (
            <div className="mt-3">
              <Message ton="erreur">{prepare.erreur}</Message>
            </div>
          )}
        </form>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="rounded-controle border border-trait bg-fond p-3">
            <p className="text-sm font-semibold">1. Ajoutez cette clé à votre application</p>
            <p className="text-sm text-attenue mb-2">
              Dans Google Authenticator, Authy, 2FAS ou équivalent : « saisir une clé de
              configuration ».
            </p>
            <code className="block font-mono text-sm break-all bg-white border border-trait rounded p-2">
              {grouper(prepare.secret)}
            </code>
            <p className="text-sm text-attenue mt-2">
              Compte : votre adresse e-mail · Émetteur : Plombéo · Type : basé sur le
              temps.
            </p>
          </div>

          <form action={activer} className="flex flex-col gap-4" noValidate>
            <Champ
              id="code"
              name="code"
              libelle="2. Saisissez le code affiché"
              aide="Six chiffres. Rien n'est activé tant que ce code n'est pas vérifié."
              inputMode="numeric"
              autoComplete="one-time-code"
              required
            />
            {active.erreur && <Message ton="erreur">{active.erreur}</Message>}
            <Bouton type="submit" disabled={activation}>
              {activation ? "Vérification…" : "Vérifier et activer"}
            </Bouton>
          </form>
        </div>
      )}
    </Carte>
  );
}

function Desactivation() {
  const [etat, action, enCours] = useActionState(desactiverMfa, etatInitial);
  const cle = etat.tentative ?? 0;

  return (
    <Carte>
      <h2 className="font-semibold mb-1">Second facteur</h2>
      {etat.succes ? (
        <Message ton="succes">{etat.succes}</Message>
      ) : (
        <>
          <p className="text-sm text-succes font-semibold mb-1">Actif sur ce compte.</p>
          <p className="text-sm text-attenue mb-4">
            Le désactiver exige un code valide : sans cela, quelqu&apos;un qui aurait pris
            la main sur une session ouverte pourrait retirer la protection.
          </p>
          <form key={cle} action={action} className="flex flex-col gap-4" noValidate>
            <Champ
              id="codeDesactivation"
              name="code"
              libelle="Code à six chiffres"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
            />
            {etat.erreur && <Message ton="erreur">{etat.erreur}</Message>}
            <Bouton type="submit" variante="discret" disabled={enCours}>
              {enCours ? "Vérification…" : "Désactiver le second facteur"}
            </Bouton>
          </form>
        </>
      )}
    </Carte>
  );
}
