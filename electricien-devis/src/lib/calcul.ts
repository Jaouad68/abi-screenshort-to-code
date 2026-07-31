/**
 * Calculs HT / TVA / TTC — 100 % en entiers (centimes) pour éviter toute
 * imprécision de virgule flottante sur des documents comptables.
 */

export type LigneCalcul = {
  prixUnitaireCents: number;
  quantiteMilli: number;
  tauxTva: number;
};

export type VentilationTva = {
  taux: number;
  baseHtCents: number;
  montantTvaCents: number;
};

export type Totaux = {
  totalHtCents: number;
  totalTvaCents: number;
  totalTtcCents: number;
  ventilationTva: VentilationTva[];
};

/** Montant HT d'une ligne = prix unitaire × quantité. */
export function montantLigneHtCents(ligne: LigneCalcul): number {
  return Math.round((ligne.prixUnitaireCents * ligne.quantiteMilli) / 1000);
}

/**
 * Totaux du devis + ventilation de la TVA par taux (pour le récapitulatif PDF).
 * La TVA est calculée sur la base HT cumulée de chaque taux, puis arrondie une
 * seule fois par taux (méthode fiscale standard).
 */
export function calculerTotaux(lignes: LigneCalcul[]): Totaux {
  let totalHtCents = 0;
  const baseParTaux = new Map<number, number>();

  for (const ligne of lignes) {
    const ht = montantLigneHtCents(ligne);
    totalHtCents += ht;
    baseParTaux.set(ligne.tauxTva, (baseParTaux.get(ligne.tauxTva) ?? 0) + ht);
  }

  const ventilationTva: VentilationTva[] = [...baseParTaux.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([taux, baseHtCents]) => ({
      taux,
      baseHtCents,
      montantTvaCents: Math.round((baseHtCents * taux) / 100),
    }));

  const totalTvaCents = ventilationTva.reduce((s, v) => s + v.montantTvaCents, 0);

  return {
    totalHtCents,
    totalTvaCents,
    totalTtcCents: totalHtCents + totalTvaCents,
    ventilationTva,
  };
}

/** Acompte à la commande + solde restant, à partir du TTC et d'un pourcentage. */
export function calculerAcompte(totalTtcCents: number, pct: number) {
  const p = Math.max(0, Math.min(100, pct));
  const acompteCents = Math.round((totalTtcCents * p) / 100);
  return { acompteCents, soldeCents: totalTtcCents - acompteCents };
}

/** Taux de TVA proposés dans l'interface. */
export const TAUX_TVA = [20, 10, 5.5, 0] as const;

/** Unités proposées pour une prestation / ligne de devis. */
export const UNITES = ["u", "ml", "m²", "h", "forfait", "ens."] as const;
