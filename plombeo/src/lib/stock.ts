import { arrondi } from "@/lib/calcul";

/**
 * STOCK ET MARGE — logique pure (Phase 8).
 *
 * Sans base ni réseau : ce module porte les règles qui décident ce que
 * l'artisan voit, et une règle qu'on ne peut pas tester exhaustivement n'en est
 * pas une.
 *
 * Deux partis pris structurent tout le reste :
 *
 *  1. le stock est la SOMME DES MOUVEMENTS, jamais une valeur stockée. Une
 *     colonne mise à jour en place ne dit ni pourquoi ni quand le stock a
 *     changé, et un écart devient impossible à expliquer ;
 *  2. un prix d'achat à zéro signifie INCONNU, jamais gratuit. Traiter zéro
 *     comme un prix afficherait 100 % de marge sur toute référence non
 *     renseignée — le chiffre le plus flatteur, et le plus faux.
 */

export type Mouvement = { quantiteMilli: number };

/**
 * Stock courant d'une référence.
 *
 * Peut être NÉGATIF, et c'est voulu : un logiciel qui refuse de sortir une pièce
 * que l'artisan a physiquement dans les mains le pousse à lui mentir, ou à
 * l'abandonner. Le négatif est une anomalie à signaler, pas une erreur à
 * bloquer.
 */
export function stockCourant(mouvements: readonly Mouvement[]): number {
  return mouvements.reduce((total, m) => total + m.quantiteMilli, 0);
}

export type EtatStock = "NON_SUIVI" | "NORMAL" | "SOUS_SEUIL" | "NEGATIF";

export function etatStock(
  article: { suiviStock: boolean; seuilAlerteMilli: number },
  quantiteMilli: number,
): EtatStock {
  if (!article.suiviStock) return "NON_SUIVI";
  if (quantiteMilli < 0) return "NEGATIF";
  // Un seuil à zéro signifie « pas d'alerte », pas « alerte dès zéro ».
  if (article.seuilAlerteMilli > 0 && quantiteMilli <= article.seuilAlerteMilli) {
    return "SOUS_SEUIL";
  }
  return "NORMAL";
}

/**
 * Le seuil vient-il d'être FRANCHI ?
 *
 * Distinction essentielle pour l'alerte : rester sous le seuil n'est pas un
 * événement, le passer en est un. Alerter sur l'état produirait une
 * notification à chaque balayage pour un article durablement en rupture, et
 * l'artisan cesserait de les lire.
 */
export function seuilFranchi(
  article: { suiviStock: boolean; seuilAlerteMilli: number },
  avantMilli: number,
  apresMilli: number,
): boolean {
  if (!article.suiviStock || article.seuilAlerteMilli <= 0) return false;
  return avantMilli > article.seuilAlerteMilli && apresMilli <= article.seuilAlerteMilli;
}

/* -------------------------------------------------------------------------- */
/* Correction après comptage                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Écart à enregistrer pour amener le stock à la quantité comptée.
 *
 * La correction s'écrit comme un MOUVEMENT d'écart, jamais en réécrivant
 * l'historique : après coup, on doit pouvoir lire « il manquait 3 unités le
 * 12 mars », pas découvrir un passé silencieusement modifié (§57).
 */
export function ecartComptage(stockActuelMilli: number, compteMilli: number): number {
  return compteMilli - stockActuelMilli;
}

/* -------------------------------------------------------------------------- */
/* Marge                                                                      */
/* -------------------------------------------------------------------------- */

export type Marge = {
  /** Marge unitaire en centimes. */
  margeCents: number;
  /** Taux en centièmes de point (2000 = 20 %), rapporté au prix de vente. */
  tauxCentiemes: number;
};

/**
 * Marge d'une fourniture, ou `null` si elle n'a pas de sens.
 *
 * `null` quand le prix d'achat est inconnu : c'est LE cas à ne pas rater.
 * Afficher « 100 % » parce qu'aucun prix d'achat n'a été saisi donnerait à
 * l'artisan exactement l'information inverse de la réalité.
 *
 * Le taux est rapporté au prix de VENTE (marge commerciale), convention
 * courante dans le négoce. Il n'a de sens que si le prix de vente est non nul.
 */
export function margeFourniture(
  prixVenteCents: number,
  prixAchatCents: number,
): Marge | null {
  if (prixAchatCents <= 0) return null;
  if (prixVenteCents <= 0) return null;

  const margeCents = prixVenteCents - prixAchatCents;
  return {
    margeCents,
    tauxCentiemes: arrondi((margeCents / prixVenteCents) * 10000),
  };
}

/**
 * Marge d'un ensemble de lignes.
 *
 * Les lignes sans prix d'achat connu sont ÉCARTÉES du calcul et comptées à
 * part : les inclure à zéro gonflerait la marge, et les ignorer en silence
 * laisserait croire que le total couvre tout.
 */
export type MargeTotale = {
  venteCents: number;
  achatCents: number;
  margeCents: number;
  tauxCentiemes: number;
  /** Lignes dont le prix d'achat est inconnu : le total ne les couvre pas. */
  lignesSansPrixAchat: number;
};

export function margeTotale(
  lignes: readonly {
    quantiteMilli: number;
    prixUnitaireCents: number;
    prixAchatCents: number;
  }[],
): MargeTotale {
  let venteCents = 0;
  let achatCents = 0;
  let lignesSansPrixAchat = 0;

  for (const ligne of lignes) {
    if (ligne.prixAchatCents <= 0) {
      lignesSansPrixAchat += 1;
      continue;
    }
    venteCents += arrondi((ligne.quantiteMilli * ligne.prixUnitaireCents) / 1000);
    achatCents += arrondi((ligne.quantiteMilli * ligne.prixAchatCents) / 1000);
  }

  const margeCents = venteCents - achatCents;
  return {
    venteCents,
    achatCents,
    margeCents,
    tauxCentiemes: venteCents > 0 ? arrondi((margeCents / venteCents) * 10000) : 0,
    lignesSansPrixAchat,
  };
}
