/**
 * Estimation des frais d'acquisition d'un logement neuf au Maroc.
 *
 * Taux indicatifs, à faire confirmer par le notaire : ils dépendent du bien,
 * d'éventuelles exonérations et des honoraires négociés.
 */

export interface TauxFrais {
  /** Droits d'enregistrement (part du prix). */
  enregistrement: number;
  /** Droits de conservation foncière (part du prix). */
  conservation: number;
  /** Montant fixe ajouté par la conservation (certificat, timbres). */
  conservationFixe: number;
  /** Honoraires du notaire (part du prix), avant TVA. */
  notaire: number;
  tvaHonoraires: number;
  /** Débours divers : timbres, copies, légalisations. */
  divers: number;
}

export const TAUX_FRAIS_DEFAUT: TauxFrais = {
  enregistrement: 0.04,
  conservation: 0.015,
  conservationFixe: 200,
  notaire: 0.01,
  tvaHonoraires: 0.1,
  divers: 1500,
};

export interface DetailFrais {
  enregistrement: number;
  conservation: number;
  notaire: number;
  divers: number;
  total: number;
}

const arrondi = (n: number) => Math.round(n / 10) * 10;

export function estimerFrais(prixTtc: number, taux: TauxFrais = TAUX_FRAIS_DEFAUT): DetailFrais {
  const enregistrement = arrondi(prixTtc * taux.enregistrement);
  const conservation = arrondi(prixTtc * taux.conservation + taux.conservationFixe);
  const notaire = arrondi(prixTtc * taux.notaire * (1 + taux.tvaHonoraires));
  const divers = taux.divers;
  return { enregistrement, conservation, notaire, divers, total: enregistrement + conservation + notaire + divers };
}
