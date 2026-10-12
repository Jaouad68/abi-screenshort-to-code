"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Badge, Bouton, Carte, Champ, Message, Selection } from "@/components/ui";
import { formaterDuree } from "@/lib/format";
import {
  enregistrerMutation,
  lireFile,
  nouvelIdentifiant,
  synchroniser,
} from "@/lib/sync-client";
import { resumeFile, type MutationLocale } from "@/lib/file-sync";

/**
 * SAISIE DE CHANTIER — utilisable sans réseau.
 *
 * Principe : toute saisie est écrite **d'abord en local** (IndexedDB) puis
 * poussée quand le réseau le permet. L'artisan n'attend jamais le serveur, et
 * ne perd rien s'il est en cave.
 *
 * L'écran affiche donc deux sources : les lignes déjà enregistrées côté serveur
 * (rendues par le composant serveur parent) et celles encore en file locale,
 * signalées comme telles. Les masquer donnerait l'impression que la saisie a
 * été perdue.
 */

type LigneServeur = { id: string; libelle: string; detail?: string };

/**
 * État du réseau via `useSyncExternalStore` : c'est l'API prévue pour lire une
 * source externe au rendu. Le faire dans un effet provoquerait un rendu en
 * cascade, et React le signale à juste titre.
 */
function souscrireReseau(surChangement: () => void) {
  window.addEventListener("online", surChangement);
  window.addEventListener("offline", surChangement);
  return () => {
    window.removeEventListener("online", surChangement);
    window.removeEventListener("offline", surChangement);
  };
}

function useEnLigne(): boolean {
  return useSyncExternalStore(
    souscrireReseau,
    () => navigator.onLine,
    // Valeur au rendu serveur : on suppose connecté, faute de pouvoir savoir.
    () => true,
  );
}

