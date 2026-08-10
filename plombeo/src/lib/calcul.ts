/**
 * MOTEUR DE CALCUL DES DEVIS ET FACTURES.
 *
 * Fonctions pures, sans accès base ni réseau : c'est la partie la plus testée
 * du produit, parce qu'une erreur d'un centime sur un document qui engage
 * l'artisan ne se rattrape pas.
 *
 * Conventions, héritées du dépôt et non négociables :
 *  - montants en CENTIMES (entiers) ;
 *  - quantités en MILLI-UNITÉS (× 1000), pour permettre 1,5 m sans flottant ;
 *  - taux de TVA en CENTIÈMES DE POURCENT (2000 = 20 %, 550 = 5,5 %).
 *
 * Aucune opération en virgule flottante n'est faite sur un montant. 5,5 % n'est
 * pas représentable exactement en binaire ; accumuler ce genre d'erreur sur
 * quelques dizaines de lignes finit par produire un écart visible.
 *
 * ATTENTION — La méthode d'agrégation et d'arrondi de la TVA retenue ici (par
 * taux, arrondie une seule fois) est la pratique courante, mais elle relève de
 * la réglementation française et doit être confirmée auprès d'une source
 * officielle [À VÉRIFIER]. Elle est volontairement isolée dans ce module pour
 * pouvoir changer sans toucher au reste de l'application.
 */

export type Ligne = {
  quantiteMilli: number;
  prixUnitaireCents: number;
  /** Centièmes de pourcent : 2000 = 20 %. */
  tauxTvaCentiemes: number;
};

export type Totaux = {
  /** Somme des lignes, avant remise. */
  baseHtCents: number;
  remiseCents: number;
  totalHtCents: number;
  /** TVA par taux, après répartition de la remise. */
  tvaParTaux: { tauxTvaCentiemes: number; baseCents: number; montantCents: number }[];
  totalTvaCents: number;
  totalTtcCents: number;
  acompteCents: number;
  soldeCents: number;
};

/**
 * Arrondi au plus proche, à mi-chemin vers le haut, y compris pour les
 * négatifs (un avoir).
 *
 * `Math.round(-0.5)` vaut `-0` en JavaScript, ce qui casse la symétrie entre une
 * facture et son avoir. On arrondit donc sur la valeur absolue.
 */
export function arrondi(valeur: number): number {
  return valeur < 0 ? -Math.round(-valeur) : Math.round(valeur);
}

/** Total hors taxes d'une ligne. */
export function totalLigneHt(ligne: Ligne): number {
  return arrondi((ligne.prixUnitaireCents * ligne.quantiteMilli) / 1000);
}

/**
 * Répartit un montant au prorata de poids, **sans perte ni création de centime**.
 *
 * Chaque part est arrondie vers le bas, puis les centimes restants sont
 * distribués un par un aux plus gros restes. C'est ce qui garantit que la somme
 * des parts égale exactement le montant de départ — une simple somme
 * d'arrondis, elle, dérive.
 */
export function repartirAuProrata(montantCents: number, poids: readonly number[]): number[] {
  const totalPoids = poids.reduce((s, p) => s + p, 0);
  if (totalPoids === 0 || montantCents === 0) return poids.map(() => 0);

  const negatif = montantCents < 0;
  const montant = Math.abs(montantCents);

  const exacts = poids.map((p) => (montant * p) / totalPoids);
  const parts = exacts.map((e) => Math.floor(e));
  let reste = montant - parts.reduce((s, p) => s + p, 0);

  // Distribution des centimes restants aux plus grandes parties fractionnaires.
  const ordre = exacts
    .map((e, i) => ({ i, frac: e - Math.floor(e) }))
    .sort((a, b) => b.frac - a.frac);

  for (const { i } of ordre) {
    if (reste <= 0) break;
    parts[i] = (parts[i] ?? 0) + 1;
    reste -= 1;
  }

  return negatif ? parts.map((p) => -p) : parts;
}

/**
 * Totaux d'une proposition.
 *
 * @param remisePourMille pour mille (100 = 10 %)
 * @param acomptePourMille pour mille (300 = 30 %)
 */
