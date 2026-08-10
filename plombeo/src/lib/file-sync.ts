/**
 * FILE DE SYNCHRONISATION HORS-LIGNE — logique pure.
 *
 * Ce module ne touche ni au stockage ni au réseau : il ne contient que les
 * décisions (déduplication, réessai, états). Cette séparation le rend testable
 * sans navigateur ni base — et c'est précisément la partie où une erreur coûte
 * cher, puisqu'elle décide de ce qu'on garde et de ce qu'on abandonne.
 *
 * Le stockage IndexedDB et l'envoi réseau vivent dans src/lib/sync-client.ts.
 */

export type EtatMutation = "LOCAL" | "EN_COURS" | "SYNCHRONISE" | "ECHEC";

export type MutationLocale = {
  /** UUID généré sur l'appareil AU MOMENT DE LA SAISIE, jamais côté serveur. */
  clientMutationId: string;
  type: "tache" | "temps" | "fourniture" | "compteRendu";
  interventionId: string;
  charge: Record<string, unknown>;
  etat: EtatMutation;
  tentatives: number;
  derniereErreur?: string;
  creeLe: number;
};

/**
 * Nombre de tentatives au-delà duquel une mutation est déclarée en échec.
 *
 * Réessayer indéfiniment en silence est le pire comportement possible : la
 * saisie semble partie alors qu'elle ne le sera jamais. Passé ce seuil, la
 * mutation devient visible pour l'artisan (§5 « reprise sur erreur »).
 */
export const MAX_TENTATIVES = 5;

/**
 * Mutations à envoyer : celles jamais parties, et celles en échec temporaire
 * n'ayant pas épuisé leurs tentatives.
 */
export function aEnvoyer(file: readonly MutationLocale[]): MutationLocale[] {
  return file.filter((m) => m.etat === "LOCAL" || (m.etat === "EN_COURS" && m.tentatives < MAX_TENTATIVES));
}

/**
 * Déduplication par `clientMutationId`, en conservant la version la plus récente.
 *
 * Deux saisies successives sur la même ligne (l'artisan corrige son temps)
 * portent le même identifiant : envoyer les deux serait inutile, et l'ordre
 * d'arrivée déciderait du résultat. On ne garde que la dernière.
 */
export function dedupliquer(file: readonly MutationLocale[]): MutationLocale[] {
  const parId = new Map<string, MutationLocale>();
  for (const mutation of file) {
    const existante = parId.get(mutation.clientMutationId);
    if (!existante || mutation.creeLe >= existante.creeLe) {
      parId.set(mutation.clientMutationId, mutation);
    }
  }
  return [...parId.values()].sort((a, b) => a.creeLe - b.creeLe);
}

/** Applique le résultat renvoyé par le serveur à une mutation de la file. */
export function appliquerResultat(
  mutation: MutationLocale,
  resultat: { etat: "applique" | "refuse"; motif?: string } | undefined,
): MutationLocale {
  if (!resultat) {
    // Aucune réponse pour cette mutation : on la considère non partie et on
    // réessaiera. Ne pas la marquer synchronisée est essentiel — c'est ce qui
    // évite de perdre une saisie sur une réponse tronquée.
    return { ...mutation, etat: "EN_COURS", tentatives: mutation.tentatives + 1 };
  }

  if (resultat.etat === "applique") {
    return { ...mutation, etat: "SYNCHRONISE", derniereErreur: undefined };
  }

  const tentatives = mutation.tentatives + 1;
  return {
    ...mutation,
    tentatives,
    etat: tentatives >= MAX_TENTATIVES ? "ECHEC" : "EN_COURS",
    derniereErreur: resultat.motif ?? "refus",
  };
}

/** Échec réseau : la mutation n'est pas partie, on réessaiera. */
export function marquerEchecReseau(mutation: MutationLocale): MutationLocale {
  const tentatives = mutation.tentatives + 1;
  return {
    ...mutation,
    tentatives,
    // Une coupure réseau n'est pas une erreur de la donnée : on ne la déclare
    // en échec définitif qu'après le même nombre de tentatives.
    etat: tentatives >= MAX_TENTATIVES ? "ECHEC" : "EN_COURS",
    derniereErreur: "reseau",
  };
}

/** Les mutations synchronisées peuvent quitter la file. */
export function purger(file: readonly MutationLocale[]): MutationLocale[] {
  return file.filter((m) => m.etat !== "SYNCHRONISE");
}

/** Résumé affiché à l'artisan : « est-ce que c'est parti ? » (US-10). */
export function resumeFile(file: readonly MutationLocale[]): {
  enAttente: number;
  enEchec: number;
} {
  return {
    enAttente: file.filter((m) => m.etat === "LOCAL" || m.etat === "EN_COURS").length,
    enEchec: file.filter((m) => m.etat === "ECHEC").length,
  };
}
