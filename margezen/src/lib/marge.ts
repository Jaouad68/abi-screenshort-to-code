/**
 * Moteur de calcul des marges. Fonctions pures, sans effet de bord.
 * Le LLM n'entre jamais dans ce fichier : il extrait des données,
 * ce module calcule. Tous les montants sont en centimes d'euro (entiers).
 */

export type UniteMesure = "kg" | "L" | "piece";

export interface LigneFicheTechnique {
  ingredientId: string;
  /** Quantité exprimée dans la même unité que `uniteRef` de l'ingrédient. */
  quantite: number;
  unite: UniteMesure;
}

export interface PrixIngredient {
  /** Prix en centimes, par unité de référence de l'ingrédient. */
  prixUnitaireCts: number;
  uniteRef: UniteMesure;
}

export interface ResultatCoutMatiere {
  /** null si une donnée manque : ne jamais afficher d'estimation silencieuse. */
  coutCts: number | null;
  complet: boolean;
  ingredientsManquants: string[];
}

export type Quadrant = "etoile" | "vache" | "enigme" | "poids_mort";

/**
 * Coût matière d'une portion, à partir de la fiche technique et des prix
 * connus des ingrédients. Renvoie `complet: false` si la fiche est vide,
 * si un ingrédient n'a pas de prix connu, ou si son unité de référence
 * ne correspond pas à celle de la fiche (aucune conversion n'est tentée :
 * mieux vaut un coût manquant qu'un coût faux).
 */
export function coutMatierePortion(
  fiche: readonly LigneFicheTechnique[],
  prixIngredients: Readonly<Record<string, PrixIngredient>>,
): ResultatCoutMatiere {
  if (fiche.length === 0) {
    return { coutCts: null, complet: false, ingredientsManquants: [] };
  }

  const ingredientsManquants: string[] = [];
  let totalCts = 0;

  for (const ligne of fiche) {
    const prix = prixIngredients[ligne.ingredientId];
    if (!prix || prix.uniteRef !== ligne.unite) {
      ingredientsManquants.push(ligne.ingredientId);
      continue;
    }
    totalCts += ligne.quantite * prix.prixUnitaireCts;
  }

  if (ingredientsManquants.length > 0) {
    return { coutCts: null, complet: false, ingredientsManquants };
  }

  return { coutCts: Math.round(totalCts), complet: true, ingredientsManquants: [] };
}

/**
 * Marge brute en pourcentage : (prix de vente HT - coût matière) / prix de vente HT.
 * Un prix de vente HT nul ou négatif rend la marge non définie ; on renvoie 0
 * plutôt qu'Infinity ou NaN, pour ne jamais propager une valeur non affichable.
 */
export function margeBrutePct(prixVenteHTCts: number, coutMPCts: number): number {
  if (prixVenteHTCts <= 0) {
    return 0;
  }
  const pct = ((prixVenteHTCts - coutMPCts) / prixVenteHTCts) * 100;
  return Math.round(pct * 10) / 10;
}

/**
 * Prix de vente HT à partir du prix TTC affiché en carte et du taux de TVA.
 */
export function prixVenteHT(prixTTCCts: number, tauxTvaPct: number): number {
  const diviseur = 1 + tauxTvaPct / 100;
  if (diviseur <= 0) {
    return 0;
  }
  return Math.round(prixTTCCts / diviseur);
}

/**
 * Coefficient multiplicateur : combien de fois le coût matière tient dans
 * le prix de vente TTC. Référence métier : 3,5 à 4 en traditionnel, jusqu'à
 * 8 sur les liquides. Un coût matière nul ou négatif rend le coefficient
 * non défini ; on renvoie 0 plutôt qu'Infinity.
 */
export function coefficientMultiplicateur(prixTTCCts: number, coutMPCts: number): number {
  if (coutMPCts <= 0) {
    return 0;
  }
  return Math.round((prixTTCCts / coutMPCts) * 10) / 10;
}

/**
 * Prix de vente TTC conseillé pour atteindre une marge cible donnée,
 * à partir du coût matière et du taux de TVA applicable.
 */
export function prixConseille(
  coutMPCts: number,
  margeCiblePct: number,
  tauxTvaPct: number,
): number {
  if (margeCiblePct >= 100 || margeCiblePct < 0) {
    return 0;
  }
  const venteHT = coutMPCts / (1 - margeCiblePct / 100);
  const venteTTC = venteHT * (1 + tauxTvaPct / 100);
  return Math.round(venteTTC);
}

/**
 * Classement menu engineering d'un plat selon sa marge et son volume de
 * ventes, comparés à des seuils (typiquement la médiane de la carte,
 * calculée par l'appelant sur l'ensemble des plats actifs).
 *
 * Décision d'implémentation : la spécification d'origine ne donne que
 * `margePct` et `volumeVentes` en entrée, mais un classement en quadrants
 * n'a de sens que relativement à des seuils de comparaison. Les seuils
 * sont donc des paramètres explicites plutôt que des constantes globales.
 */
export function classerPlat(
  margePct: number,
  volumeVentes: number,
  seuilMargePct: number,
  seuilVolume: number,
): Quadrant {
  const margeForte = margePct >= seuilMargePct;
  const volumeFort = volumeVentes >= seuilVolume;

  if (margeForte && volumeFort) return "etoile";
  if (!margeForte && volumeFort) return "vache";
  if (margeForte && !volumeFort) return "enigme";
  return "poids_mort";
}