export function calculerTotaux(
  lignes: readonly Ligne[],
  remisePourMille = 0,
  acomptePourMille = 0,
): Totaux {
  const totauxLignes = lignes.map(totalLigneHt);
  const baseHtCents = totauxLignes.reduce((s, t) => s + t, 0);

  const remiseCents = arrondi((baseHtCents * remisePourMille) / 1000);
  const totalHtCents = baseHtCents - remiseCents;

  // Bases hors taxes regroupées par taux, dans l'ordre de première apparition
  // pour que l'affichage soit stable d'un rendu à l'autre.
  const tauxOrdonnes: number[] = [];
  const baseParTaux = new Map<number, number>();
  lignes.forEach((ligne, index) => {
    const taux = ligne.tauxTvaCentiemes;
    if (!baseParTaux.has(taux)) {
      baseParTaux.set(taux, 0);
      tauxOrdonnes.push(taux);
    }
    baseParTaux.set(taux, (baseParTaux.get(taux) ?? 0) + (totauxLignes[index] ?? 0));
  });

  // La remise est répartie au prorata des bases : l'imputer sur un seul taux
  // fausserait la TVA due.
  const bases = tauxOrdonnes.map((t) => baseParTaux.get(t) ?? 0);
  const remises = repartirAuProrata(remiseCents, bases);

  const tvaParTaux = tauxOrdonnes.map((taux, i) => {
    const baseCents = (bases[i] ?? 0) - (remises[i] ?? 0);
    return {
      tauxTvaCentiemes: taux,
      baseCents,
      // Arrondi UNE SEULE FOIS, sur la base agrégée du taux.
      montantCents: arrondi((baseCents * taux) / 10000),
    };
  });

  const totalTvaCents = tvaParTaux.reduce((s, t) => s + t.montantCents, 0);
  const totalTtcCents = totalHtCents + totalTvaCents;
  const acompteCents = arrondi((totalTtcCents * acomptePourMille) / 1000);

  return {
    baseHtCents,
    remiseCents,
    totalHtCents,
    tvaParTaux,
    totalTvaCents,
    totalTtcCents,
    acompteCents,
    soldeCents: totalTtcCents - acompteCents,
  };
}

/* -------------------------------------------------------------------------- */
/* Affichage                                                                  */
/* -------------------------------------------------------------------------- */

const euros = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

/** Formate des centimes en euros. La division n'a lieu qu'à l'affichage. */
export function formaterEuros(cents: number): string {
  return euros.format(cents / 100);
}

/** « 20 % », « 5,5 % » — sans zéro décimal superflu. */
export function formaterTaux(tauxCentiemes: number): string {
  const valeur = tauxCentiemes / 100;
  return `${Number.isInteger(valeur) ? valeur : valeur.toFixed(2).replace(/0$/, "").replace(".", ",")} %`;
}

/** Convertit une saisie en euros (« 1234,56 ») en centimes entiers. */
export function versCentimes(saisie: string): number | null {
  const normalise = saisie.trim().replace(/\s/g, "").replace(",", ".");
  if (normalise === "") return 0;
  if (!/^-?\d+(\.\d{1,2})?$/.test(normalise)) return null;
  // On passe par la chaîne plutôt que par un flottant : `12.34 * 100` vaut
  // 1233.9999999999998 en JavaScript.
  const negatif = normalise.startsWith("-");
  const [entier = "0", decimales = ""] = normalise.replace("-", "").split(".");
  const cents = Number(entier) * 100 + Number(decimales.padEnd(2, "0"));
  return negatif ? -cents : cents;
}

/** Convertit une saisie de quantité (« 1,5 ») en milli-unités. */
export function versMilliUnites(saisie: string): number | null {
  const normalise = saisie.trim().replace(/\s/g, "").replace(",", ".");
  if (normalise === "") return null;
  if (!/^\d+(\.\d{1,3})?$/.test(normalise)) return null;
  const [entier = "0", decimales = ""] = normalise.split(".");
  return Number(entier) * 1000 + Number(decimales.padEnd(3, "0"));
}