export function SaisieTerrain({
  interventionId,
  modifiable,
  tachesServeur,
  tempsServeur,
  fournituresServeur,
  minutesServeur,
}: {
  interventionId: string;
  modifiable: boolean;
  tachesServeur: LigneServeur[];
  tempsServeur: LigneServeur[];
  fournituresServeur: LigneServeur[];
  minutesServeur: number;
}) {
  const [file, setFile] = useState<MutationLocale[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const enLigne = useEnLigne();
  const routeur = useRouter();

  /**
   * Synchronise puis relit la file. Ne touche PAS à l'état : les fonctions qui
   * écrivent l'état sont appelées depuis les rappels asynchrones, jamais dans
   * le corps d'un effet — sans quoi React déclenche des rendus en cascade.
   */
  const synchroniserPuisLire = useCallback(async () => {
    const resume = await synchroniser();
    const locales = await lireFile();
    return { resume, locales };
  }, []);

  const appliquer = useCallback(
    (r: Awaited<ReturnType<typeof synchroniserPuisLire>>) => {
      setFile(r.locales);
      setMessage(
        r.resume.enEchec > 0
          ? `${r.resume.enEchec} saisie(s) n'ont pas pu être envoyées. Elles restent sur cet appareil.`
          : null,
      );

      // Une ligne synchronisée quitte la file locale : sans recharger les
      // données serveur, elle disparaîtrait de l'écran jusqu'au prochain
      // rafraîchissement manuel — l'artisan croirait sa saisie perdue.
      //
      // Le déclencheur est le nombre réellement appliqué, remonté par le
      // service de synchronisation : comparer la taille de la file avant/après
      // lisait un état de rendu périmé et ne se déclenchait jamais.
      if (r.resume.appliquees > 0) routeur.refresh();
    },
    [routeur],
  );

  const pousser = useCallback(() => {
    synchroniserPuisLire().then(appliquer, (erreur) => {
      console.error("[sync] envoi impossible", erreur);
    });
  }, [synchroniserPuisLire, appliquer]);

  // Lecture initiale de la file locale. L'état est mis à jour dans le rappel
  // asynchrone, pas dans le corps de l'effet, et l'on annule au démontage pour
  // ne pas écrire dans un composant disparu.
  useEffect(() => {
    let annule = false;
    lireFile().then(
      (locales) => {
        if (!annule) setFile(locales);
      },
      (erreur) => {
        console.error("[sync] lecture de la file impossible", erreur);
      },
    );
    return () => {
      annule = true;
    };
  }, []);

  // Le retour du réseau déclenche l'envoi : l'artisan remonte de la cave et
  // tout part sans qu'il ait à y penser.
  useEffect(() => {
    if (!enLigne) return;
    let annule = false;
    synchroniserPuisLire().then(
      (r) => {
        if (!annule) appliquer(r);
      },
      (erreur) => {
        console.error("[sync] envoi impossible", erreur);
      },
    );
    return () => {
      annule = true;
    };
  }, [enLigne, synchroniserPuisLire, appliquer]);

  const ajouter = useCallback(
    async (type: MutationLocale["type"], charge: Record<string, unknown>) => {
      await enregistrerMutation({
        clientMutationId: nouvelIdentifiant(),
        type,
        interventionId,
        charge,
      });
      setFile(await lireFile());
      if (navigator.onLine) pousser();
    },
    [interventionId, pousser],
  );

  const enAttente = file.filter(
    (m) => m.interventionId === interventionId && m.etat !== "SYNCHRONISE",
  );
  const resume = resumeFile(enAttente);

  const localesParType = (type: MutationLocale["type"]) =>
    enAttente.filter((m) => m.type === type);

  const minutesLocales = localesParType("temps").reduce(
    (total, m) => total + Number(m.charge["minutes"] ?? 0),
    0,
  );

  return (
    <div className="flex flex-col gap-4">
      <EtatSynchronisation
        enLigne={enLigne}
        enAttente={resume.enAttente}
        enEchec={resume.enEchec}
        onSynchroniser={pousser}
      />

      {message && <Message ton="erreur">{message}</Message>}

      <Section
        titre="Tâches"
        lignes={tachesServeur}
        locales={localesParType("tache").map((m) => ({
          id: m.clientMutationId,
          libelle: String(m.charge["libelle"] ?? ""),
          etat: m.etat,
        }))}
      >
        {modifiable && (
          <FormulaireLigne
            champs={[{ nom: "libelle", libelle: "Tâche", requis: true }]}
            libelleBouton="Ajouter la tâche"
            onAjouter={(v) => ajouter("tache", { libelle: v["libelle"], ordre: 0 })}
          />
        )}
      </Section>

      <Section
        titre={`Temps passé — ${formaterDuree(minutesServeur + minutesLocales)}`}
        lignes={tempsServeur}
        locales={localesParType("temps").map((m) => ({
          id: m.clientMutationId,
          libelle: formaterDuree(Number(m.charge["minutes"] ?? 0)),
          detail: String(m.charge["libelle"] ?? ""),
          etat: m.etat,
        }))}
      >
        {modifiable && (
          <FormulaireLigne
            champs={[
              { nom: "minutes", libelle: "Minutes", type: "number", requis: true },
              { nom: "libelle", libelle: "Intitulé" },
            ]}
            libelleBouton="Ajouter le temps"
            onAjouter={(v) =>
              ajouter("temps", {
                minutes: Number(v["minutes"]),
                libelle: v["libelle"] ?? "",
              })
            }
            valider={(v) => {
              const m = Number(v["minutes"]);
              if (!Number.isInteger(m) || m < 1 || m > 1440) {
                return "Indiquez un nombre de minutes entre 1 et 1440.";
              }
              return null;
            }}
          />
        )}
      </Section>

      <Section
        titre="Fournitures utilisées"
        lignes={fournituresServeur}
        locales={localesParType("fourniture").map((m) => ({
          id: m.clientMutationId,
          libelle: String(m.charge["libelle"] ?? ""),
          detail: `${Number(m.charge["quantiteMilli"] ?? 0) / 1000} ${m.charge["unite"] ?? "u"}`,
          etat: m.etat,
        }))}
      >
        {modifiable && (
          <FormulaireLigne
            champs={[
              { nom: "libelle", libelle: "Fourniture", requis: true },
              { nom: "quantite", libelle: "Quantité", type: "number", defaut: "1" },
            ]}
            selection={{
              nom: "unite",
              libelle: "Unité",
              options: [
                { valeur: "u", libelle: "unité" },
                { valeur: "m", libelle: "mètre" },
                { valeur: "ml", libelle: "mètre linéaire" },
                { valeur: "kg", libelle: "kilogramme" },
                { valeur: "L", libelle: "litre" },
              ],
            }}
            libelleBouton="Ajouter la fourniture"
            onAjouter={(v) =>
              ajouter("fourniture", {
                libelle: v["libelle"],
                // Convention du dépôt : quantités en milli-unités, pour rester
                // en arithmétique entière tout en permettant 1,5 m.
                quantiteMilli: Math.round(Number(v["quantite"] ?? 1) * 1000),
                unite: v["unite"] ?? "u",
              })
            }
            valider={(v) => {
              const q = Number(v["quantite"] ?? 1);
              if (!(q > 0) || q > 1_000_000) return "Indiquez une quantité positive.";
              return null;
            }}
          />
        )}
      </Section>

    </div>
  );
}

function EtatSynchronisation({
  enLigne,
  enAttente,
  enEchec,
  onSynchroniser,
}: {
  enLigne: boolean;
  enAttente: number;
  enEchec: number;
  onSynchroniser: () => void;
}) {
  const tout = enAttente === 0 && enEchec === 0;
  return (
    <Carte className={enEchec > 0 ? "border-[#f2c9c6]" : undefined}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-sm">
            {enLigne ? "Connecté" : "Hors ligne"}{" "}
            {tout ? (
              <Badge ton="succes">Tout est enregistré</Badge>
            ) : enEchec > 0 ? (
              <Badge ton="danger">{enEchec} en échec</Badge>
            ) : (
              <Badge ton="alerte">{enAttente} en attente</Badge>
            )}
          </p>
          <p className="text-sm text-attenue mt-1">
            {tout
              ? "Vos saisies sont sur le serveur."
              : enLigne
                ? "Envoi en cours…"
                : "Vos saisies sont conservées sur cet appareil et partiront au retour du réseau."}
          </p>
        </div>
        {!tout && enLigne && (
          <Bouton type="button" variante="discret" onClick={onSynchroniser}>
            Réessayer
          </Bouton>
        )}
      </div>
    </Carte>
  );
}

function Section({
  titre,
  lignes,
  locales,
  children,
}: {
  titre: string;
  lignes: LigneServeur[];
  locales: { id: string; libelle: string; detail?: string; etat: string }[];
  children?: React.ReactNode;
}) {
  return (
    <Carte>
      <h2 className="font-semibold mb-3">{titre}</h2>
      {lignes.length === 0 && locales.length === 0 ? (
        <p className="text-sm text-attenue mb-3">Rien pour l&apos;instant.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-trait mb-3">
          {lignes.map((l) => (
            <li key={l.id} className="py-2">
              <p className="text-sm font-medium">{l.libelle}</p>
              {l.detail && <p className="text-sm text-attenue">{l.detail}</p>}
            </li>
          ))}
          {locales.map((l) => (
            <li key={l.id} className="py-2 flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium">{l.libelle}</p>
                {l.detail && <p className="text-sm text-attenue">{l.detail}</p>}
              </div>
              <Badge ton={l.etat === "ECHEC" ? "danger" : "alerte"}>
                {l.etat === "ECHEC" ? "Échec" : "Sur cet appareil"}
              </Badge>
            </li>
          ))}
        </ul>
      )}
      {children}
    </Carte>
  );
}

type ChampSaisie = {
  nom: string;
  libelle: string;
  type?: string;
  requis?: boolean;
  defaut?: string;
};

/**
 * Petit formulaire local : il n'utilise PAS de Server Action, puisqu'il doit
 * fonctionner sans réseau. La validation se fait donc ici, en plus de la
 * validation serveur appliquée à la réception de la file.
 */
function FormulaireLigne({
  champs,
  selection,
  libelleBouton,
  onAjouter,
  valider,
}: {
  champs: ChampSaisie[];
  selection?: { nom: string; libelle: string; options: { valeur: string; libelle: string }[] };
  libelleBouton: string;
  onAjouter: (valeurs: Record<string, string>) => Promise<void>;
  valider?: (valeurs: Record<string, string>) => string | null;
}) {
  const [valeurs, setValeurs] = useState<Record<string, string>>(() =>
    Object.fromEntries([
      ...champs.map((c) => [c.nom, c.defaut ?? ""]),
      ...(selection ? [[selection.nom, selection.options[0]?.valeur ?? ""]] : []),
    ]),
  );
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const envoyer = async () => {
    for (const c of champs) {
      if (c.requis && !valeurs[c.nom]?.trim()) {
        setErreur(`${c.libelle} est obligatoire.`);
        return;
      }
    }
    const messageValidation = valider?.(valeurs) ?? null;
    if (messageValidation) {
      setErreur(messageValidation);
      return;
    }

    setErreur(null);
    setEnCours(true);
    await onAjouter(valeurs);
    setEnCours(false);
    setValeurs((v) =>
      Object.fromEntries(
        Object.keys(v).map((cle) => [
          cle,
          selection && cle === selection.nom ? (v[cle] ?? "") : (champs.find((c) => c.nom === cle)?.defaut ?? ""),
        ]),
      ),
    );
  };

  return (
    <div className="flex flex-col gap-3 border-t border-trait pt-3">
      {champs.map((c) => (
        <Champ
          key={c.nom}
          id={`${libelleBouton}-${c.nom}`}
          libelle={c.libelle}
          type={c.type ?? "text"}
          inputMode={c.type === "number" ? "numeric" : undefined}
          value={valeurs[c.nom] ?? ""}
          onChange={(e) => setValeurs((v) => ({ ...v, [c.nom]: e.target.value }))}
        />
      ))}
      {selection && (
        <Selection
          id={`${libelleBouton}-${selection.nom}`}
          libelle={selection.libelle}
          value={valeurs[selection.nom] ?? ""}
          onChange={(e) => setValeurs((v) => ({ ...v, [selection.nom]: e.target.value }))}
          options={selection.options}
        />
      )}
      {erreur && <Message ton="erreur">{erreur}</Message>}
      <Bouton type="button" onClick={envoyer} disabled={enCours}>
        {enCours ? "Enregistrement…" : libelleBouton}
      </Bouton>
    </div>
  );
}
