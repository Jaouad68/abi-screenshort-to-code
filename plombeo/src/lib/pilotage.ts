import { arrondi } from "@/lib/calcul";

/**
 * PILOTAGE — logique pure (Phase 9).
 *
 * Le risque de cette phase n'est pas le calcul, c'est la CRÉDIBILITÉ. Un
 * tableau de bord qui mélange le constaté et l'estimé fait prendre des
 * décisions d'entreprise sur des chiffres dont personne ne connaît le statut.
 *
 * D'où une règle qui traverse tout le module : quand une donnée manque,
 * Plombéo renvoie `null` et le dit. Jamais un zéro par défaut — un module de
 * pilotage qui affiche zéro là où il ignore est un module qui ment.
 */

/* -------------------------------------------------------------------------- */
/* Périodes                                                                   */
/* -------------------------------------------------------------------------- */

export type Periode = { debut: Date; fin: Date; libelle: string };

const MOIS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

/**
 * Bornes d'un mois : début inclus, fin EXCLUE.
 *
 * L'exclusion de la borne haute évite qu'une facture datée du 1er à 00:00
 * compte dans deux mois — l'erreur classique des comparaisons de périodes.
 */
export function moisDe(date: Date): Periode {
  const debut = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
  const fin = new Date(date.getFullYear(), date.getMonth() + 1, 1, 0, 0, 0, 0);
  return { debut, fin, libelle: `${MOIS[date.getMonth()]} ${date.getFullYear()}` };
}

export function moisPrecedent(periode: Periode): Periode {
  const veille = new Date(periode.debut.getTime() - 1);
  return moisDe(veille);
}

export function anneeDe(date: Date): Periode {
  return {
    debut: new Date(date.getFullYear(), 0, 1),
    fin: new Date(date.getFullYear() + 1, 0, 1),
    libelle: String(date.getFullYear()),
  };
}

/* -------------------------------------------------------------------------- */
/* Comparaison                                                                */
/* -------------------------------------------------------------------------- */

export type Evolution = {
  ecartCents: number;
  /** Variation en centièmes de point, ou `null` si la base est nulle. */
  tauxCentiemes: number | null;
};

/**
 * Compare deux périodes.
 *
 * `tauxCentiemes` vaut `null` quand la période de référence est à zéro : une
 * progression « infinie » ou « +100 % » depuis rien n'a aucun sens et
 * donnerait une impression de performance sans contenu.
 */
export function evolution(actuelCents: number, precedentCents: number): Evolution {
  const ecartCents = actuelCents - precedentCents;
  if (precedentCents <= 0) return { ecartCents, tauxCentiemes: null };
  return { ecartCents, tauxCentiemes: arrondi((ecartCents / precedentCents) * 10000) };
}

/* -------------------------------------------------------------------------- */
/* Rentabilité d'un chantier                                                  */
/* -------------------------------------------------------------------------- */

export type Rentabilite = {
  produitCents: number;
  coutFournituresCents: number;
  coutMainOeuvreCents: number;
  resultatCents: number;
  /** Taux rapporté au produit, en centièmes de point. */
  tauxCentiemes: number;
};

/** Ce qui empêche de calculer, formulé pour l'artisan. */
export type Obstacle =
  | "COUT_HORAIRE_INCONNU"
  | "FOURNITURE_SANS_PRIX_ACHAT"
  | "AUCUN_PRODUIT";

export type ResultatRentabilite =
  | { calculable: true; rentabilite: Rentabilite }
  | { calculable: false; obstacle: Obstacle };

/**
 * Rentabilité d'un chantier.
 *
 * Renvoie un OBSTACLE plutôt qu'un chiffre approximatif dès qu'une donnée
 * manque. C'est la décision centrale de la phase : mieux vaut dire « je ne sais
 * pas, voilà ce qui manque » que produire un résultat que l'artisan croira
 * fiable.
 *
 * Le coût horaire est SAISI, jamais déduit : il intègre charges, congés et
 * temps non facturable, dont Plombéo ne sait rien.
 */
export function rentabiliteChantier(entree: {
  produitCents: number;
  minutes: number;
  coutHoraireCents: number;
  fournitures: readonly { quantiteMilli: number; prixAchatCents: number }[];
}): ResultatRentabilite {
  if (entree.produitCents <= 0) return { calculable: false, obstacle: "AUCUN_PRODUIT" };
  if (entree.coutHoraireCents <= 0) {
    return { calculable: false, obstacle: "COUT_HORAIRE_INCONNU" };
  }
  // Une seule fourniture sans prix d'achat suffit à fausser le résultat : on
  // refuse en bloc plutôt que de livrer un chiffre partiel présenté comme
  // complet.
  if (entree.fournitures.some((f) => f.prixAchatCents <= 0)) {
    return { calculable: false, obstacle: "FOURNITURE_SANS_PRIX_ACHAT" };
  }

  const coutFournituresCents = entree.fournitures.reduce(
    (total, f) => total + arrondi((f.quantiteMilli * f.prixAchatCents) / 1000),
    0,
  );
  const coutMainOeuvreCents = arrondi((entree.minutes / 60) * entree.coutHoraireCents);
  const resultatCents = entree.produitCents - coutFournituresCents - coutMainOeuvreCents;

  return {
    calculable: true,
    rentabilite: {
      produitCents: entree.produitCents,
      coutFournituresCents,
      coutMainOeuvreCents,
      resultatCents,
      tauxCentiemes: arrondi((resultatCents / entree.produitCents) * 10000),
    },
  };
}

/** Message affiché à la place d'un chiffre manquant. */
export const EXPLICATION_OBSTACLE: Record<Obstacle, string> = {
  COUT_HORAIRE_INCONNU:
    "Renseignez votre coût horaire dans la fiche entreprise : sans lui, la rentabilité n'aurait aucun sens.",
  FOURNITURE_SANS_PRIX_ACHAT:
    "Une fourniture n'a pas de prix d'achat connu. Saisissez l'achat correspondant pour obtenir un résultat fiable.",
  AUCUN_PRODUIT: "Ce chantier n'a pas encore été facturé.",
};

/* -------------------------------------------------------------------------- */
/* Export comptable                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Échappement CSV.
 *
 * Reprend la convention de l'export CRM (Phase 2) : point-virgule, guillemets
 * doublés, et neutralisation des formules — une cellule commençant par `=`,
 * `+`, `-` ou `@` est interprétée comme une formule par les tableurs, ce qui
 * est un vecteur d'injection connu.
 */
export function celluleCsv(valeur: string): string {
  const neutralise = /^[=+\-@\t\r]/.test(valeur) ? `'${valeur}` : valeur;
  return `"${neutralise.replace(/"/g, '""')}"`;
}

export function ligneCsv(cellules: readonly string[]): string {
  return cellules.map(celluleCsv).join(";");
}

/** Montant en centimes vers une décimale française, pour un tableur. */
export function montantCsv(cents: number): string {
  const signe = cents < 0 ? "-" : "";
  const absolu = Math.abs(cents);
  return `${signe}${Math.floor(absolu / 100)},${String(absolu % 100).padStart(2, "0")}`;
}
